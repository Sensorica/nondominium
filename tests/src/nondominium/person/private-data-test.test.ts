import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  samplePerson,
  samplePrivateData,
  createPerson,
  storePrivateData,
  getMyPrivateData,
  validatePrivateData,
} from "./common.js";
import {
  runScenarioWithTwoAgents,
} from "../utils.js";

test(
  "simple private data storage test",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Lynn creates a person first
        const personInput = samplePerson({ name: "Lynn" });
        await createPerson(alice.cells[0], personInput);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn stores private data
        const privateDataInput = samplePrivateData({
          legal_name: "Lynn Smith",
          email: "lynn@example.com",
          address: "123 Main St, Anytown, AT 12345",
        });

        const record = await storePrivateData(alice.cells[0], privateDataInput);
        
        // Basic assertions on the record
        assert.ok(record);
        assert.ok(record.signed_action);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn can get her own private data
        const myPrivateData = await getMyPrivateData(alice.cells[0]);
        assert.ok(myPrivateData);
        assert.equal(myPrivateData.legal_name, "Lynn Smith");
        assert.equal(myPrivateData.email, "lynn@example.com");
        assert.equal(myPrivateData.address, "123 Main St, Anytown, AT 12345");

        // Validate the data matches what we stored
        assert.isTrue(validatePrivateData(privateDataInput, myPrivateData));
      }
    );
  },
  240000
);

test(
  "private data is private test",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Both agents create persons
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn stores private data
        await storePrivateData(alice.cells[0], samplePrivateData({
          legal_name: "Lynn Smith",
          email: "lynn@example.com",
        }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn can get her own private data
        const alicePrivateData = await getMyPrivateData(alice.cells[0]);
        assert.ok(alicePrivateData);
        assert.equal(alicePrivateData.legal_name, "Lynn Smith");

        // Bob cannot get his own private data (hasn't stored any)
        const bobPrivateData = await getMyPrivateData(bob.cells[0]);
        assert.isNull(bobPrivateData);
      }
    );
  },
  240000
);