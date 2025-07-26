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
} from "../../../types";
import { runScenarioWithTwoAgents } from "../utils.js";

test(
  "multi-agent resource specification discovery and interaction",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicResources(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents can discover each other's resource specifications
        const allSpecsFromAlice = await getAllResourceSpecifications(alice.cells[0]);
        const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);

        assert.equal(allSpecsFromAlice.specifications.length, 2);
        assert.equal(allSpecsFromBob.specifications.length, 2);

        // Verify both can see each other's specifications
        const specNames = allSpecsFromAlice.specifications.map(s => s.name).sort();
        assert.deepEqual(specNames, ["Alice's Tool", "Bob's Equipment"]);

        const bobViewNames = allSpecsFromBob.specifications.map(s => s.name).sort();
        assert.deepEqual(bobViewNames, ["Alice's Tool", "Bob's Equipment"]);

        // Verify specifications with governance rules
        const aliceSpecWithRules = await getResourceSpecificationWithRules(
          alice.cells[0],
          context.aliceSpecHash!
        );
        const bobSpecWithRules = await getResourceSpecificationWithRules(
          bob.cells[0],
          context.bobSpecHash!
        );

        assert.ok(aliceSpecWithRules.specification);
        assert.equal(aliceSpecWithRules.governance_rules.length, 1); // Single governance rule from basic setup
        
        assert.ok(bobSpecWithRules.specification);
        assert.equal(bobSpecWithRules.governance_rules.length, 1);
      }
    );
  },
  240000
);

test(
  "cross-agent economic resource creation and discovery",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicResources(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice creates economic resource from Bob's specification
        const crossSpecResource = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(context.bobSpecHash, {
            quantity: 2.0,
            unit: "units",
            current_location: "Alice's Workshop",
          })
        );

        // Bob creates economic resource from Alice's specification
        const crossSpecResource2 = await createEconomicResource(
          bob.cells[0],
          sampleEconomicResource(context.aliceSpecHash, {
            quantity: 1.5,
            unit: "items",
            current_location: "Bob's Facility",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify all agents can see all resources
        const allResourcesFromAlice = await getAllEconomicResources(alice.cells[0]);
        const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

        // Should have 4 resources total (2 from setup + 2 cross-spec)
        assert.equal(allResourcesFromAlice.resources.length, 4);
        assert.equal(allResourcesFromBob.resources.length, 4);

        // Verify custodianship links work across agents
        const aliceResources = await getMyEconomicResources(alice.cells[0]);
        const bobResources = await getMyEconomicResources(bob.cells[0]);

        // Alice should have 2 resources (1 from setup + 1 cross-spec)
        assert.equal(aliceResources.length, 2);
        // Bob should have 2 resources (1 from setup + 1 cross-spec)
        assert.equal(bobResources.length, 2);

        // Test cross-agent custodian queries
        const aliceResourcesFromBob = await getAgentEconomicResources(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobResourcesFromAlice = await getAgentEconomicResources(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceResourcesFromBob.length, 2);
        assert.equal(bobResourcesFromAlice.length, 2);
      }
    );
  },
  240000
);

test(
  "resource custody transfer between agents",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicResources(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice transfers custody of her resource to Bob
        const transferResult = await transferCustody(
          alice.cells[0],
          {
            resource_hash: context.aliceResourceHash!,
            new_custodian: bob.agentPubKey,
          }
        );

        assert.ok(transferResult.updated_resource_hash);
        assert.equal(transferResult.updated_resource.custodian.toString(), bob.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify custody links have been updated
        const aliceResourcesAfter = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfter = await getMyEconomicResources(bob.cells[0]);

        // Alice should now have 0 resources
        assert.equal(aliceResourcesAfter.length, 0);
        // Bob should now have 2 resources (his original + transferred from Alice)
        assert.equal(bobResourcesAfter.length, 2);

        // Verify cross-agent queries reflect the transfer
        const aliceResourcesFromBobView = await getAgentEconomicResources(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobResourcesFromAliceView = await getAgentEconomicResources(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceResourcesFromBobView.length, 0);
        assert.equal(bobResourcesFromAliceView.length, 2);

        // Bob should now be able to transfer the resource back
        const transferBack = await transferCustody(
          bob.cells[0],
          {
            resource_hash: transferResult.updated_resource_hash,
            new_custodian: alice.agentPubKey,
          }
        );

        assert.ok(transferBack.updated_resource_hash);
        assert.equal(transferBack.updated_resource.custodian.toString(), alice.agentPubKey.toString());
      }
    );
  },
  240000
);

test(
  "governance rule consistency across agents",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupResourcesWithGovernance(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents can see all governance rules
        const rulesFromAlice = await getAllGovernanceRules(alice.cells[0]);
        const rulesFromBob = await getAllGovernanceRules(bob.cells[0]);

        // Should have rules from both setups
        assert.isAtLeast(rulesFromAlice.rules.length, 5);
        assert.isAtLeast(rulesFromBob.rules.length, 5);
        assert.equal(rulesFromAlice.rules.length, rulesFromBob.rules.length);

        // Test cross-agent rule validation
        const ruleTypes = rulesFromAlice.rules.map(r => r.rule_type);
        assert.includes(ruleTypes, "usage_limit");
        assert.includes(ruleTypes, "access_control");
        assert.includes(ruleTypes, "maintenance_schedule");

        // Verify governance rules are properly linked to specifications
        const aliceSpecWithRules = await getResourceSpecificationWithRules(
          bob.cells[0], // Bob querying Alice's spec
          context.aliceSpecHash!
        );
        const bobSpecWithRules = await getResourceSpecificationWithRules(
          alice.cells[0], // Alice querying Bob's spec
          context.bobSpecHash!
        );

        assert.ok(aliceSpecWithRules.specification);
        assert.equal(aliceSpecWithRules.governance_rules.length, 2);

        assert.ok(bobSpecWithRules.specification);
        assert.equal(bobSpecWithRules.governance_rules.length, 1);
      }
    );
  },
  240000
);

