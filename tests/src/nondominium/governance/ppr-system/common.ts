import { CallableCell } from "@holochain/tryorama";
import {
  ActionHash,
  Record as HolochainRecord,
  AgentPubKey,
} from "@holochain/client";
import {
  LegacyParticipationClaimType as ParticipationClaimType,
  LegacyPerformanceMetrics as PerformanceMetrics,
  LegacyCryptographicSignature as CryptographicSignature,
  LegacyReputationSummary as ReputationSummary,
  ParticipationReceiptInput,
  ParticipationReceipt,
  SignParticipationClaimInput,
  SignedParticipationClaim,
  ValidateSignatureInput,
  GetParticipationClaimsInput,
} from "@nondominium/shared-types";

// Import base governance functions
export * from "../common";

// PPR-specific test helpers and patterns
export interface PPRTestScenario {
  name: string;
  description: string;
  claimType: ParticipationClaimType;
  expectedReceiptCount: number;
  performanceMetrics: PerformanceMetrics;
  shouldRequireSignature: boolean;
}

export const PPR_TEST_SCENARIOS: PPRTestScenario[] = [
  {
    name: "Basic Resource Contribution",
    description: "Simple resource contribution with standard metrics",
    claimType: "ResourceContribution",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality_score: 4.0,
      timeliness_score: 4.0,
      collaboration_score: 4.0,
      innovation_score: 3.5,
      reliability_score: 4.0,
      additional_metrics: new Map(),
    },
    shouldRequireSignature: true,
  },
  {
    name: "Service Exchange",
    description: "Bilateral service exchange with performance tracking",
    claimType: "ServiceProvision",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality_score: 4.5,
      timeliness_score: 4.2,
      collaboration_score: 4.8,
      innovation_score: 4.0,
      reliability_score: 4.3,
      additional_metrics: new Map([
        ["customer_satisfaction", 4.6],
        ["technical_proficiency", 4.4],
      ]),
    },
    shouldRequireSignature: true,
  },
  {
    name: "Knowledge Sharing Session",
    description: "Community knowledge sharing with learning outcomes",
    claimType: "KnowledgeSharing",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality_score: 4.7,
      timeliness_score: 4.0,
      collaboration_score: 4.9,
      innovation_score: 4.2,
      reliability_score: 4.1,
      additional_metrics: new Map([
        ["teaching_effectiveness", 4.8],
        ["knowledge_clarity", 4.5],
      ]),
    },
    shouldRequireSignature: false,
  },
  {
    name: "Governance Participation",
    description: "Active participation in governance decisions",
    claimType: "GovernanceParticipation",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality_score: 4.3,
      timeliness_score: 4.5,
      collaboration_score: 4.6,
      innovation_score: 3.8,
      reliability_score: 4.4,
      additional_metrics: new Map([
        ["decision_quality", 4.2],
        ["stakeholder_engagement", 4.7],
      ]),
    },
    shouldRequireSignature: true,
  },
];

// PPR-specific performance benchmarks
export const PPR_PERFORMANCE_BENCHMARKS = {
  BI_DIRECTIONAL_RECEIPT_CREATION: 1000, // ms
  SIGNATURE_ROUND_TRIP: 200, // ms
  REPUTATION_AGGREGATION: 1500, // ms
  BULK_RECEIPT_PROCESSING: 5000, // ms for 100 receipts
  CROSS_AGENT_VALIDATION: 800, // ms
};

// PPR test validation helpers
export function validateBiDirectionalReceipts(
  receiptsRecords: HolochainRecord[],
  expectedCount: number = 2,
): boolean {
  if (receiptsRecords.length !== expectedCount) {
    console.error(
      `Expected ${expectedCount} receipts, got ${receiptsRecords.length}`,
    );
    return false;
  }

  const receipts = decodeRecords(receiptsRecords) as ParticipationReceipt[];
  // Validate that receipts are complementary
  const claimTypes = receipts.map((r) => r.claim_type);

  // Check for complementary pairs
  const hasContributionReception =
    claimTypes.includes("ResourceContribution") &&
    claimTypes.includes("ResourceReception");
  const hasServiceProvisionReception =
    claimTypes.includes("ServiceProvision") &&
    claimTypes.includes("ServiceReception");
  const hasKnowledgeExchange =
    claimTypes.includes("KnowledgeSharing") &&
    claimTypes.includes("KnowledgeAcquisition");

  return (
    hasContributionReception ||
    hasServiceProvisionReception ||
    hasKnowledgeExchange
  );
}

export function validateSignatureChain(
  originalReceipt: HolochainRecord,
  signedReceiptRecord: HolochainRecord,
): boolean {
  // Decode the signed receipt to access its properties
  const signedReceipt = decodeRecord(signedReceiptRecord) as SignedParticipationClaim;
  
  // Validate that signed receipt references original
  return (
    signedReceipt.original_participation_hash &&
    originalReceipt.signed_action.hashed.hash.toString() ===
      signedReceipt.original_participation_hash.toString()
  );
}

