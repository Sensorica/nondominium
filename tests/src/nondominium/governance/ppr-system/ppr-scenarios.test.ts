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

// PPR Scenario Tests
// This test suite covers complete workflow scenarios for the PPR system using current implementation only

test("PPR Scenario: Complete Resource Exchange Workflow", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Step 1: Lynn provides web development service to Bob via commitment/event
      const commitment = await proposeCommitment(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Web development service commitment",
      });

      const event = await logEconomicEvent(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Web development service completed",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      // Step 2: Issue PPRs for the service exchange
      const webDevPPRs = await issueNewPPRs(lynn.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["MaintenanceFulfillmentCompleted", "GoodFaithTransfer"],
        provider_metrics: {
          timeliness: 0.95,
          quality: 0.92,
          reliability: 0.95,
          communication: 0.9,
          overall_satisfaction: 0.93,
          notes: "High-quality web development service",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 0.95,
          reliability: 1.0,
          communication: 0.95,
          overall_satisfaction: 0.97,
          notes: "Very satisfied with the service",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Web development service PPRs",
      });

      // Wait for DHT sync before proceeding
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      expect(webDevPPRs).toHaveProperty("provider_claim");
      expect(webDevPPRs).toHaveProperty("receiver_claim");
      expect(webDevPPRs.provider_claim.claim_type).toBe("MaintenanceFulfillmentCompleted");
      expect(webDevPPRs.receiver_claim.claim_type).toBe("GoodFaithTransfer");

      // Step 3: Bob signs acknowledgment of service reception
      const test_signature_data = new TextEncoder().encode(
        "Service received satisfactorily",
      );
      const bobSignature = await signNewParticipationClaim(bob.cells[0], {
        data_to_sign: Array.from(test_signature_data),
        counterparty: lynn.agentPubKey,
      });

      expect(bobSignature).toHaveProperty("signature");
      expect(bobSignature).toHaveProperty("signed_data_hash");

      // Step 4: Verify reputation building
      const lynnReputation = await deriveNewReputationSummary(lynn.cells[0], {
        period_start: Date.now() * 1000 - 60 * 60 * 1000000, // 1 hour ago
        period_end: Date.now() * 1000 + 60 * 60 * 1000000, // 1 hour from now
        claim_type_filter: null,
      });

      expect(lynnReputation.summary.total_claims).toBeGreaterThan(0);
      expect(lynnReputation.summary.agent).toEqual(lynn.agentPubKey);
      expect(lynnReputation.claims_included).toBeGreaterThan(0);

      // Step 5: Verify participation history retrieval
      const lynnClaims = await getMyNewParticipationClaims(lynn.cells[0], {
        claim_type_filter: "MaintenanceFulfillmentCompleted",
        from_time: null,
        to_time: null,
        limit: null,
      });

      expect(lynnClaims.claims.length).toBeGreaterThan(0);
      const provisionClaim = lynnClaims.claims.find(
        ([_hash, claim]) => claim.claim_type === "MaintenanceFulfillmentCompleted",
      );
      expect(provisionClaim).toBeDefined();
      expect(provisionClaim![1].counterparty).toEqual(bob.agentPubKey);

      console.log("✅ Successfully completed resource exchange workflow");
    },
  );
});

test("PPR Scenario: Knowledge Sharing and Community Impact", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn facilitates a knowledge sharing workshop for Bob
      const commitment = await proposeCommitment(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Governance workshop facilitation",
      });

      const event = await logEconomicEvent(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Interactive workshop on decentralized governance patterns",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      // Issue PPRs for knowledge sharing
      const workshopPPRs = await issueNewPPRs(lynn.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["ValidationActivity", "RuleCompliance"],
        provider_metrics: {
          timeliness: 1.0,
          quality: 0.95,
          reliability: 0.98,
          communication: 0.95,
          overall_satisfaction: 0.97,
          notes: "Excellent knowledge sharing session",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 0.92,
          reliability: 1.0,
          communication: 0.9,
          overall_satisfaction: 0.95,
          notes: "Valuable learning experience",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Knowledge sharing workshop PPRs",
      });

      // Wait for DHT sync before proceeding
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      expect(workshopPPRs.provider_claim.claim_type).toBe("ValidationActivity");
      expect(workshopPPRs.receiver_claim.claim_type).toBe(
        "RuleCompliance",
      );

      // Verify knowledge sharing impact on reputation
      const lynnReputation = await deriveNewReputationSummary(lynn.cells[0], {
        period_start: Date.now() * 1000 - 60 * 60 * 1000000,
        period_end: Date.now() * 1000 + 60 * 60 * 1000000,
        claim_type_filter: null,
      });

      expect(lynnReputation.summary.total_claims).toBeGreaterThan(0);
      expect(lynnReputation.summary.average_performance).toBeGreaterThan(0.9);

      console.log("✅ Successfully completed knowledge sharing scenario");
    },
  );
});

