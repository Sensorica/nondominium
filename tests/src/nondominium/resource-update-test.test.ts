import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  sampleResourceSpecification,
  sampleEconomicResource,
  createResourceSpecification,
  createEconomicResource,
  updateResourceState,
  getAllEconomicResources,
  RESOURCE_STATES,
  TEST_CATEGORIES,
  TEST_TAGS,
} from "./resource/common";
import { runScenarioWithTwoAgents } from "./utils.ts";

test("basic resource state update", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("=== Starting Basic Resource State Update Test ===");

      // Step 1: Alice creates a resource specification
      console.log("Step 1: Alice creates resource specification");
      const toolSpec = await createResourceSpecification(
        alice.cells[0],
        sampleResourceSpecification({
          name: "Test Tool",
          description: "A simple test tool",
          category: TEST_CATEGORIES.TOOLS,
          tags: [TEST_TAGS.SHARED],
          governance_rules: [], // No governance rules to keep it simple
        })
      );

      console.log(`✅ Created resource specification: ${toolSpec.spec_hash}`);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Step 2: Alice creates an economic resource
      console.log("Step 2: Alice creates economic resource");
      const testResource = await createEconomicResource(
        alice.cells[0],
        sampleEconomicResource(toolSpec.spec_hash, {
          quantity: 1.0,
          unit: "tool",
          current_location: "Workshop",
        })
      );

      console.log(`✅ Created economic resource: ${testResource.resource_hash}`);
      console.log(`Initial state: ${testResource.resource.state}`);
      
      // Verify initial state is PendingValidation
      assert.equal(testResource.resource.state, RESOURCE_STATES.PENDING);
      assert.equal(testResource.resource.custodian.toString(), alice.agentPubKey.toString());

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Step 3: Alice activates the resource
      console.log("Step 3: Alice activates the resource");
      const activationResult = await updateResourceState(
        alice.cells[0],
        {
          resource_hash: testResource.resource_hash,
          new_state: RESOURCE_STATES.ACTIVE,
        }
      );

      console.log(`✅ Resource activation call completed`);
      assert.ok(activationResult);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Step 4: Verify the state was updated
      console.log("Step 4: Verify resource state was updated");
      const allResources = await getAllEconomicResources(alice.cells[0]);
      console.log(`Found ${allResources.resources.length} resources`);
      
      const updatedResource = allResources.resources.find(
        r => r.created_by.toString() === alice.agentPubKey.toString()
      );

      assert.ok(updatedResource, "Resource should be found");
      console.log(`Current state: ${updatedResource!.state}`);
      console.log(`Expected state: ${RESOURCE_STATES.ACTIVE}`);
      
      assert.equal(updatedResource!.state, RESOURCE_STATES.ACTIVE);

      console.log("✅ Basic resource state update test successful");
    }
  );
}, 120000); // 2 minutes timeout