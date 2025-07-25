import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  samplePerson,
  createPerson,
  getMyProfile,
  getAllAgents,
  validatePersonData,
} from "./common.js";
import {
  runScenarioWithTwoAgents,
} from "../utils.js";

test(
  "basic person creation and setup",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Lynn creates a person
        const personInput = samplePerson({ name: "Lynn" });
        const result = await createPerson(alice.cells[0], personInput);
        
        // Basic assertions
        assert.ok(result);
        assert.ok(result.person_hash);
        assert.ok(result.person);
        assert.isTrue(validatePersonData(personInput, result.person));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn can get her own profile
        const aliceProfile = await getMyProfile(alice.cells[0]);
        assert.ok(aliceProfile.person);
        assert.equal(aliceProfile.person!.name, "Lynn");

        // Check agent discovery works
        const allAgents = await getAllAgents(alice.cells[0]);
        assert.equal(allAgents.agents.length, 1);
        assert.equal(allAgents.agents[0].name, "Lynn");
      }
    );
  },
  240000
);

test(
  "two agents can see each other",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Both agents create persons
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents should see both persons
        const aliceViewAllAgents = await getAllAgents(alice.cells[0]);
        const bobViewAllAgents = await getAllAgents(bob.cells[0]);
        
        assert.equal(aliceViewAllAgents.agents.length, 2);
        assert.equal(bobViewAllAgents.agents.length, 2);
        
        const aliceNames = aliceViewAllAgents.agents.map(agent => agent.name).sort();
        const bobNames = bobViewAllAgents.agents.map(agent => agent.name).sort();
        
        assert.deepEqual(aliceNames, ["Bob", "Lynn"]);
        assert.deepEqual(bobNames, ["Bob", "Lynn"]);
      }
    );
  },
  240000
);