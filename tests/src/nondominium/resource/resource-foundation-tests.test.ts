import { test } from "vitest";
import {
  runScenario,
  pause,
  dhtSync,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { ActionHash, Record as HolochainRecord } from "@holochain/client";

import {
  sampleResourceSpecification,
  sampleEconomicResource,
  sampleGovernanceRule,
  createResourceSpecification,
  createEconomicResource,
  createGovernanceRule,
  getAllResourceSpecifications,
  getAllEconomicResources,
  getAllGovernanceRules,
  getResourceSpecificationWithRules,
  checkFirstResourceRequirement,
  validateResourceSpecificationData,
  validateEconomicResourceData,
  validateGovernanceRuleData,
  RESOURCE_STATES,
  TEST_CATEGORIES,
  TEST_TAGS,
} from "./common";
import {
  ResourceSpecification,
  EconomicResource,
  GovernanceRule,
  CreateResourceSpecificationOutput,
  CreateEconomicResourceOutput,
} from "@nondominium/shared-types";
const hAppPath = process.cwd() + "/../workdir/nondominium.happ";
const appSource = {
  appBundleSource: {
    type: "path" as const,
    value: hAppPath,
  },
};

test("Resource Specification Foundation: Create and retrieve basic resource specifications", async () => {
  await runScenario(async (scenario) => {
    const [lynn, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    // Pause for DHT network to settle
    await pause(1200);

    // Create resource specifications
    const sampleSpec = sampleResourceSpecification({
      name: "Community Drill",
      category: TEST_CATEGORIES.TOOLS,
      tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY],
    });

    const createResult: CreateResourceSpecificationOutput = await createResourceSpecification(
      lynn.cells[0],
      sampleSpec
    );
    
    console.log(`🔧 Created resource specification: ${createResult.spec_hash}`);

    // Validate the created specification
    const spec: ResourceSpecification = createResult.spec;
    const isValid = validateResourceSpecificationData(sampleSpec, spec);
    
    if (!isValid) {
      throw new Error("Resource specification validation failed");
    }

    // Verify governance rules were created
    if (createResult.governance_rule_hashes.length !== sampleSpec.governance_rules.length) {
      throw new Error(`Expected ${sampleSpec.governance_rules.length} governance rules, got ${createResult.governance_rule_hashes.length}`);
    }

    console.log(`✅ Resource specification created successfully with ${createResult.governance_rule_hashes.length} governance rules`);

    // Test retrieval of all specifications
    await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);
    const allSpecs = await getAllResourceSpecifications(lynn.cells[0]);
    
    if (allSpecs.specifications.length !== 1) {
      throw new Error(`Expected 1 specification, got ${allSpecs.specifications.length}`);
    }

    const retrievedSpec = allSpecs.specifications[0];
    if (!validateResourceSpecificationData(sampleSpec, retrievedSpec)) {
      throw new Error("Retrieved specification does not match original");
    }

    console.log(`✅ Successfully retrieved resource specification: ${retrievedSpec.name}`);

    // Test specification with rules retrieval
    const specWithRules = await getResourceSpecificationWithRules(
      lynn.cells[0],
      createResult.spec_hash
    );

    if (specWithRules.governance_rules.length !== sampleSpec.governance_rules.length) {
      throw new Error(`Expected ${sampleSpec.governance_rules.length} rules, got ${specWithRules.governance_rules.length}`);
    }

    console.log(`✅ Successfully retrieved specification with ${specWithRules.governance_rules.length} governance rules`);
  });
});

test("Economic Resource Foundation: Create and manage economic resources", async () => {
  await runScenario(async (scenario) => {
    const [lynn, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    await pause(1200);

    // First create a resource specification
    const specResult = await createResourceSpecification(
      lynn.cells[0],
      sampleResourceSpecification({
        name: "Workshop Tool",
        category: TEST_CATEGORIES.TOOLS,
      })
    );

    console.log(`🔧 Created resource specification: ${specResult.spec_hash}`);

    // Create economic resource
    const resourceParams = sampleEconomicResource(specResult.spec_hash, {
      quantity: 3.0,
      unit: "pieces",
      current_location: "Main Workshop",
    });

    const resourceResult: CreateEconomicResourceOutput = await createEconomicResource(
      lynn.cells[0],
      resourceParams
    );

    console.log(`💎 Created economic resource: ${resourceResult.resource_hash}`);

    // Validate the created resource
    const resource: EconomicResource = resourceResult.resource;
    const isValid = validateEconomicResourceData(resourceParams, resource);
    
    if (!isValid) {
      throw new Error("Economic resource validation failed");
    }

    // Verify resource state is correct
    if (resource.state !== RESOURCE_STATES.PENDING) {
      throw new Error(`Expected state ${RESOURCE_STATES.PENDING}, got ${resource.state}`);
    }

    // Verify custodian is set correctly
    const lynnAgentKey = lynn.agentPubKey;
    if (resource.custodian.toString() !== lynnAgentKey.toString()) {
      throw new Error("Custodian not set correctly");
    }

    console.log(`✅ Economic resource created successfully in state: ${resource.state}`);

    // Test retrieval of all resources
    await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);
    const allResources = await getAllEconomicResources(lynn.cells[0]);
    
    if (allResources.resources.length !== 1) {
      throw new Error(`Expected 1 resource, got ${allResources.resources.length}`);
    }

    const retrievedResource = allResources.resources[0];
    if (!validateEconomicResourceData(resourceParams, retrievedResource)) {
      throw new Error("Retrieved resource does not match original");
    }

    console.log(`✅ Successfully retrieved economic resource: ${retrievedResource.quantity} ${retrievedResource.unit}`);

    // Test first resource requirement check
    const hasFirstResource = await checkFirstResourceRequirement(
      lynn.cells[0],
      lynnAgentKey
    );

    if (!hasFirstResource) {
      throw new Error("Agent should have first resource requirement fulfilled");
    }

    console.log(`✅ First resource requirement check passed`);
  });
});

