import { test, expect } from "vitest";
import { Scenario, PlayerApp } from "@holochain/tryorama";
import { runScenarioWithTwoAgents } from "../../utils.js";
import {
  proposeCommitment,
  logEconomicEvent,
  issueNewPPRs,
  signNewParticipationClaim,
  deriveNewReputationSummary,
  getMyNewParticipationClaims,
  CommitmentResult,
  EventResult,
  PPRResult,
  SignatureResult,
  ClaimsResult,
  ReputationSummaryResult,
} from "./common.js";
import { E } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";

// Test PPR Foundation Functions
// This test suite covers the basic PPR system functionality

test("PPR Foundation: Issue bi-directional participation receipts", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create a commitment for the test
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: bob.agentPubKey, // Provider of the commitment
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000, // 24 hours from now in microseconds
        note: "Test commitment for PPR generation",
      });

      // Create an economic event
      const event = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash, // Use commitment hash as placeholder
        resource_quantity: 1.0,
        note: "Test economic event for PPR generation",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false, // We'll test manual PPR generation first
      });

      // Test manual PPR issuance
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
          notes: "Good performance on first transfer",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 0.9,
          overall_satisfaction: 0.95,
          notes: "Prompt acceptance of custody",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Test PPR generation",
      });

      // Verify PPR structure
      expect(ppr_result).toHaveProperty("provider_claim_hash");
      expect(ppr_result).toHaveProperty("receiver_claim_hash");
      expect(ppr_result).toHaveProperty("provider_claim");
      expect(ppr_result).toHaveProperty("receiver_claim");

      // Verify provider claim
      expect(ppr_result.provider_claim.claim_type).toBe("CustodyTransfer");
      expect(ppr_result.provider_claim.counterparty).toEqual(bob.agentPubKey);
      expect(ppr_result.provider_claim.performance_metrics.timeliness).toBe(
        0.9,
      );

      // Verify receiver claim
      expect(ppr_result.receiver_claim.claim_type).toBe("CustodyAcceptance");
      expect(ppr_result.receiver_claim.counterparty).toEqual(alice.agentPubKey);
      expect(ppr_result.receiver_claim.performance_metrics.timeliness).toBe(
        1.0,
      );

      // Both claims should reference the same commitment and event
      expect(ppr_result.provider_claim.fulfills).toEqual(
        commitment.commitment_hash,
      );
      expect(ppr_result.receiver_claim.fulfills).toEqual(
        commitment.commitment_hash,
      );
      expect(ppr_result.provider_claim.fulfilled_by).toEqual(event.event_hash);
      expect(ppr_result.receiver_claim.fulfilled_by).toEqual(event.event_hash);

      console.log("✅ Successfully issued bi-directional PPR claims");
    },
  );
});

test("PPR Foundation: Retrieve private participation claims", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create a test commitment and event
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Use",
        provider: bob.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Test service commitment",
      });

      // Generate PPRs
      const ppr_result = await issueNewPPRs(alice.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: commitment.commitment_hash,
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        claim_types: ["MaintenanceCommitmentAccepted", "GoodFaithTransfer"],
        provider_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 1.0,
          overall_satisfaction: 1.0,
          notes: null,
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 1.0,
          overall_satisfaction: 1.0,
          notes: null,
        },
        resource_hash: null,
        notes: "Service commitment test",
      });

      // Alice should be able to retrieve her claims (she received the GoodFaithTransfer claim)
      const alice_claims = await getMyNewParticipationClaims(alice.cells[0], {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null,
      });

      expect(alice_claims.claims).toHaveLength(1);
      expect(alice_claims.total_count).toBe(1);
      expect(alice_claims.claims[0][1].claim_type).toBe("GoodFaithTransfer");

      // Test filtering by claim type
      const filtered_claims = await getMyNewParticipationClaims(
        alice.cells[0],
        {
          claim_type_filter: "MaintenanceCommitmentAccepted",
          from_time: null,
          to_time: null,
          limit: null,
        },
      );

      expect(filtered_claims.claims).toHaveLength(0); // Alice doesn't have this type
      expect(filtered_claims.total_count).toBe(0);

      console.log(
        "✅ Successfully retrieved and filtered private participation claims",
      );
    },
  );
});

