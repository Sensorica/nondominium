import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

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
  transferCustody,
  updateResourceState,
  getResourcesBySpecification,
  getMyEconomicResources,
  getAgentEconomicResources,
  validateResourceSpecificationData,
  validateEconomicResourceData,
  validateGovernanceRuleData,
  RESOURCE_STATES,
  TEST_CATEGORIES,
  TEST_TAGS,
  ResourceTestContext,
  setupBasicResources,
  setupResourcesWithGovernance,
} from "./common";
import {
  ResourceSpecification,
  EconomicResource,
  GovernanceRule,
  CreateResourceSpecificationOutput,
  CreateEconomicResourceOutput,
} from "@nondominium/shared-types";
import { runScenarioWithTwoAgents } from "../utils.js";

test("multi-agent resource specification discovery and interaction", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicResources(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both agents can discover each other's resource specifications
      const allSpecsFromLynn = await getAllResourceSpecifications(
        lynn.cells[0],
      );
      const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);

      assert.equal(allSpecsFromLynn.specifications.length, 2);
      assert.equal(allSpecsFromBob.specifications.length, 2);

      // Verify both can see each other's specifications
      const specNames = allSpecsFromLynn.specifications
        .map((s: any) => s.name)
        .sort();
      assert.deepEqual(specNames, ["Bob's Equipment", "Lynn's Tool"]);

      const bobViewNames = allSpecsFromBob.specifications
        .map((s: any) => s.name)
        .sort();
      assert.deepEqual(bobViewNames, ["Bob's Equipment", "Lynn's Tool"]);

      // Verify specifications with governance rules
      const lynnSpecWithRules = await getResourceSpecificationWithRules(
        lynn.cells[0],
        context.lynnSpecHash!,
      );
      const bobSpecWithRules = await getResourceSpecificationWithRules(
        bob.cells[0],
        context.bobSpecHash!,
      );

      assert.ok(lynnSpecWithRules.specification);
      assert.equal(lynnSpecWithRules.governance_rules.length, 1); // Single governance rule from basic setup

      assert.ok(bobSpecWithRules.specification);
      assert.equal(bobSpecWithRules.governance_rules.length, 1);
    },
  );
}, 240000);

test("cross-agent economic resource creation and discovery", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicResources(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn creates economic resource from Bob's specification
      const crossSpecResource = await createEconomicResource(
        lynn.cells[0],
        sampleEconomicResource(context.bobSpecHash!, {
          quantity: 2.0,
          unit: "units",
          current_location: "Lynn's Workshop",
        }),
      );

      // Bob creates economic resource from Lynn's specification
      const crossSpecResource2 = await createEconomicResource(
        bob.cells[0],
        sampleEconomicResource(context.lynnSpecHash!, {
          quantity: 1.5,
          unit: "items",
          current_location: "Bob's Facility",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify all agents can see all resources
      const allResourcesFromLynn = await getAllEconomicResources(lynn.cells[0]);
      const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

      // Should have 4 resources total (2 from setup + 2 cross-spec)
      assert.equal(allResourcesFromLynn.resources.length, 4);
      assert.equal(allResourcesFromBob.resources.length, 4);

      // Verify custodianship links work across agents
      const lynnResources = await getMyEconomicResources(lynn.cells[0]);
      const bobResources = await getMyEconomicResources(bob.cells[0]);

      // Lynn should have 2 resources (1 from setup + 1 cross-spec)
      assert.equal(lynnResources.length, 2);
      // Bob should have 2 resources (1 from setup + 1 cross-spec)
      assert.equal(bobResources.length, 2);

      // Test cross-agent custodian queries
      const lynnResourcesFromBob = await getAgentEconomicResources(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobResourcesFromLynn = await getAgentEconomicResources(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnResourcesFromBob.length, 2);
      assert.equal(bobResourcesFromLynn.length, 2);
    },
  );
}, 240000);

test("resource custody transfer between agents", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicResources(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn transfers custody of her resource to Bob
      const transferResult = await transferCustody(lynn.cells[0], {
        resource_hash: context.lynnResourceHash!,
        new_custodian: bob.agentPubKey,
      });

      assert.ok(transferResult.updated_resource_hash);
      assert.equal(
        transferResult.updated_resource.custodian.toString(),
        bob.agentPubKey.toString(),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify custody links have been updated
      const lynnResourcesAfter = await getMyEconomicResources(lynn.cells[0]);
      const bobResourcesAfter = await getMyEconomicResources(bob.cells[0]);

      // Lynn should now have 0 resources
      assert.equal(lynnResourcesAfter.length, 0);
      // Bob should now have 2 resources (his original + transferred from Lynn)
      assert.equal(bobResourcesAfter.length, 2);

      // Verify cross-agent queries reflect the transfer
      const lynnResourcesFromBobView = await getAgentEconomicResources(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobResourcesFromLynnView = await getAgentEconomicResources(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnResourcesFromBobView.length, 0);
      assert.equal(bobResourcesFromLynnView.length, 2);

      // Bob should now be able to transfer the resource back
      const transferBack = await transferCustody(bob.cells[0], {
        resource_hash: transferResult.updated_resource_hash,
        new_custodian: lynn.agentPubKey,
      });

      assert.ok(transferBack.updated_resource_hash);
      assert.equal(
        transferBack.updated_resource.custodian.toString(),
        lynn.agentPubKey.toString(),
      );
    },
  );
}, 240000);

test("governance rule consistency across agents", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupResourcesWithGovernance(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both agents can see all governance rules
      const rulesFromLynn = await getAllGovernanceRules(lynn.cells[0]);
      const rulesFromBob = await getAllGovernanceRules(bob.cells[0]);

      // Should have rules from both setups (2 from Lynn's spec + 1 from Bob's spec + 1 standalone = 4 total)
      assert.equal(rulesFromLynn.rules.length, 4);
      assert.equal(rulesFromBob.rules.length, 4);

      // Test cross-agent rule validation
      const ruleTypes = rulesFromLynn.rules.map((r: any) => r.rule_type);
      assert.include(ruleTypes, "usage_limit");
      assert.include(ruleTypes, "access_control");
      assert.include(ruleTypes, "maintenance_schedule");

      // Verify governance rules are properly linked to specifications
      const lynnSpecWithRules = await getResourceSpecificationWithRules(
        bob.cells[0], // Bob querying Lynn's spec
        context.lynnSpecHash!,
      );
      const bobSpecWithRules = await getResourceSpecificationWithRules(
        lynn.cells[0], // Lynn querying Bob's spec
        context.bobSpecHash!,
      );

      assert.ok(lynnSpecWithRules.specification);
      assert.equal(lynnSpecWithRules.governance_rules.length, 2);

      assert.ok(bobSpecWithRules.specification);
      assert.equal(bobSpecWithRules.governance_rules.length, 1);
    },
  );
}, 240000);