test("PPR Scenario: Governance Participation and Decision Making", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn participates in community governance decision with Bob
      const commitment = await proposeCommitment(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Community governance facilitation",
      });

      const event = await logEconomicEvent(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Led consensus building for new resource allocation policies",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      // Issue governance participation PPRs
      const governancePPRs = await issueNewPPRs(lynn.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["DisputeResolutionParticipation", "ValidationActivity"],
        provider_metrics: {
          timeliness: 0.95,
          quality: 0.9,
          reliability: 0.95,
          communication: 0.98,
          overall_satisfaction: 0.94,
          notes: "Effective governance leadership",
        },
        receiver_metrics: {
          timeliness: 0.95,
          quality: 0.92,
          reliability: 1.0,
          communication: 0.95,
          overall_satisfaction: 0.95,
          notes: "Constructive governance participation",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Governance decision facilitation PPRs",
      });

      // Wait for DHT sync before proceeding
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      expect(governancePPRs.provider_claim.claim_type).toBe(
        "DisputeResolutionParticipation",
      );
      expect(governancePPRs.receiver_claim.claim_type).toBe(
        "ValidationActivity",
      );

      // Sign governance participation for validation
      const governance_signature_data = new TextEncoder().encode(
        "Consensus decision validated",
      );
      const governanceSignature = await signNewParticipationClaim(
        bob.cells[0],
        {
          data_to_sign: Array.from(governance_signature_data),
          counterparty: lynn.agentPubKey,
        },
      );

      expect(governanceSignature).toHaveProperty("signature");

      // Verify governance participation impact on reputation
      const lynnReputation = await deriveNewReputationSummary(lynn.cells[0], {
        period_start: Date.now() * 1000 - 60 * 60 * 1000000,
        period_end: Date.now() * 1000 + 60 * 60 * 1000000,
        claim_type_filter: null,
      });

      expect(lynnReputation.summary.total_claims).toBeGreaterThan(0);
      expect(lynnReputation.summary.governance_claims).toBeGreaterThan(0);

      console.log(
        "✅ Successfully completed governance participation scenario",
      );
    },
  );
});

test("PPR Scenario: Quality Service Exchange with Validation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // High-quality service provision with detailed validation
      const commitment = await proposeCommitment(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        resource_hash: null,
        resource_spec_hash: null,
        due_date: Date.now() * 1000 + 24 * 60 * 60 * 1000000,
        note: "Premium development service commitment",
      });

      const event = await logEconomicEvent(lynn.cells[0], {
        action: "Work",
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.commitment_hash,
        resource_quantity: 1.0,
        note: "Full-stack application development with testing and deployment",
        commitment_hash: commitment.commitment_hash,
        generate_pprs: false,
      });

      // Issue high-quality service PPRs
      const servicePPRs = await issueNewPPRs(lynn.cells[0], {
        fulfills: commitment.commitment_hash,
        fulfilled_by: event.event_hash,
        provider: lynn.agentPubKey,
        receiver: bob.agentPubKey,
        claim_types: ["MaintenanceFulfillmentCompleted", "GoodFaithTransfer"],
        provider_metrics: {
          timeliness: 0.98,
          quality: 0.96,
          reliability: 0.98,
          communication: 0.94,
          overall_satisfaction: 0.96,
          notes: "Premium quality development service",
        },
        receiver_metrics: {
          timeliness: 1.0,
          quality: 0.95,
          reliability: 1.0,
          communication: 0.96,
          overall_satisfaction: 0.97,
          notes: "Excellent service delivery",
        },
        resource_hash: commitment.commitment_hash,
        notes: "Premium service exchange PPRs",
      });

      // Wait for DHT sync before proceeding
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      expect(servicePPRs.provider_claim.claim_type).toBe("MaintenanceFulfillmentCompleted");
      expect(servicePPRs.receiver_claim.claim_type).toBe("GoodFaithTransfer");

      // Quality validation signature
      const quality_validation_data = new TextEncoder().encode(
        "Quality validated - deliverables complete",
      );
      const qualitySignature = await signNewParticipationClaim(bob.cells[0], {
        data_to_sign: Array.from(quality_validation_data),
        counterparty: lynn.agentPubKey,
      });

      expect(qualitySignature).toHaveProperty("signature");

      // Verify high-quality service impact on reputation
      const lynnReputation = await deriveNewReputationSummary(lynn.cells[0], {
        period_start: Date.now() * 1000 - 60 * 60 * 1000000,
        period_end: Date.now() * 1000 + 60 * 60 * 1000000,
        claim_type_filter: null,
      });

      expect(lynnReputation.summary.total_claims).toBeGreaterThan(0);
      expect(lynnReputation.summary.average_performance).toBeGreaterThan(0.95);

      // Verify service provision claims
      const lynnClaims = await getMyNewParticipationClaims(lynn.cells[0], {
        claim_type_filter: "MaintenanceFulfillmentCompleted",
        from_time: null,
        to_time: null,
        limit: null,
      });

      expect(lynnClaims.claims.length).toBeGreaterThan(0);
      const serviceClaim = lynnClaims.claims.find(
        ([_hash, claim]) => claim.claim_type === "MaintenanceFulfillmentCompleted",
      );
      expect(serviceClaim).toBeDefined();

      console.log(
        "✅ Successfully completed quality service exchange scenario",
      );
    },
  );
});