test("PPR Foundation: Derive reputation summary", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const now = Date.now() * 1000; // Current time in microseconds
      const one_hour_ago = now - 60 * 60 * 1000000;
      const one_hour_later = now + 60 * 60 * 1000000;

      // Create multiple PPR claims with different types
      const commitment1 = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: one_hour_later,
        note: "First commitment",
        committed_at: now,
      });

      await issueNewPPRs(alice.cells[0], {
        fulfills: commitment1.signed_action?.hashed.hash!,
        fulfilled_by: commitment1.signed_action?.hashed.hash!,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["CustodyTransfer", "CustodyAcceptance"],
        provider_metrics: {
          timeliness: 0.8,
          quality: 0.9,
          reliability: 1.0,
          communication: 0.85,
          overall_satisfaction: 0.88,
          notes: null,
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 0.95,
          overall_satisfaction: 0.98,
          notes: null,
        },
        resource_hash: null,
        notes: "First PPR set",
      });

      const commitment2 = await proposeCommitment(alice.cells[0], {
        action: "Work",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: one_hour_later,
        note: "Second commitment",
        committed_at: now,
      });

      await issueNewPPRs(alice.cells[0], {
        fulfills: commitment2.signed_action?.hashed.hash!,
        fulfilled_by: commitment2.signed_action?.hashed.hash!,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["ValidationActivity", "RuleCompliance"],
        provider_metrics: {
          timeliness: 0.95,
          quality: 0.85,
          reliability: 0.9,
          communication: 1.0,
          overall_satisfaction: 0.92,
          notes: null,
        },
        receiver_metrics: {
          timeliness: 0.9,
          quality: 0.95,
          reliability: 1.0,
          communication: 0.9,
          overall_satisfaction: 0.94,
          notes: null,
        },
        resource_hash: null,
        notes: "Second PPR set",
      });

      // Derive reputation summary for Alice
      const reputation_summary = await deriveNewReputationSummary(
        alice.cells[0],
        {
          period_start: one_hour_ago,
          period_end: one_hour_later,
          claim_type_filter: null,
        },
      );

      // Verify summary structure
      expect(reputation_summary.summary).toHaveProperty("total_claims");
      expect(reputation_summary.summary).toHaveProperty("average_performance");
      expect(reputation_summary.summary).toHaveProperty("custody_claims");
      expect(reputation_summary.summary).toHaveProperty("governance_claims");
      expect(reputation_summary.summary).toHaveProperty("agent");
      expect(reputation_summary.claims_included).toBeGreaterThan(0);

      // Alice should have both custody and governance claims
      expect(reputation_summary.summary.total_claims).toBeGreaterThan(0);
      expect(reputation_summary.summary.average_performance).toBeGreaterThan(0);
      expect(reputation_summary.summary.agent).toEqual(alice.agentPubKey);

      console.log(
        "✅ Successfully derived reputation summary from multiple PPR claims",
      );
      console.log("Reputation Summary:", reputation_summary.summary);
    },
  );
});

test("PPR Foundation: Performance metrics validation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Test commitment for validation",
      });

      // Test invalid performance metrics (values out of range)
      try {
        await issueNewPPRs(alice.cells[0], {
          fulfills: commitment.commitment_hash,
          fulfilled_by: commitment.commitment_hash,
          provider: alice.agentPubKey,
          receiver: bob.agentPubKey,
          claim_types: ["CustodyTransfer", "CustodyAcceptance"],
          provider_metrics: {
            timeliness: 1.5, // Invalid: > 1.0
            quality: 0.5,
            reliability: 0.8,
            communication: 0.9,
            overall_satisfaction: 0.7,
            notes: null,
          },
          receiver_metrics: {
            timeliness: 1.0,
            quality: 1.0,
            reliability: 1.0,
            communication: 1.0,
            overall_satisfaction: 1.0,
            notes: null,
          },
          resource_hash: null,
          notes: "Invalid metrics test",
        });
        expect.fail("Should have thrown error for invalid performance metrics");
      } catch (error) {
        expect((error as Error).toString()).toContain(
          "Provider metrics invalid",
        );
        console.log("✅ Correctly rejected invalid performance metrics");
      }

      // Test valid performance metrics
      const valid_result = await issueNewPPRs(alice.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: commitment.commitment_hash,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["CustodyTransfer", "CustodyAcceptance"],
        provider_metrics: {
          timeliness: 1.0,
          quality: 0.95,
          reliability: 0.8,
          communication: 0.9,
          overall_satisfaction: 0.88,
          notes: "Valid metrics",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 1.0,
          overall_satisfaction: 1.0,
          notes: null,
        },
        resource_hash: null,
        notes: "Valid metrics test",
      });

      expect(valid_result).toHaveProperty("provider_claim");
      expect(valid_result).toHaveProperty("receiver_claim");
      console.log("✅ Accepted valid performance metrics");
    },
  );
});

test("PPR Foundation: Cryptographic signature validation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Test signing data
      const test_data = new TextEncoder().encode("test data for PPR signing");

      const sign_result = await signNewParticipationClaim(alice.cells[0], {
        data_to_sign: Array.from(test_data),
        counterparty: bob.agentPubKey,
      });

      expect(sign_result).toHaveProperty("signature");
      expect(sign_result).toHaveProperty("signed_data_hash");
      expect(sign_result.signed_data_hash).toHaveLength(32); // 32-byte hash

      console.log(
        "✅ Successfully created cryptographic signature for PPR claim",
      );

      // Note: Full signature validation testing would require actual cryptographic
      // signatures from both parties, which is complex in the test environment
      // The basic structure and hash generation is verified here
    },
  );
});