test("resource state management across agents", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicResources(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn updates her resource state
      const stateUpdateResult = await updateResourceState(lynn.cells[0], {
        resource_hash: context.lynnResourceHash!,
        new_state: RESOURCE_STATES.ACTIVE,
      });

      assert.ok(stateUpdateResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both agents should see the updated state
      const allResourcesFromLynn = await getAllEconomicResources(lynn.cells[0]);
      const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

      // Find Lynn's resource by state (newly created resources are in PendingValidation)
      // or use index since tests create predictable resource order
      const lynnResourceFromLynnView = allResourcesFromLynn.resources.find(
        (r: any) => r.state === RESOURCE_STATES.ACTIVE,
      );
      const lynnResourceFromBobView = allResourcesFromBob.resources.find(
        (r: any) => r.state === RESOURCE_STATES.ACTIVE,
      );

      assert.ok(lynnResourceFromLynnView);
      assert.ok(lynnResourceFromBobView);
      assert.equal(lynnResourceFromLynnView!.state, RESOURCE_STATES.ACTIVE);
      assert.equal(lynnResourceFromBobView!.state, RESOURCE_STATES.ACTIVE);

      // Test state transition to maintenance
      await updateResourceState(lynn.cells[0], {
        resource_hash: context.lynnResourceHash!,
        new_state: RESOURCE_STATES.MAINTENANCE,
      });

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify the state change is visible to both agents
      const updatedResourcesFromBob = await getAllEconomicResources(
        bob.cells[0],
      );
      const updatedLynnResource = updatedResourcesFromBob.resources.find(
        (r: any) => r.state === RESOURCE_STATES.MAINTENANCE,
      );

      assert.ok(updatedLynnResource);
      assert.equal(updatedLynnResource!.state, RESOURCE_STATES.MAINTENANCE);
    },
  );
}, 240000);

test("specification-to-resource relationships", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicResources(lynn, bob);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Create additional resources from the same specifications
      const lynnResource2 = await createEconomicResource(
        lynn.cells[0],
        sampleEconomicResource(context.lynnSpecHash!, {
          quantity: 5.0,
          unit: "pieces",
          current_location: "Storage A",
        }),
      );

      const bobResource2 = await createEconomicResource(
        bob.cells[0],
        sampleEconomicResource(context.lynnSpecHash!, {
          quantity: 3.0,
          unit: "pieces",
          current_location: "Storage B",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Test cross-agent queries for resources by specification
      const lynnSpecResourcesFromLynn = await getResourcesBySpecification(
        lynn.cells[0],
        context.lynnSpecHash!,
      );
      const lynnSpecResourcesFromBob = await getResourcesBySpecification(
        bob.cells[0],
        context.lynnSpecHash!,
      );

      // Should have 3 resources conforming to Lynn's spec (1 from setup + 2 new)
      assert.equal(lynnSpecResourcesFromLynn.length, 3);
      assert.equal(lynnSpecResourcesFromBob.length, 3);

      // Verify resource custodianship distribution
      const custodians = lynnSpecResourcesFromLynn
        .map((record: any) => {
          const decoded = record.entry as any;
          return decoded.Present
            ? (decoded.Present.entry[4] as Uint8Array) // custodian field
            : null;
        })
        .filter(Boolean);

      // Should have resources from both Lynn and Bob
      assert.equal(custodians.length, 3);

      // Test Bob's specification resources
      const bobSpecResourcesFromLynn = await getResourcesBySpecification(
        lynn.cells[0],
        context.bobSpecHash!,
      );
      const bobSpecResourcesFromBob = await getResourcesBySpecification(
        bob.cells[0],
        context.bobSpecHash!,
      );

      // Should have 1 resource conforming to Bob's spec (from setup)
      assert.equal(bobSpecResourcesFromLynn.length, 1);
      assert.equal(bobSpecResourcesFromBob.length, 1);
    },
  );
}, 240000);

