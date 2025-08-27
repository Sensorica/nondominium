import { test, expect } from "vitest";
import { runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";

import {
  sampleParticipationClaim,
  samplePerformanceMetrics,
  issueParticipationReceipts,
  signParticipationClaim,
  validateParticipationClaimSignature,
  getMyParticipationClaims,
  deriveReputationSummary,
  PPR_TEST_SCENARIOS,
  MULTI_AGENT_SCENARIOS,
  validateBiDirectionalReceipts,
  validateReputationDerivation,
  PPRTestProfiler,
  setupBasicGovernanceTest,
} from "./common";

test("PPR Scenario: Complete Resource Exchange Workflow", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();
    const context = await setupBasicGovernanceTest(alice, bob);
    const profiler = new PPRTestProfiler();
    profiler.start();

    // Complete workflow: Resource Contribution -> Service Reception -> Reputation Building
    
    // Step 1: Lynn provides web development service to Bob
    const webDevClaim = sampleParticipationClaim("ServiceProvision", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "web-development-service",
      description: "Delivered responsive website with modern UI",
      evidence_links: ["https://github.com/project/commits", "https://website.demo.com"],
      performance_metrics: samplePerformanceMetrics({
        quality_score: 4.8,
        timeliness_score: 4.5,
        collaboration_score: 4.9,
        innovation_score: 4.3,
        reliability_score: 4.6,
      }),
    });

    const webDevReceipts = await issueParticipationReceipts(alice.cells[0], webDevClaim);
    profiler.recordReceipt();

    expect(webDevReceipts).toHaveLength(2);
    expect(validateBiDirectionalReceipts(webDevReceipts)).toBe(true);

    // Step 2: Bob signs acknowledgment of service reception
    const bobSignature = await signParticipationClaim(bob.cells[0], {
      original_participation_hash: webDevReceipts[1].signed_action.hashed.hash,
      signature: {
        signature_data: new Uint8Array([1, 2, 3, 4, 5]),
        signing_agent: bob.agentPubKey,
        timestamp: Date.now() * 1000,
        signature_method: "Ed25519",
        additional_context: new Map([["satisfaction_rating", "4.8"]]),
      },
    });
    profiler.recordSignature();

    expect(bobSignature).toBeDefined();

    // Step 3: Validate signature authenticity
    const isValid = await validateParticipationClaimSignature(alice.cells[0], {
      participation_claim_hash: webDevReceipts[1].signed_action.hashed.hash,
      signature_hash: bobSignature.signed_action.hashed.hash,
    });
    profiler.recordValidation();

    expect(isValid).toBe(true);

    // Step 4: Lynn provides design consultation (building reputation)
    const designClaim = sampleParticipationClaim("ServiceProvision", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "design-consultation-service",
      description: "UX/UI design consultation and wireframing",
      performance_metrics: samplePerformanceMetrics({
        quality_score: 4.6,
        collaboration_score: 4.8,
        innovation_score: 4.7,
      }),
    });

    const designReceipts = await issueParticipationReceipts(alice.cells[0], designClaim);
    profiler.recordReceipt();

    expect(designReceipts).toHaveLength(2);

    // Step 5: Derive comprehensive reputation summary
    const aliceReputation = await deriveReputationSummary(alice.cells[0], alice.agentPubKey);

    expect(validateReputationDerivation(aliceReputation, 2)).toBe(true);
    expect(aliceReputation.total_participation_claims).toBe(2);
    expect(aliceReputation.average_quality_score).toBeGreaterThan(4.5);
    expect(aliceReputation.reputation_score).toBeGreaterThan(0);

    // Step 6: Verify retrieval of participation history
    const aliceClaims = await getMyParticipationClaims(alice.cells[0], {
      claim_type_filter: "ServiceProvision",
      include_signatures: true,
    });

    expect(aliceClaims).toHaveLength(2);
    expect(aliceClaims.every(claim => claim.entry.claim_type === "ServiceProvision")).toBe(true);

    const metrics = profiler.finish();
    console.log("PPR Scenario Performance:", metrics);

    // Performance assertions
    expect(metrics.receiptCount).toBe(2);
    expect(metrics.signatureCount).toBe(1);
    expect(metrics.validationCount).toBe(1);
    expect(metrics.executionTime).toBeLessThan(5000); // 5 seconds total
  });
});

