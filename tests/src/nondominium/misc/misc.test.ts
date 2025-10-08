import { assert, expect, test } from "vitest";
import { Scenario, runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";

type DnaProperties = {
  progenitor_pubkey: string;
};

function decodeDnaProperties(buffer: Uint8Array): DnaProperties {
  return decode(buffer) as DnaProperties;
}

// const HARDCODED_PROGENITOR_PUBKEY =
// "uhCAkVNjcdnXfoExk87X1hKArKH43bZnAidlsSgqBqeGvFpOPiUCT";
const hAppPath = process.cwd() + "/../workdir/nondominium.happ";
const appSource = {
  appBundleSource: {
    type: "path" as const,
    value: hAppPath,
  },
};

test("ping", async () => {
  await runScenario(async (scenario: Scenario) => {
    const [alice] = await scenario.addPlayersWithApps([appSource]);

    // Access the requests_and_offers DNA cell by role name
    const aliceRequestsAndOffers = alice.namedCells.get("requests_and_offers")!;

    const record: string = await aliceRequestsAndOffers.callZome({
      zome_name: "misc",
      fn_name: "ping",
    });
    expect(record).toEqual("Pong");
  });
});