test("first resource requirement validation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Initially, no agents have resources
      const lynnInitialCheck = await checkFirstResourceRequirement(
        lynn.cells[0],
        lynn.agentPubKey,
      );
      const bobInitialCheck = await checkFirstResourceRequirement(
        bob.cells[0],
        bob.agentPubKey,
      );

      assert.isFalse(lynnInitialCheck);
      assert.isFalse(bobInitialCheck);

      // Lynn creates first resource
      const lynnSpec = await createResourceSpecification(
        lynn.cells[0],
        sampleResourceSpecification({
          name: "Lynn's First Resource Spec",
          category: TEST_CATEGORIES.TOOLS,
        }),
      );

      const lynnResource = await createEconomicResource(
        lynn.cells[0],
        sampleEconomicResource(lynnSpec.spec_hash, {
          quantity: 1.0,
          unit: "item",
          current_location: "Lynn's Place",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn should now pass the first resource requirement
      const lynnAfterCheck = await checkFirstResourceRequirement(
        lynn.cells[0],
        lynn.agentPubKey,
      );
      const lynnFromBobCheck = await checkFirstResourceRequirement(
        bob.cells[0],
        lynn.agentPubKey,
      );

      assert.isTrue(lynnAfterCheck);
      assert.isTrue(lynnFromBobCheck);

      // Bob still shouldn't pass
      const bobStillCheck = await checkFirstResourceRequirement(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.isFalse(bobStillCheck);

      // Bob creates his first resource
      const bobSpec = await createResourceSpecification(
        bob.cells[0],
        sampleResourceSpecification({
          name: "Bob's First Resource Spec",
          category: TEST_CATEGORIES.EQUIPMENT,
        }),
      );

      const bobResource = await createEconomicResource(
        bob.cells[0],
        sampleEconomicResource(bobSpec.spec_hash, {
          quantity: 2.0,
          unit: "units",
          current_location: "Bob's Place",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now both should pass
      const finalLynnCheck = await checkFirstResourceRequirement(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const finalBobCheck = await checkFirstResourceRequirement(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.isTrue(finalLynnCheck);
      assert.isTrue(finalBobCheck);
    },
  );
}, 240000);

test("DHT synchronization and eventual consistency for resources", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates resource specification
      const lynnSpec = await createResourceSpecification(
        lynn.cells[0],
        sampleResourceSpecification({
          name: "Sync Test Tool",
          category: TEST_CATEGORIES.TOOLS,
        }),
      );

      // Bob creates resource specification
      const bobSpec = await createResourceSpecification(
        bob.cells[0],
        sampleResourceSpecification({
          name: "Sync Test Equipment",
          category: TEST_CATEGORIES.EQUIPMENT,
        }),
      );

      // Before DHT sync, agents might not see each other's specs
      let allSpecsFromLynn = await getAllResourceSpecifications(lynn.cells[0]);
      assert.isAtLeast(allSpecsFromLynn.specifications.length, 1);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // After DHT sync, both should see each other's specs
      allSpecsFromLynn = await getAllResourceSpecifications(lynn.cells[0]);
      const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);

      assert.equal(allSpecsFromLynn.specifications.length, 2);
      assert.equal(allSpecsFromBob.specifications.length, 2);

      // Lynn creates economic resource
      const lynnResource = await createEconomicResource(
        lynn.cells[0],
        sampleEconomicResource(lynnSpec.spec_hash, {
          quantity: 1.0,
          unit: "tool",
          current_location: "Workshop",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both agents should see the resource
      const allResourcesFromLynn = await getAllEconomicResources(lynn.cells[0]);
      const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

      assert.equal(allResourcesFromLynn.resources.length, 1);
      assert.equal(allResourcesFromBob.resources.length, 1);

      // Test custody transfer synchronization
      const transferResult = await transferCustody(lynn.cells[0], {
        resource_hash: lynnResource.resource_hash,
        new_custodian: bob.agentPubKey,
      });

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both agents should see the updated custody
      const lynnResourcesAfter = await getMyEconomicResources(lynn.cells[0]);
      const bobResourcesAfter = await getMyEconomicResources(bob.cells[0]);

      assert.equal(lynnResourcesAfter.length, 0);
      assert.equal(bobResourcesAfter.length, 1);
    },
  );
}, 240000);