test("PPR Scenario: Multi-Agent Community Interaction Network", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob, charlie } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const multiAgentScenario = MULTI_AGENT_SCENARIOS[0]; // Triangle exchange
    let totalReceipts = 0;

    // Lynn -> Bob: Resource Contribution
    const lynntoBobClaim = sampleParticipationClaim("ResourceContribution", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "project-management-service",
      description: "Project coordination and milestone tracking",
    });

    const lynntoBobReceipts = await issueParticipationReceipts(alice.cells[0], lynntoBobClaim);
    totalReceipts += lynntoBobReceipts.length;

    // Bob -> Charlie: Service Provision  
    const bobtoCharlieClaim = sampleParticipationClaim("ServiceProvision", {
      counterparty_agent: charlie.agentPubKey,
      resource_specification: "technical-writing-service",
      description: "Documentation and user guides creation",
    });

    const bobtoCharlieReceipts = await issueParticipationReceipts(bob.cells[0], bobtoCharlieClaim);
    totalReceipts += bobtoCharlieReceipts.length;

    // Charlie -> Lynn: Knowledge Sharing
    const charlietoLynnClaim = sampleParticipationClaim("KnowledgeSharing", {
      counterparty_agent: alice.agentPubKey,
      resource_specification: "community-facilitation-service",
      description: "Facilitated community governance workshop",
    });

    const charlietoLynnReceipts = await issueParticipationReceipts(charlie.cells[0], charlietoLynnClaim);
    totalReceipts += charlietoLynnReceipts.length;

    expect(totalReceipts).toBe(multiAgentScenario.expectedTotalReceipts);

    // Validate network effects on reputation
    const lynnReputation = await deriveReputationSummary(alice.cells[0], alice.agentPubKey);
    const bobReputation = await deriveReputationSummary(bob.cells[0], bob.agentPubKey);
    const charlieReputation = await deriveReputationSummary(charlie.cells[0], charlie.agentPubKey);

    // Each agent should have participated in exactly 2 claims (give + receive)
    expect(lynnReputation.total_participation_claims).toBe(2);
    expect(bobReputation.total_participation_claims).toBe(2);
    expect(charlieReputation.total_participation_claims).toBe(2);

    // Network diversity should be reflected in reputation scores
    expect(lynnReputation.reputation_score).toBeGreaterThan(0);
    expect(bobReputation.reputation_score).toBeGreaterThan(0);
    expect(charlieReputation.reputation_score).toBeGreaterThan(0);
  });
});

test("PPR Scenario: Knowledge Sharing Session with Community Impact", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const knowledgeScenario = PPR_TEST_SCENARIOS.find(s => s.name === "Knowledge Sharing Session");
    expect(knowledgeScenario).toBeDefined();

    // Lynn leads a community workshop on governance best practices
    const workshopClaim = sampleParticipationClaim("KnowledgeSharing", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "governance-workshop-facilitation",
      description: "Interactive workshop on decentralized governance patterns",
      evidence_links: ["https://workshop.recordings.com", "https://shared.notes.com"],
      performance_metrics: knowledgeScenario!.performanceMetrics,
    });

    const workshopReceipts = await issueParticipationReceipts(alice.cells[0], workshopClaim);

    expect(workshopReceipts).toHaveLength(knowledgeScenario!.expectedReceiptCount);
    expect(validateBiDirectionalReceipts(workshopReceipts)).toBe(true);

    // Verify knowledge sharing claims have appropriate structure
    const sharingClaim = workshopReceipts.find(r => r.entry.claim_type === "KnowledgeSharing");
    const acquisitionClaim = workshopReceipts.find(r => r.entry.claim_type === "KnowledgeAcquisition");

    expect(sharingClaim).toBeDefined();
    expect(acquisitionClaim).toBeDefined();
    expect(sharingClaim!.entry.description).toContain("workshop");
    expect(acquisitionClaim!.entry.description).toContain("workshop");

    // Knowledge sharing should not require mandatory signature (per scenario)
    if (!knowledgeScenario!.shouldRequireSignature) {
      // Verify that claims can exist without signatures
      const claimsWithoutSignature = await getMyParticipationClaims(alice.cells[0], {
        include_signatures: false,
      });

      expect(claimsWithoutSignature.length).toBeGreaterThan(0);
    }

    // Validate learning impact in performance metrics
    const metrics = sharingClaim!.entry.performance_metrics;
    expect(metrics.additional_metrics?.has("teaching_effectiveness")).toBe(true);
    expect(metrics.collaboration_score).toBeGreaterThan(4.5); // High collaboration expected
  });
});

