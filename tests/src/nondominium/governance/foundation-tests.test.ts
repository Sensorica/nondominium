import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { runScenarioWithTwoAgents } from "../utils.js";

test("Governance Foundation: Zome is accessible and functional", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("Testing governance zome basic functionality");
      
      // Test that the governance zome is accessible by calling get_all_commitments
      const result = await alice.cells[0].callZome({
        zome_name: "zome_gouvernance",
        fn_name: "get_all_commitments",
        payload: null,
      });
      
      console.log("✅ Governance zome is accessible");
      assert.ok(Array.isArray(result), "get_all_commitments returned an array");
      assert.equal(result.length, 0, "Initially no commitments should exist");
      
      console.log("✅ Governance zome basic functionality verified");
    },
    { timeout: 60000 }
  );
});