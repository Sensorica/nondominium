import { CallableCell } from "@holochain/tryorama";
import {
  ActionHash,
  Record as HolochainRecord,
  AgentPubKey,
} from "@holochain/client";
import {
  ParticipationClaimType,
  LegacyParticipationClaimType,
  PerformanceMetrics,
  CryptographicSignature,
  ReputationSummary,
  LegacyReputationSummary,
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
    name: "Basic Resource Creation",
    description: "Simple resource creation with standard metrics",
    claimType: "ResourceCreation",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality: 0.8,
      timeliness: 0.8,
      communication: 0.7,
      overall_satisfaction: 0.7,
      reliability: 0.8,
      notes: "Basic resource creation metrics",
    },
    shouldRequireSignature: true,
  },
  {
    name: "Custody Transfer",
    description:
      "Resource custody transfer between agents with performance tracking",
    claimType: "CustodyTransfer",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality: 0.9,
      timeliness: 0.84,
      communication: 0.96,
      overall_satisfaction: 0.8,
      reliability: 0.86,
      notes: "Custody transfer with high efficiency",
    },
    shouldRequireSignature: true,
  },
  {
    name: "Custody Acceptance",
    description: "Community resource custody acceptance with learning outcomes",
    claimType: "CustodyAcceptance",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality: 0.94,
      timeliness: 0.8,
      communication: 0.98,
      overall_satisfaction: 0.84,
      reliability: 0.82,
      notes: "Custody acceptance with excellent outcomes",
    },
    shouldRequireSignature: false,
  },
  {
    name: "Maintenance Fulfillment",
    description: "Active participation in maintenance fulfillment",
    claimType: "MaintenanceFulfillmentCompleted",
    expectedReceiptCount: 2,
    performanceMetrics: {
      quality: 0.86,
      timeliness: 0.9,
      communication: 0.92,
      overall_satisfaction: 0.76,
      reliability: 0.88,
      notes: "Maintenance fulfillment with good quality",
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

  // Check for complementary pairs (using legacy types for compatibility)
  const hasContributionReception =
    claimTypes.includes(
      "ResourceContribution" as LegacyParticipationClaimType,
    ) &&
    claimTypes.includes("ResourceReception" as LegacyParticipationClaimType);
  const hasServiceProvisionReception =
    claimTypes.includes("ServiceProvision" as LegacyParticipationClaimType) &&
    claimTypes.includes("ServiceReception" as LegacyParticipationClaimType);
  const hasKnowledgeExchange =
    claimTypes.includes("KnowledgeSharing" as LegacyParticipationClaimType) &&
    claimTypes.includes("KnowledgeAcquisition" as LegacyParticipationClaimType);

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
  const signedReceipt = decodeRecord(
    signedReceiptRecord,
  ) as SignedParticipationClaim;

  // Validate that signed receipt references original
  return (
    signedReceipt.original_participation_hash &&
    originalReceipt.signed_action.hashed.hash.toString() ===
      signedReceipt.original_participation_hash.toString()
  );
}

export function validateReputationDerivation(
  reputation: LegacyReputationSummary,
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
  interactionMatrix: LegacyParticipationClaimType[][];
  expectedTotalReceipts: number;
  scenario_description: string;
}

export const MULTI_AGENT_SCENARIOS: MultiAgentPPRScenario[] = [
  {
    agentCount: 3,
    interactionMatrix: [
      [
        "ResourceContribution" as LegacyParticipationClaimType,
        "ServiceProvision" as LegacyParticipationClaimType,
      ],
      [
        "ResourceReception" as LegacyParticipationClaimType,
        "KnowledgeSharing" as LegacyParticipationClaimType,
      ],
      [
        "ServiceReception" as LegacyParticipationClaimType,
        "KnowledgeAcquisition" as LegacyParticipationClaimType,
      ],
    ],
    expectedTotalReceipts: 6, // 3 agents × 2 interactions each
    scenario_description: "Triangle resource/service/knowledge exchange",
  },
  {
    agentCount: 4,
    interactionMatrix: [
      [
        "ResourceContribution" as LegacyParticipationClaimType,
        "ServiceProvision" as LegacyParticipationClaimType,
        "GovernanceParticipation" as LegacyParticipationClaimType,
      ],
      [
        "ResourceReception" as LegacyParticipationClaimType,
        "KnowledgeSharing" as LegacyParticipationClaimType,
        "CommunitySupport" as LegacyParticipationClaimType,
      ],
      [
        "ServiceReception" as LegacyParticipationClaimType,
        "KnowledgeAcquisition" as LegacyParticipationClaimType,
        "ConflictResolution" as LegacyParticipationClaimType,
      ],
      [
        "QualityAssurance" as LegacyParticipationClaimType,
        "ProcessImprovement" as LegacyParticipationClaimType,
        "InnovationContribution" as LegacyParticipationClaimType,
      ],
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
      sampleParticipationClaim("ResourceCreation", {
        notes: `Stress test receipt ${i + j + 1}`,
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

// New PPR System Helper Functions
// Following the pattern from requests-and-offers tests organization

// Types for new PPR system
export interface CommitmentInput {
  action: string;
  provider: AgentPubKey;
  resource_hash?: ActionHash | null;
  resource_spec_hash?: ActionHash | null;
  due_date: number;
  note: string;
  committed_at?: number;
}

export interface CommitmentResult {
  commitment_hash: ActionHash;
  signed_action?: {
    hashed: {
      hash: ActionHash;
    };
  };
}

export interface EconomicEventInput {
  action: string;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as: ActionHash;
  resource_quantity: number;
  note: string;
  commitment_hash: ActionHash;
  generate_pprs: boolean;
}

export interface EventResult {
  event_hash: ActionHash;
}

export interface PPRInput {
  fulfills: ActionHash;
  fulfilled_by: ActionHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  claim_types: string[];
  provider_metrics: {
    timeliness: number;
    quality: number;
    reliability: number;
    communication: number;
    overall_satisfaction: number;
    notes?: string | null;
  };
  receiver_metrics: {
    timeliness: number;
    quality: number;
    reliability: number;
    communication: number;
    overall_satisfaction: number;
    notes?: string | null;
  };
  resource_hash?: ActionHash | null;
  notes: string;
}

export interface PPRResult {
  provider_claim_hash: ActionHash;
  receiver_claim_hash: ActionHash;
  provider_claim: {
    claim_type: string;
    counterparty: AgentPubKey;
    performance_metrics: any;
    fulfills: ActionHash;
    fulfilled_by: ActionHash;
  };
  receiver_claim: {
    claim_type: string;
    counterparty: AgentPubKey;
    performance_metrics: any;
    fulfills: ActionHash;
    fulfilled_by: ActionHash;
  };
}

export interface SignParticipationInput {
  data_to_sign: number[];
  counterparty: AgentPubKey;
}

export interface SignatureResult {
  signature: any;
  signed_data_hash: Uint8Array;
}

export interface ReputationInput {
  period_start: number;
  period_end: number;
  claim_type_filter?: string | null;
}

export interface ReputationSummaryResult {
  summary: {
    total_claims: number;
    average_performance: number;
    custody_claims: number;
    governance_claims: number;
    agent: AgentPubKey;
  };
  claims_included: number;
}

export interface ClaimsInput {
  claim_type_filter?: string | null;
  from_time?: number | null;
  to_time?: number | null;
  limit?: number | null;
}

export interface ClaimsResult {
  claims: Array<[ActionHash, ParticipationClaim]>;
  total_count: number;
}

export interface ParticipationClaim {
  claim_type: ParticipationClaimType;
  counterparty: AgentPubKey;
  fulfills: ActionHash;
  fulfilled_by: ActionHash;
  performance_metrics: PerformanceMetrics;
  created_at: number;
}

// Helper functions for new PPR system
export async function proposeCommitment(
  cell: CallableCell,
  commitmentInput: CommitmentInput,
): Promise<CommitmentResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "propose_commitment",
    payload: commitmentInput,
  });
}

export async function logEconomicEvent(
  cell: CallableCell,
  eventInput: EconomicEventInput,
): Promise<EventResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "log_economic_event",
    payload: eventInput,
  });
}