test("Governance Rule Foundation: Create and manage governance rules", async () => {
  await runScenario(async (scenario) => {
    const [lynn, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    await pause(1200);

    // Create governance rule
    const ruleParams = sampleGovernanceRule({
      rule_type: "usage_limit",
      rule_data: JSON.stringify({ max_hours_per_day: 4 }),
      enforced_by: "Resource Steward",
    });

    const ruleRecord: HolochainRecord = await createGovernanceRule(
      lynn.cells[0],
      ruleParams
    );

    console.log(`📋 Created governance rule: ${ruleRecord.signed_action.hashed.hash}`);

    // Extract and validate the rule
    const ruleEntry: GovernanceRule = decode((ruleRecord.entry as any).Present.entry) as GovernanceRule;
    const isValid = validateGovernanceRuleData(ruleParams, ruleEntry);
    
    if (!isValid) {
      throw new Error("Governance rule validation failed");
    }

    console.log(`✅ Governance rule created successfully: ${ruleEntry.rule_type}`);

    // Test retrieval of all rules
    await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);
    const allRules = await getAllGovernanceRules(lynn.cells[0]);
    
    if (allRules.rules.length !== 1) {
      throw new Error(`Expected 1 rule, got ${allRules.rules.length}`);
    }

    const retrievedRule = allRules.rules[0];
    if (!validateGovernanceRuleData(ruleParams, retrievedRule)) {
      throw new Error("Retrieved rule does not match original");
    }

    console.log(`✅ Successfully retrieved governance rule: ${retrievedRule.rule_type}`);
  });
});

test("Cross-Agent Visibility: Resources created by one agent are visible to others", async () => {
  await runScenario(async (scenario) => {
    const [lynn, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    await pause(1200);

    // Lynn creates a resource specification
    const lynnSpec = await createResourceSpecification(
      lynn.cells[0],
      sampleResourceSpecification({
        name: "Lynn's Shared Tool",
        category: TEST_CATEGORIES.TOOLS,
        tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY],
      })
    );

    // Bob creates a different specification
    const bobSpec = await createResourceSpecification(
      bob.cells[0],
      sampleResourceSpecification({
        name: "Bob's Equipment",
        category: TEST_CATEGORIES.EQUIPMENT,
        tags: [TEST_TAGS.COMMUNITY, TEST_TAGS.VERIFIED],
      })
    );

    console.log(`🔧 Lynn created: ${lynnSpec.spec_hash}`);
    console.log(`🔧 Bob created: ${bobSpec.spec_hash}`);

    // Wait for DHT propagation
    await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

    // Lynn should see both specifications
    const lynnView = await getAllResourceSpecifications(lynn.cells[0]);
    if (lynnView.specifications.length !== 2) {
      throw new Error(`Lynn should see 2 specifications, saw ${lynnView.specifications.length}`);
    }

    // Bob should also see both specifications
    const bobView = await getAllResourceSpecifications(bob.cells[0]);
    if (bobView.specifications.length !== 2) {
      throw new Error(`Bob should see 2 specifications, saw ${bobView.specifications.length}`);
    }

    console.log(`✅ Cross-agent visibility test passed`);

    // Verify specific specifications are found
    const lynnSpecNames = lynnView.specifications.map(s => s.name);
    const bobSpecNames = bobView.specifications.map(s => s.name);

    if (!lynnSpecNames.includes("Lynn's Shared Tool") || !lynnSpecNames.includes("Bob's Equipment")) {
      throw new Error("Lynn cannot see all expected specifications");
    }

    if (!bobSpecNames.includes("Lynn's Shared Tool") || !bobSpecNames.includes("Bob's Equipment")) {
      throw new Error("Bob cannot see all expected specifications");
    }

    console.log(`✅ Both agents can see all specifications: ${lynnSpecNames.join(", ")}`);
  });
});