test(
  "resource state management across agents",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicResources(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice updates her resource state
        const stateUpdateResult = await updateResourceState(
          alice.cells[0],
          {
            resource_hash: context.aliceResourceHash!,
            new_state: RESOURCE_STATES.ACTIVE,
          }
        );

        assert.ok(stateUpdateResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents should see the updated state
        const allResourcesFromAlice = await getAllEconomicResources(alice.cells[0]);
        const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

        // Find Alice's resource in both views
        const aliceResourceFromAliceView = allResourcesFromAlice.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );
        const aliceResourceFromBobView = allResourcesFromBob.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(aliceResourceFromAliceView);
        assert.ok(aliceResourceFromBobView);
        assert.equal(aliceResourceFromAliceView!.state, RESOURCE_STATES.ACTIVE);
        assert.equal(aliceResourceFromBobView!.state, RESOURCE_STATES.ACTIVE);

        // Test state transition to maintenance
        await updateResourceState(
          alice.cells[0],
          {
            resource_hash: context.aliceResourceHash!,
            new_state: RESOURCE_STATES.MAINTENANCE,
          }
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify the state change is visible to both agents
        const updatedResourcesFromBob = await getAllEconomicResources(bob.cells[0]);
        const updatedAliceResource = updatedResourcesFromBob.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(updatedAliceResource);
        assert.equal(updatedAliceResource!.state, RESOURCE_STATES.MAINTENANCE);
      }
    );
  },
  240000
);

test(
  "specification-to-resource relationships",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicResources(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Create additional resources from the same specifications
        const aliceResource2 = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(context.aliceSpecHash!, {
            quantity: 5.0,
            unit: "pieces",
            current_location: "Storage A",
          })
        );

        const bobResource2 = await createEconomicResource(
          bob.cells[0],
          sampleEconomicResource(context.aliceSpecHash!, {
            quantity: 3.0,
            unit: "pieces",
            current_location: "Storage B",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Test cross-agent queries for resources by specification
        const aliceSpecResourcesFromAlice = await getResourcesBySpecification(
          alice.cells[0],
          context.aliceSpecHash!
        );
        const aliceSpecResourcesFromBob = await getResourcesBySpecification(
          bob.cells[0],
          context.aliceSpecHash!
        );

        // Should have 3 resources conforming to Alice's spec (1 from setup + 2 new)
        assert.equal(aliceSpecResourcesFromAlice.length, 3);
        assert.equal(aliceSpecResourcesFromBob.length, 3);

        // Verify resource custodianship distribution
        const custodians = aliceSpecResourcesFromAlice.map(record => {
          const decoded = record.entry as any;
          return decoded.Present ? 
            (decoded.Present.entry[4] as Uint8Array) : // custodian field
            null;
        }).filter(Boolean);

        // Should have resources from both Alice and Bob
        assert.equal(custodians.length, 3);

        // Test Bob's specification resources
        const bobSpecResourcesFromAlice = await getResourcesBySpecification(
          alice.cells[0],
          context.bobSpecHash!
        );
        const bobSpecResourcesFromBob = await getResourcesBySpecification(
          bob.cells[0],
          context.bobSpecHash!
        );

        // Should have 1 resource conforming to Bob's spec (from setup)
        assert.equal(bobSpecResourcesFromAlice.length, 1);
        assert.equal(bobSpecResourcesFromBob.length, 1);
      }
    );
  },
  240000
);