export interface EconomicEventWithPPRsResult {
  event_hash: ActionHash;
  event: {
    action: string;
    provider: AgentPubKey;
    receiver: AgentPubKey;
    resource_inventoried_as?: ActionHash | null;
    resource_quantity: number;
    note?: string | null;
  };
  ppr_claims?: {
    provider_claim_hash: ActionHash;
    receiver_claim_hash: ActionHash;
    provider_claim: {
      claim_type: string;
      counterparty: AgentPubKey;
      fulfills: ActionHash;
      fulfilled_by: ActionHash;
      performance_metrics: {
        timeliness: number;
        quality: number;
        reliability: number;
        communication: number;
        overall_satisfaction: number;
        notes?: string | null;
      };
    };
    receiver_claim: {
      claim_type: string;
      counterparty: AgentPubKey;
      fulfills: ActionHash;
      fulfilled_by: ActionHash;
      performance_metrics: {
        timeliness: number;
        quality: number;
        reliability: number;
        communication: number;
        overall_satisfaction: number;
        notes?: string | null;
      };
    };
  };
}

export async function logEconomicEventWithAutoGeneration(
  cell: CallableCell,
  eventInput: EconomicEventInput,
): Promise<EconomicEventWithPPRsResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "log_economic_event",
    payload: eventInput,
  });
}

