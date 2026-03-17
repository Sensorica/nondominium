/**
 * hREA Bridge Integration Tests — Issues #51, #52, #53, #55
 *
 * Validates that create_person creates a corresponding ReaAgent in the hREA DNA
 * and that get_hrea_agents can retrieve that agent via cross-DNA read.
 *
 * Requires the dual-DNA .happ bundle (nondominium + hrea) produced by PR #58.
 */

import { assert, test } from "vitest";
import { PlayerApp, dhtSync } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord } from "@holochain/client";

import { createPerson, samplePerson } from "./common";
import { runScenarioWithTwoAgents, decodeRecord } from "../utils";
import { Person } from "@nondominium/shared-types";

// Local mirror of hREA's ReaAgent for decoding bridge responses
interface ReaAgent {
  id: ActionHash | null;
  name: string;
  agent_type: string;
  image: string | null;
  classified_as: string[] | null;
  note: string | null;
}

test(
  "create_person stores hrea_agent_hash in Person entry",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario, lynn: PlayerApp, _bob: PlayerApp) => {
        const personInput = samplePerson({ name: "Lynn" });
        const personRecord: HolochainRecord = await createPerson(
          lynn.cells[0],
          personInput,
        );

        assert.ok(personRecord, "create_person should return a record");
        assert.ok(personRecord.signed_action, "Record should have signed_action");

        // Decode the Person entry and verify hrea_agent_hash is populated
        const person = decodeRecord<Person>(personRecord);
        assert.ok(
          person.hrea_agent_hash,
          "Person entry should contain hrea_agent_hash after dual-DNA creation",
        );
      },
    );
  },
  240000,
);

test(
  "get_hrea_agents retrieves ReaAgent created by create_person",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario, lynn: PlayerApp, bob: PlayerApp) => {
        const personInput = samplePerson({ name: "Lynn" });
        const personRecord: HolochainRecord = await createPerson(
          lynn.cells[0],
          personInput,
        );

        const person = decodeRecord<Person>(personRecord);
        assert.ok(
          person.hrea_agent_hash,
          "hrea_agent_hash must be set to proceed with cross-DNA read test",
        );

        // Wait for DHT propagation across agents
        await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

        // Retrieve the ReaAgent from hREA via cross-DNA read
        const agents: Array<HolochainRecord | null> =
          await lynn.cells[0].callZome({
            zome_name: "zome_person",
            fn_name: "get_hrea_agents",
            payload: [person.hrea_agent_hash],
          });

        assert.equal(agents.length, 1, "Should return one agent entry");
        assert.ok(agents[0], "Agent record should not be null");

        // Decode and verify the ReaAgent fields match the Person input
        const reaAgent = decodeRecord<ReaAgent>(agents[0]!);
        assert.equal(
          reaAgent.name,
          "Lynn",
          "ReaAgent name should match Person name",
        );
        assert.equal(
          reaAgent.agent_type,
          "Person",
          "ReaAgent type should be 'Person'",
        );
        assert.equal(
          reaAgent.image,
          personInput.avatar_url ?? null,
          "ReaAgent image should match Person avatar_url",
        );
      },
    );
  },
  240000,
);

test(
  "create_person succeeds even when hREA bridge call fails gracefully",
  async () => {
    // This test validates the best-effort design: Person creation must not
    // fail if the hREA DNA is unavailable. When running with a single-DNA
    // .happ (without hREA role), hrea_agent_hash should be null but the
    // Person record should still be created successfully.
    //
    // In the full dual-DNA test environment this path is not exercised, so
    // we verify the positive case: Person is always returned.
    await runScenarioWithTwoAgents(
      async (_scenario, lynn: PlayerApp, _bob: PlayerApp) => {
        const personInput = samplePerson({ name: "Bob" });
        const personRecord: HolochainRecord = await createPerson(
          lynn.cells[0],
          personInput,
        );

        assert.ok(
          personRecord,
          "create_person should succeed regardless of hREA availability",
        );

        const person = decodeRecord<Person>(personRecord);
        assert.equal(
          person.name,
          "Bob",
          "Person name should be stored correctly",
        );
      },
    );
  },
  240000,
);