export function validateReputationDerivation(
  reputation: ReputationSummary,
  expectedMinimumClaims: number = 1,
): boolean {
  return (
    reputation.total_participation_claims >= expectedMinimumClaims &&
    reputation.average_quality_score >= 0 &&
    reputation.average_quality_score <= 5 &&
    reputation.reputation_score >= 0 &&
    reputation.last_activity_timestamp > 0
  );
}

// Advanced PPR test scenarios
export interface MultiAgentPPRScenario {
  agentCount: number;
  interactionMatrix: ParticipationClaimType[][];
  expectedTotalReceipts: number;
  scenario_description: string;
}

export const MULTI_AGENT_SCENARIOS: MultiAgentPPRScenario[] = [
  {
    agentCount: 3,
    interactionMatrix: [
      ["ResourceContribution", "ServiceProvision"],
      ["ResourceReception", "KnowledgeSharing"],
      ["ServiceReception", "KnowledgeAcquisition"],
    ],
    expectedTotalReceipts: 6, // 3 agents × 2 interactions each
    scenario_description: "Triangle resource/service/knowledge exchange",
  },
  {
    agentCount: 4,
    interactionMatrix: [
      ["ResourceContribution", "ServiceProvision", "GovernanceParticipation"],
      ["ResourceReception", "KnowledgeSharing", "CommunitySupport"],
      ["ServiceReception", "KnowledgeAcquisition", "ConflictResolution"],
      ["QualityAssurance", "ProcessImprovement", "InnovationContribution"],
    ],
    expectedTotalReceipts: 12, // 4 agents × 3 interactions each
    scenario_description: "Complex multi-domain community interaction",
  },
];

// PPR stress testing helpers
export async function stressTesterPPRIssuance(
  cell: CallableCell,
  receiptCount: number,
  concurrencyLevel: number = 10,
): Promise<{
  totalTime: number;
  averageTime: number;
  successRate: number;
  errors: any[];
}> {
  const startTime = performance.now();
  const errors: any[] = [];
  let successCount = 0;

  // Create batches for concurrent processing
  const batches = [];
  for (let i = 0; i < receiptCount; i += concurrencyLevel) {
    const batchSize = Math.min(concurrencyLevel, receiptCount - i);
    const batch = Array.from({ length: batchSize }, (_, j) =>
      sampleParticipationClaim("ResourceContribution", {
        description: `Stress test receipt ${i + j + 1}`,
        resource_specification: `stress-resource-${i + j + 1}`,
      }),
    );
    batches.push(batch);
  }

  // Process batches
  for (const batch of batches) {
    const promises = batch.map(async (claim) => {
      try {
        await issueParticipationReceipts(cell, claim);
        successCount++;
      } catch (error) {
        errors.push({ claim, error });
      }
    });

    await Promise.all(promises);
  }

  const totalTime = performance.now() - startTime;
  const averageTime = totalTime / receiptCount;
  const successRate = successCount / receiptCount;

  return { totalTime, averageTime, successRate, errors };
}

// Memory and resource monitoring for PPR tests
export interface PPRResourceMetrics {
  memoryUsage: number;
  executionTime: number;
  receiptCount: number;
  signatureCount: number;
  validationCount: number;
}

export class PPRTestProfiler {
  private startTime: number = 0;
  private metrics: PPRResourceMetrics = {
    memoryUsage: 0,
    executionTime: 0,
    receiptCount: 0,
    signatureCount: 0,
    validationCount: 0,
  };

  start(): void {
    this.startTime = performance.now();
  }

  recordReceipt(): void {
    this.metrics.receiptCount++;
  }

  recordSignature(): void {
    this.metrics.signatureCount++;
  }

  recordValidation(): void {
    this.metrics.validationCount++;
  }

  finish(): PPRResourceMetrics {
    this.metrics.executionTime = performance.now() - this.startTime;
    this.metrics.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    return { ...this.metrics };
  }
}

// Import parent governance common functions
import * as governanceCommon from "../common";
import { decodeRecord, decodeRecords } from "../../utils";
export const sampleParticipationClaim =
  governanceCommon.sampleParticipationClaim;
export const samplePerformanceMetrics =
  governanceCommon.samplePerformanceMetrics;
export const issueParticipationReceipts =
  governanceCommon.issueParticipationReceipts;
export const signParticipationClaim = governanceCommon.signParticipationClaim;
export const validateParticipationClaimSignature =
  governanceCommon.validateParticipationClaimSignature;
export const getMyParticipationClaims =
  governanceCommon.getMyParticipationClaims;
export const deriveReputationSummary = governanceCommon.deriveReputationSummary;