test("PPR Scenario: Governance Participation and Decision Making", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const governanceScenario = PPR_TEST_SCENARIOS.find(s => s.name === "Governance Participation");
    expect(governanceScenario).toBeDefined();

    // Lynn participates in community governance decision
    const governanceClaim = sampleParticipationClaim("GovernanceParticipation", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "community-decision-facilitation",
      description: "Led consensus building for new resource allocation policies",
      evidence_links: ["https://governance.discussion.com", "https://decision.record.com"],
      performance_metrics: governanceScenario!.performanceMetrics,
    });

    const governanceReceipts = await issueParticipationReceipts(alice.cells[0], governanceClaim);

    expect(governanceReceipts).toHaveLength(2);
    expect(validateBiDirectionalReceipts(governanceReceipts)).toBe(true);

    // Governance participation should require signature validation
    expect(governanceScenario!.shouldRequireSignature).toBe(true);

    // Sign the governance participation
    const governanceSignature = await signParticipationClaim(bob.cells[0], {
      original_participation_hash: governanceReceipts[1].signed_action.hashed.hash,
      signature: {
        signature_data: new Uint8Array([9, 8, 7, 6, 5]),
        signing_agent: bob.agentPubKey,
        timestamp: Date.now() * 1000,
        signature_method: "Ed25519",
        additional_context: new Map([
          ["decision_consensus", "unanimous"],
          ["participation_quality", "high"],
        ]),
      },
    });

    expect(governanceSignature).toBeDefined();

    // Validate governance-specific metrics
    const participationClaim = governanceReceipts.find(r => r.entry.claim_type === "GovernanceParticipation");
    expect(participationClaim).toBeDefined();

    const metrics = participationClaim!.entry.performance_metrics;
    expect(metrics.additional_metrics?.has("decision_quality")).toBe(true);
    expect(metrics.additional_metrics?.has("stakeholder_engagement")).toBe(true);

    // Governance participation should positively impact reputation
    const lynnReputation = await deriveReputationSummary(alice.cells[0], alice.agentPubKey);
    expect(lynnReputation.total_participation_claims).toBeGreaterThan(0);
    expect(lynnReputation.governance_participation_count || 0).toBeGreaterThan(0);
  });
});

test("PPR Scenario: Complex Service Exchange with Quality Validation", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const serviceScenario = PPR_TEST_SCENARIOS.find(s => s.name === "Service Exchange");
    expect(serviceScenario).toBeDefined();

    // High-quality service provision with detailed metrics
    const serviceClaim = sampleParticipationClaim("ServiceProvision", {
      counterparty_agent: bob.agentPubKey,
      resource_specification: "premium-development-service",
      description: "Full-stack application development with testing and deployment",
      evidence_links: [
        "https://github.com/repo/releases",
        "https://testing.reports.com",
        "https://deployment.logs.com",
      ],
      performance_metrics: serviceScenario!.performanceMetrics,
    });

    const serviceReceipts = await issueParticipationReceipts(alice.cells[0], serviceClaim);

    expect(serviceReceipts).toHaveLength(2);
    expect(validateBiDirectionalReceipts(serviceReceipts)).toBe(true);

    // Validate service-specific performance metrics
    const provisionClaim = serviceReceipts.find(r => r.entry.claim_type === "ServiceProvision");
    expect(provisionClaim).toBeDefined();

    const metrics = provisionClaim!.entry.performance_metrics;
    expect(metrics.quality_score).toBe(4.5); // As per scenario
    expect(metrics.additional_metrics?.has("customer_satisfaction")).toBe(true);
    expect(metrics.additional_metrics?.has("technical_proficiency")).toBe(true);

    // Service should require quality validation signature
    expect(serviceScenario!.shouldRequireSignature).toBe(true);

    const qualitySignature = await signParticipationClaim(bob.cells[0], {
      original_participation_hash: serviceReceipts[1].signed_action.hashed.hash,
      signature: {
        signature_data: new Uint8Array([10, 11, 12, 13, 14]),
        signing_agent: bob.agentPubKey,
        timestamp: Date.now() * 1000,
        signature_method: "Ed25519",
        additional_context: new Map([
          ["quality_verified", "true"],
          ["deliverables_complete", "true"],
          ["customer_satisfaction", "4.6"],
        ]),
      },
    });

    expect(qualitySignature).toBeDefined();

    // Validate that high-quality service positively impacts reputation
    const lynnReputation = await deriveReputationSummary(alice.cells[0], alice.agentPubKey);
    expect(lynnReputation.average_quality_score).toBeGreaterThan(4.0);
    expect(lynnReputation.service_provision_count || 0).toBeGreaterThan(0);

    // Verify evidence links are preserved
    expect(provisionClaim!.entry.evidence_links).toHaveLength(3);
    expect(provisionClaim!.entry.evidence_links).toContain("https://github.com/repo/releases");
  });
});