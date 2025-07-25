import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  samplePerson,
  createPerson,
  getMyProfile,
  getAllPersons,
  validatePersonData,
} from "./common.js";
import { runScenarioWithTwoAgents } from "../utils.js";
import { Person } from "../../../types.js";

test("simple person creation test", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person
      const personInput = samplePerson({ name: "Lynn" });
      const record = await createPerson(alice.cells[0], personInput);

      // Basic assertions on the record
      assert.ok(record);
      assert.ok(record.signed_action);

      // Extract person from the record
      const deserializedPerson: Person = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_latest_person",
        payload: record.signed_action.hashed.hash,
      });

      // Validate person data
      assert.ok(deserializedPerson);
      assert.equal(deserializedPerson.name, "Lynn");
      assert.equal(deserializedPerson.avatar_url, personInput.avatar_url);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Lynn can get her own profile
      const aliceProfile = await getMyProfile(alice.cells[0]);
      assert.ok(aliceProfile.person);
      assert.equal(aliceProfile.person.name, "Lynn");
    }
  );
}, 240000);

test("get all persons test", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Initially no persons
      let allPersons = await getAllPersons(alice.cells[0]);
      assert.equal(allPersons.persons.length, 0);

      // Lynn creates a person
      await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Now one person visible
      allPersons = await getAllPersons(bob.cells[0]);
      assert.equal(allPersons.persons.length, 1);
      assert.equal(allPersons.persons[0].name, "Lynn");

      // Bob creates a person
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Now two persons visible
      allPersons = await getAllPersons(alice.cells[0]);
      assert.equal(allPersons.persons.length, 2);

      const names = allPersons.persons.map((person) => person.name).sort();
      assert.deepEqual(names, ["Bob", "Lynn"]);
    }
  );
}, 240000);