test(
  "first resource requirement validation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Initially, no agents have resources
        const aliceInitialCheck = await checkFirstResourceRequirement(
          alice.cells[0],
          alice.agentPubKey
        );
        const bobInitialCheck = await checkFirstResourceRequirement(
          bob.cells[0],
          bob.agentPubKey
        );

        assert.isFalse(aliceInitialCheck);
        assert.isFalse(bobInitialCheck);

        // Alice creates first resource
        const aliceSpec = await createResourceSpecification(
          alice.cells[0],
          sampleResourceSpecification({
            name: "Alice's First Resource Spec",
            category: TEST_CATEGORIES.TOOLS,
          })
        );

        const aliceResource = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(aliceSpec.spec_hash, {
            quantity: 1.0,
            unit: "item",
            current_location: "Alice's Place",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice should now pass the first resource requirement
        const aliceAfterCheck = await checkFirstResourceRequirement(
          alice.cells[0],
          alice.agentPubKey
        );
        const aliceFromBobCheck = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );

        assert.isTrue(aliceAfterCheck);
        assert.isTrue(aliceFromBobCheck);

        // Bob still shouldn't pass
        const bobStillCheck = await checkFirstResourceRequirement(
          alice.cells[0],
          bob.agentPubKey
        );
        assert.isFalse(bobStillCheck);

        // Bob creates his first resource
        const bobSpec = await createResourceSpecification(
          bob.cells[0],
          sampleResourceSpecification({
            name: "Bob's First Resource Spec",
            category: TEST_CATEGORIES.EQUIPMENT,
          })
        );

        const bobResource = await createEconomicResource(
          bob.cells[0],
          sampleEconomicResource(bobSpec.spec_hash, {
            quantity: 2.0,
            unit: "units",
            current_location: "Bob's Place",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now both should pass
        const finalAliceCheck = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );
        const finalBobCheck = await checkFirstResourceRequirement(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.isTrue(finalAliceCheck);
        assert.isTrue(finalBobCheck);
      }
    );
  },
  240000
);

test(
  "DHT synchronization and eventual consistency for resources",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Alice creates resource specification
        const aliceSpec = await createResourceSpecification(
          alice.cells[0],
          sampleResourceSpecification({
            name: "Sync Test Tool",
            category: TEST_CATEGORIES.TOOLS,
          })
        );

        // Bob creates resource specification
        const bobSpec = await createResourceSpecification(
          bob.cells[0],
          sampleResourceSpecification({
            name: "Sync Test Equipment",
            category: TEST_CATEGORIES.EQUIPMENT,
          })
        );

        // Before DHT sync, agents might not see each other's specs
        let allSpecsFromAlice = await getAllResourceSpecifications(alice.cells[0]);
        assert.isAtLeast(allSpecsFromAlice.specifications.length, 1);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // After DHT sync, both should see each other's specs
        allSpecsFromAlice = await getAllResourceSpecifications(alice.cells[0]);
        const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);

        assert.equal(allSpecsFromAlice.specifications.length, 2);
        assert.equal(allSpecsFromBob.specifications.length, 2);

        // Alice creates economic resource
        const aliceResource = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(aliceSpec.spec_hash, {
            quantity: 1.0,
            unit: "tool",
            current_location: "Workshop",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents should see the resource
        const allResourcesFromAlice = await getAllEconomicResources(alice.cells[0]);
        const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

        assert.equal(allResourcesFromAlice.resources.length, 1);
        assert.equal(allResourcesFromBob.resources.length, 1);

        // Test custody transfer synchronization
        const transferResult = await transferCustody(
          alice.cells[0],
          {
            resource_hash: aliceResource.resource_hash,
            new_custodian: bob.agentPubKey,
          }
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents should see the updated custody
        const aliceResourcesAfter = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfter = await getMyEconomicResources(bob.cells[0]);

        assert.equal(aliceResourcesAfter.length, 0);
        assert.equal(bobResourcesAfter.length, 1);
      }
    );
  },
  240000
);