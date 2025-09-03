import { test, expect } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { runScenarioWithTwoAgents } from "../../utils.js";
import {
  proposeCommitment,
  logEconomicEvent,
  issueNewPPRs,
  getMyNewParticipationClaims,
  deriveNewReputationSummary,
  signNewParticipationClaim,
  CommitmentResult,
  EventResult,
  PPRResult,
  ClaimsResult,
  ReputationSummaryResult,
  SignatureResult,
} from "./common.js";

// Test PPR Integration with Economic Processes
// This test suite covers PPR integration with economic events and commitments using current implementation only

test("PPR Integration: Manual PPR generation after economic events", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create a commitment using the current function
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Test commitment for PPR integration",
      });

      // Create an economic event using the current function
      const event = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Test economic event for PPR integration",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false, // Test manual PPR generation
      });

      // Verify basic event structure
      expect(event).toHaveProperty("event_hash");

      // Now manually issue PPRs following the working pattern
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
          notes: "Good integration test performance",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 0.9,
          overall_satisfaction: 0.95,
          notes: "Prompt acceptance",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Integration test PPR generation",
      });

      // Verify PPR structure following working pattern
      expect(ppr_result).toHaveProperty("provider_claim_hash");
      expect(ppr_result).toHaveProperty("receiver_claim_hash");
      expect(ppr_result).toHaveProperty("provider_claim");
      expect(ppr_result).toHaveProperty("receiver_claim");

      // Verify claim types
      expect(ppr_result.provider_claim.claim_type).toBe("CustodyTransfer");
      expect(ppr_result.receiver_claim.claim_type).toBe("CustodyAcceptance");

      // Verify both claims reference correct commitment and event
      expect(ppr_result.provider_claim.fulfills).toEqual(
        commitment.commitment_hash,
      );
      expect(ppr_result.receiver_claim.fulfills).toEqual(
        commitment.commitment_hash,
      );
      expect(ppr_result.provider_claim.fulfilled_by).toEqual(event.event_hash);
      expect(ppr_result.receiver_claim.fulfilled_by).toEqual(event.event_hash);

      console.log("✅ Successfully integrated PPRs with economic event");
    },
  );
});

test("PPR Integration: Retrieve claims and calculate reputation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create commitment and event
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Work",
        provider: bob.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Work commitment for reputation test",
      });

      const event = await logEconomicEvent(alice.cells[0], {
        action: "Work",
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Work completed",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      // Issue PPRs (Bob as provider should call the function)
      const ppr_result = await issueNewPPRs(bob.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        claim_types: ["CustodyTransfer", "CustodyAcceptance"],
        provider_metrics: {
          timeliness: 0.95,
          quality: 0.9,
          reliability: 0.95,
          communication: 0.9,
          overall_satisfaction: 0.92,
          notes: "Excellent work performance",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 1.0,
          reliability: 1.0,
          communication: 1.0,
          overall_satisfaction: 1.0,
          notes: "Very satisfied with service",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Service completion PPRs",
      });

      expect(ppr_result.provider_claim.claim_type).toBe("CustodyTransfer");
      expect(ppr_result.receiver_claim.claim_type).toBe("CustodyAcceptance");

      // Wait for DHT sync before querying claims
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Test retrieval of participation claims for both alice (receiver) and bob (provider)
      const alice_claims = await getMyNewParticipationClaims(alice.cells[0], {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null,
      });

      const bob_claims = await getMyNewParticipationClaims(bob.cells[0], {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null,
      });

      console.log("Alice claims:", alice_claims.claims.length);
      console.log("Bob claims:", bob_claims.claims.length);

      // Either Alice or Bob should have claims
      const total_claims = alice_claims.claims.length + bob_claims.claims.length;
      expect(total_claims).toBeGreaterThan(0);

      // If Alice has claims, check for receiver claim
      if (alice_claims.claims.length > 0) {
        const alice_claim = alice_claims.claims.find(
          ([_hash, claim]) => claim.claim_type === "CustodyAcceptance",
        );
        expect(alice_claim).toBeDefined();
        expect(alice_claim![1].counterparty).toEqual(bob.agentPubKey);
      }

      // If Bob has claims, check for provider claim
      if (bob_claims.claims.length > 0) {
        const bob_claim = bob_claims.claims.find(
          ([_hash, claim]) => claim.claim_type === "CustodyTransfer",
        );
        expect(bob_claim).toBeDefined();
        expect(bob_claim![1].counterparty).toEqual(alice.agentPubKey);
      }

      // Test reputation summary
      const reputation = await deriveNewReputationSummary(alice.cells[0], {
        period_start: Date.now() * 1000 - 24 * 60 * 60 * 1000000, // 24 hours ago
        period_end: Date.now() * 1000 + 24 * 60 * 60 * 1000000, // 24 hours from now
        claim_type_filter: null,
      });

      expect(reputation.summary.total_claims).toBeGreaterThan(0);
      expect(reputation.summary.agent).toEqual(alice.agentPubKey);
      expect(reputation.claims_included).toBeGreaterThan(0);

      console.log("✅ Successfully retrieved claims and calculated reputation");
    },
  );
});

