import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  sampleResourceSpecification,
  sampleEconomicResource,
  createResourceSpecification,
  createEconomicResource,
  updateResourceState,
  RESOURCE_STATES,
  TEST_CATEGORIES,
  TEST_TAGS,
} from "./resource/common";
import { runScenarioWithTwoAgents } from "./utils.ts";

test("debug update links", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("=== Starting Update Links Debug Test ===");

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

      console.log(`Created resource hash: ${testResource.resource_hash}`);
      
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Step 3: Check latest record BEFORE update
      console.log("Step 3: Check latest record BEFORE update");
      try {
        const latestBefore = await alice.cells[0].callZome({
          zome_name: "zome_resource",
          fn_name: "get_latest_economic_resource_record",
          payload: testResource.resource_hash,
        });
        console.log(`Latest record before update: exists=${!!latestBefore}`);
        if (latestBefore) {
          console.log(`Before update action hash: ${latestBefore.signed_action.hashed.hash}`);
        }
      } catch (error) {
        console.log(`ERROR getting latest record before update: ${error}`);
      }

      // Step 4: Update the resource state
      console.log("Step 4: Update resource state");
      const activationResult = await updateResourceState(
        alice.cells[0],
        {
          resource_hash: testResource.resource_hash,
          new_state: RESOURCE_STATES.ACTIVE,
        }
      );

      console.log(`Update succeeded, new action hash: ${activationResult.signed_action.hashed.hash}`);
      
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Step 5: Check latest record AFTER update
      console.log("Step 5: Check latest record AFTER update");
      try {
        const latestAfter = await alice.cells[0].callZome({
          zome_name: "zome_resource",
          fn_name: "get_latest_economic_resource_record",
          payload: testResource.resource_hash,
        });
        console.log(`Latest record after update: exists=${!!latestAfter}`);
        if (latestAfter) {
          console.log(`After update action hash: ${latestAfter.signed_action.hashed.hash}`);
          console.log(`Update result action hash: ${activationResult.signed_action.hashed.hash}`);
          
          const hashes_match = latestAfter.signed_action.hashed.hash.toString() === 
                              activationResult.signed_action.hashed.hash.toString();
          console.log(`Action hashes match: ${hashes_match}`);
          
          // Get the resource data
          try {
            const resourceData = await alice.cells[0].callZome({
              zome_name: "zome_resource",
              fn_name: "get_latest_economic_resource",
              payload: testResource.resource_hash,
            });
            console.log(`Latest resource state: ${resourceData.state}`);
          } catch (error) {
            console.log(`ERROR getting latest resource data: ${error}`);
          }
        }
      } catch (error) {
        console.log(`ERROR getting latest record after update: ${error}`);
      }

      console.log("✅ Debug links test completed - check logs above for details");
    }
  );
}, 120000); // 2 minutes timeout