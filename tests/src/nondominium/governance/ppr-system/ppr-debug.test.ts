import { test, expect } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { runScenarioWithTwoAgents } from "../../utils.js";
import {
  proposeCommitment,
  logEconomicEvent,
  issueNewPPRs,
  CommitmentResult,
  EventResult,
  PPRResult,
} from "./common.js";

// Debug test to isolate timeout issues

test("PPR Debug: Minimal scenario setup", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, _alice: PlayerApp, _bob: PlayerApp) => {
      console.log("🔧 Setting up scenario...");

      console.log("✅ Players added");
      console.log("✅ Agents shared");
      console.log("✅ Cell found, scenario setup complete");
    },
  );
});

test("PPR Debug: Simple zome call test", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, _bob: PlayerApp) => {
      console.log("🔧 Testing simple zome call...");

      console.log("🔧 Trying simple commitment creation...");

      // Test just the commitment creation (should be quick)
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Debug test commitment",
      });

      console.log("✅ Commitment created:", commitment);
      expect(commitment).toHaveProperty("commitment_hash");
    },
  );
});

test("PPR Debug: Economic event creation test", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("🔧 Testing economic event creation...");

      // First create commitment
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Debug test commitment",
      });

      console.log("✅ Commitment created, now testing economic event...");

      // Test economic event creation (this might be where it hangs)
      const event = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Debug test economic event",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false, // Don't generate PPRs yet
      });

      console.log("✅ Economic event created:", event.event_hash);
      expect(event).toHaveProperty("event_hash");
    },
  );
});

test("PPR Debug: PPR creation test (potential hang point)", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("🔧 Testing PPR creation (potential hang point)...");

      // Create prerequisite data
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Debug test commitment",
      });

      const event = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Debug test economic event",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      console.log("✅ Prerequisites created, now testing PPR creation...");

      // This is likely where the hang occurs due to cryptographic operations
      const ppr_result = await issueNewPPRs(alice.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["CustodyTransfer", "CustodyAcceptance"],
        provider_metrics: {
          timeliness: 0.9,
          quality: 0.95,
          reliability: 1.0,
          communication: 0.85,
          overall_satisfaction: 0.9,
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 0.9,
          overall_satisfaction: 0.95,
        },
        resource_hash: commitment.commitment_hash,
        notes: "Debug test PPR",
      });

      console.log("✅ PPR created successfully!", ppr_result);
      expect(ppr_result).toHaveProperty("provider_claim_hash");
      expect(ppr_result).toHaveProperty("receiver_claim_hash");
      expect(ppr_result).toHaveProperty("provider_claim");
      expect(ppr_result).toHaveProperty("receiver_claim");
    },
  );
});