test("PPR Integration: Sign participation claims", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create basic PPR setup
      const commitment = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Test commitment for signing",
      });

      const event = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Test transfer for signing",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      const ppr_result = await issueNewPPRs(alice.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["CustodyTransfer", "CustodyAcceptance"],
        provider_metrics: {
          timeliness: 0.9,
          quality: 0.9,
          reliability: 0.9,
          communication: 0.9,
          overall_satisfaction: 0.9,
          notes: "Standard transfer",
        },
        receiver_metrics: {
          timeliness: 0.9,
          quality: 0.9,
          reliability: 0.9,
          communication: 0.9,
          overall_satisfaction: 0.9,
          notes: "Standard reception",
        },
        resource_hash: commitment.commitment_hash,
        notes: "PPRs for signing test",
      });

      // Wait for DHT sync before proceeding
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Test signing a claim - Bob signs to verify receipt
      const test_data = new TextEncoder().encode(
        "Test signature data for PPR integration",
      );
      const signature_result = await signNewParticipationClaim(bob.cells[0], {
        data_to_sign: Array.from(test_data),
        counterparty: alice.agentPubKey,
      });

      expect(signature_result).toHaveProperty("signature");
      expect(signature_result).toHaveProperty("signed_data_hash");
      expect(signature_result.signed_data_hash).toHaveLength(32); // BLAKE2b-256 hash

      console.log("✅ Successfully signed participation claim");
    },
  );
});

test("PPR Integration: Complete workflow with multiple interactions", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // First interaction: Resource contribution
      const commitment1 = await proposeCommitment(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "First resource contribution",
      });

      const event1 = await logEconomicEvent(alice.cells[0], {
        action: "Transfer",
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment1.commitment_hash,
        resource_quantity: 1.0,
        note: "First transfer",
        commitment_hash: commitment1.commitment_hash,
        generate_pprs: false,
      });

      await issueNewPPRs(alice.cells[0], {
        fulfills: commitment1.commitment_hash,
        fulfilled_by: event1.event_hash,
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["ResourceCreation", "ResourceValidation"],
        provider_metrics: {
          timeliness: 0.9,
          quality: 0.9,
          reliability: 0.9,
          communication: 0.9,
          overall_satisfaction: 0.9,
          notes: "First contribution",
        },
        receiver_metrics: {
          timeliness: 0.9,
          quality: 0.9,
          reliability: 0.9,
          communication: 0.9,
          overall_satisfaction: 0.9,
          notes: "First reception",
        },
        resource_hash: commitment1.commitment_hash,
        notes: "First interaction PPRs",
      });

      // Wait for DHT sync before next interaction
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Second interaction: Service exchange
      const commitment2 = await proposeCommitment(bob.cells[0], {
        action: "Work",
        provider: bob.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Service provision",
      });

      const event2 = await logEconomicEvent(bob.cells[0], {
        action: "Work",
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        resource_inventoried_as: commitment2.commitment_hash,
        resource_quantity: 1.0,
        note: "Service completed",
        commitment_hash: commitment2.commitment_hash,
        generate_pprs: false,
      });

      await issueNewPPRs(bob.cells[0], {
        fulfills: commitment2.commitment_hash,
        fulfilled_by: event2.event_hash,
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        claim_types: ["MaintenanceFulfillmentCompleted", "GoodFaithTransfer"],
        provider_metrics: {
          timeliness: 0.95,
          quality: 0.92,
          reliability: 0.95,
          communication: 0.9,
          overall_satisfaction: 0.93,
          notes: "Quality service provision",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 0.95,
          reliability: 1.0,
          communication: 0.95,
          overall_satisfaction: 0.97,
          notes: "Satisfied with service",
        },
        resource_hash: commitment2.commitment_hash,
        notes: "Service interaction PPRs",
      });

      // Wait for DHT sync before verifying claims
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify both agents have accumulated claims from multiple interactions
      const alice_final_claims = await getMyNewParticipationClaims(
        alice.cells[0],
        {
          claim_type_filter: null,
          from_time: null,
          to_time: null,
          limit: null,
        },
      );

      const bob_final_claims = await getMyNewParticipationClaims(bob.cells[0], {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null,
      });

      // Each agent should have 2 claims (one from each interaction)
      expect(alice_final_claims.claims.length).toBe(2);
      expect(bob_final_claims.claims.length).toBe(2);

      // Verify final reputation for both agents
      const alice_reputation = await deriveNewReputationSummary(
        alice.cells[0],
        {
          period_start: Date.now() * 1000 - 24 * 60 * 60 * 1000000,
          period_end: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
          claim_type_filter: null,
        },
      );

      const bob_reputation = await deriveNewReputationSummary(bob.cells[0], {
        period_start: Date.now() * 1000 - 24 * 60 * 60 * 1000000,
        period_end: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        claim_type_filter: null,
      });

      expect(alice_reputation.summary.total_claims).toBe(2);
      expect(bob_reputation.summary.total_claims).toBe(2);

      console.log("✅ Successfully completed full PPR integration workflow");
    },
  );
});
