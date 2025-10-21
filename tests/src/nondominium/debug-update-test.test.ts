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

test("debug update chain", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("=== Starting Update Chain Debug Test ===");

      // Step 1: Lynn creates a resource specification
      console.log("Step 1: Lynn creates resource specification");
      const toolSpec = await createResourceSpecification(
        lynn.cells[0],
        sampleResourceSpecification({
          name: "Test Tool",
          description: "A simple test tool",
          category: TEST_CATEGORIES.TOOLS,
          tags: [TEST_TAGS.SHARED],
          governance_rules: [], // No governance rules to keep it simple
        })
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 2: Lynn creates an economic resource
      console.log("Step 2: Lynn creates economic resource");
      const testResource = await createEconomicResource(
        lynn.cells[0],
        sampleEconomicResource(toolSpec.spec_hash, {
          quantity: 1.0,
          unit: "tool",
          current_location: "Workshop",
        })
      );

      console.log(`Created resource hash: ${testResource.resource_hash}`);
      console.log(`Initial state: ${testResource.resource.state}`);
      
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 3: Call get_latest_economic_resource directly
      console.log("Step 3: Test get_latest_economic_resource function directly");
      try {
        const latestResource = await lynn.cells[0].callZome({
          zome_name: "zome_resource",
          fn_name: "get_latest_economic_resource",
          payload: testResource.resource_hash,
        });
        console.log(`Latest resource state (direct call): ${latestResource.state}`);
      } catch (error) {
        console.log(`ERROR calling get_latest_economic_resource: ${error}`);
      }

      // Step 4: Update the resource state
      console.log("Step 4: Update resource state");
      const activationResult = await updateResourceState(
        lynn.cells[0],
        {
          resource_hash: testResource.resource_hash,
          new_state: RESOURCE_STATES.ACTIVE,
        }
      );

      console.log(`Activation result:`, JSON.stringify(activationResult, null, 2));
      
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 5: Call get_latest_economic_resource again after update
      console.log("Step 5: Test get_latest_economic_resource after update");
      try {
        const latestResourceAfterUpdate = await lynn.cells[0].callZome({
          zome_name: "zome_resource",
          fn_name: "get_latest_economic_resource",
          payload: testResource.resource_hash,
        });
        console.log(`Latest resource state after update (direct call): ${latestResourceAfterUpdate.state}`);
      } catch (error) {
        console.log(`ERROR calling get_latest_economic_resource after update: ${error}`);
      }

      // Step 6: Check what get_all_economic_resources returns
      console.log("Step 6: Check what get_all_economic_resources returns");
      const allResources = await getAllEconomicResources(lynn.cells[0]);
      console.log(`Found ${allResources.resources.length} resources total`);
      
      if (allResources.resources.length > 0) {
        const resource = allResources.resources[0];
        console.log(`Resource state from get_all: ${resource.state}`);
        console.log(`Resource custodian: ${resource.custodian}`);
        console.log(`Resource created_by: ${resource.created_by}`);
      }

      // For now, let's not assert anything and just see what we get
      console.log("✅ Debug test completed - check logs above for details");
    }
  );
}, 120000); // 2 minutes timeout