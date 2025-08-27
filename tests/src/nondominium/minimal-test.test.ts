import { test, assert } from "vitest";
import { runScenario } from "@holochain/tryorama";

const hAppPath = process.cwd() + "/../workdir/nondominium.happ";
const appSource = {
  appBundleSource: {
    type: "path" as const,
    value: hAppPath,
  },
};

test("minimal connection test", async () => {
  await runScenario(async (scenario) => {
    // Just try to create one agent and call agent_info
    const [alice] = await scenario.addPlayersWithApps([appSource]);
    
    console.log("✅ Alice agent created successfully");
    console.log("Alice agent pubkey:", alice.agentPubKey);
    
    // Try a simple get_all_persons call
    const allPersons = await alice.cells[0].callZome({
      zome_name: "zome_person", 
      fn_name: "get_all_persons",
      payload: null,
    });
    
    assert.ok(allPersons);
    console.log("✅ Get all persons call successful");
    
    scenario.cleanUp();
  });
}, 60000); // 1 minute timeout