export async function issueNewPPRs(
  cell: CallableCell,
  pprInput: PPRInput,
): Promise<PPRResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "issue_participation_receipts",
    payload: pprInput,
  });
}

export async function signNewParticipationClaim(
  cell: CallableCell,
  signInput: SignParticipationInput,
): Promise<SignatureResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "sign_participation_claim",
    payload: signInput,
  });
}

export async function deriveNewReputationSummary(
  cell: CallableCell,
  reputationInput: ReputationInput,
): Promise<ReputationSummaryResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "derive_reputation_summary",
    payload: reputationInput,
  });
}

export async function getMyNewParticipationClaims(
  cell: CallableCell,
  claimsInput: ClaimsInput,
): Promise<ClaimsResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "get_my_participation_claims",
    payload: claimsInput,
  });
}

// Additional helper functions for integration tests (older PPR system functions)

export interface LegacyCommitmentInput {
  action: string;
  provider: AgentPubKey;
  resource_hash?: ActionHash | null;
  resource_spec_hash?: ActionHash | null;
  due_date: number;
  note?: string | null;
}

export interface PersonInput {
  name: string;
  nickname: string;
  bio: string;
  picture?: Uint8Array | null;
  user_type: string;
  email: string;
  phone?: string | null;
  time_zone: string;
  location: string;
}

export interface LegacyCommitmentResult {
  commitment_hash: ActionHash;
  commitment: {
    action: string;
    provider: AgentPubKey;
    receiver: AgentPubKey;
    resource_inventoried_as?: ActionHash | null;
    resource_conforms_to?: ActionHash | null;
    input_of?: ActionHash | null;
    due_date: number;
    note?: string | null;
    committed_at: number;
  };
  signed_action?: {
    hashed: {
      hash: ActionHash;
    };
  };
}

export async function createLegacyCommitment(
  cell: CallableCell,
  commitmentInput: LegacyCommitmentInput,
): Promise<LegacyCommitmentResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "propose_commitment",
    payload: commitmentInput,
  });
}

export interface InitialTransferInput {
  resource_hash: ActionHash;
  receiver: AgentPubKey;
  quantity: number;
}

export async function logInitialTransfer(
  cell: CallableCell,
  transferInput: InitialTransferInput,
): Promise<EconomicEventWithPPRsResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "log_initial_transfer",
    payload: transferInput,
  });
}

export interface PersonResult {
  person_hash: ActionHash;
  person: {
    name: string;
    avatar_url?: string | null;
    bio?: string | null;
  };
}

export async function createPerson(
  cell: CallableCell,
  personInput: PersonInput,
): Promise<PersonResult> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_person",
    payload: personInput,
  });
}

export interface PromotionInput {
  agent: AgentPubKey;
  first_resource_hash: ActionHash;
}

export async function promoteAgentToAccountable(
  cell: CallableCell,
  promotionInput: PromotionInput,
): Promise<string> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "promote_agent_to_accountable",
    payload: promotionInput,
  });
}

export interface ServiceCommitmentInput {
  commitment_hash: ActionHash;
  service_type: string;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_hash: ActionHash | null;
}

export interface ServiceFulfillmentInput {
  commitment_hash: ActionHash;
  event_hash: ActionHash;
  service_type: string;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_hash: ActionHash | null;
}

export interface GetLinksInput {
  base: ActionHash;
  link_type: string;
}

export interface ServicePPRResult {
  provider_claim: {
    claim_type: string;
    counterparty: AgentPubKey;
    fulfills: ActionHash;
    fulfilled_by?: ActionHash;
  };
  receiver_claim: {
    claim_type: string;
    counterparty: AgentPubKey;
    fulfills: ActionHash;
    fulfilled_by?: ActionHash;
  };
}

export interface LinkResult {
  target: ActionHash;
  link_type: string;
}

export async function createServiceCommitmentPPRs(
  cell: CallableCell,
  serviceInput: ServiceCommitmentInput,
): Promise<ServicePPRResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "create_service_commitment_pprs",
    payload: serviceInput,
  });
}

export async function createServiceFulfillmentPPRs(
  cell: CallableCell,
  fulfillmentInput: ServiceFulfillmentInput,
): Promise<ServicePPRResult> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "create_service_fulfillment_pprs",
    payload: fulfillmentInput,
  });
}

export async function getLinks(
  cell: CallableCell,
  linksInput: GetLinksInput,
): Promise<LinkResult[]> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "get_links",
    payload: linksInput,
  });
}
