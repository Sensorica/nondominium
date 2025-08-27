import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, AgentPubKey } from "@holochain/client";
import {
  LegacyParticipationClaimType as ParticipationClaimType,
  LegacyPerformanceMetrics as PerformanceMetrics,
  LegacyCryptographicSignature as CryptographicSignature,
  LegacyReputationSummary as ReputationSummary,
  ParticipationReceiptInput,
  SignParticipationClaimInput,
  ValidateSignatureInput,
  GetParticipationClaimsInput,
  MockParticipationData,
  MockPerformanceData,
} from "@nondominium/shared-types";

// Sample data generators for governance testing
export function sampleParticipationClaim(
  claim_type: ParticipationClaimType = "ResourceContribution",
  partial: Partial<MockParticipationData> = {}
): ParticipationReceiptInput {
  return {
    counterparty_agent: partial.counterparty_agent || null,
    claim_type,
    resource_specification: partial.resource_specification || "sample-resource-spec",
    description: partial.description || "Sample participation claim",
    evidence_links: partial.evidence_links || [],
    performance_metrics: partial.performance_metrics || samplePerformanceMetrics(),
    ...partial,
  };
}

export function samplePerformanceMetrics(
  partial: Partial<MockPerformanceData> = {}
): PerformanceMetrics {
  return {
    quality_score: partial.quality_score || 4.5,
    timeliness_score: partial.timeliness_score || 4.0,
    collaboration_score: partial.collaboration_score || 4.2,
    innovation_score: partial.innovation_score || 3.8,
    reliability_score: partial.reliability_score || 4.3,
    additional_metrics: partial.additional_metrics || new Map(),
    ...partial,
  };
}

export function sampleCryptographicSignature(
  partial: Partial<CryptographicSignature> = {}
): CryptographicSignature {
  return {
    signature_data: partial.signature_data || new Uint8Array([1, 2, 3, 4, 5]),
    signing_agent: partial.signing_agent || null,
    timestamp: partial.timestamp || Date.now() * 1000, // microseconds
    signature_method: partial.signature_method || "Ed25519",
    additional_context: partial.additional_context || new Map(),
    ...partial,
  };
}

// Zome function wrappers for governance operations
export async function issueParticipationReceipts(
  cell: CallableCell,
  receiptInput: ParticipationReceiptInput
): Promise<HolochainRecord[]> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "issue_participation_receipts",
    payload: receiptInput,
  });
}

export async function signParticipationClaim(
  cell: CallableCell,
  signInput: SignParticipationClaimInput
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "sign_participation_claim",
    payload: signInput,
  });
}

export async function validateParticipationClaimSignature(
  cell: CallableCell,
  validateInput: ValidateSignatureInput
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "validate_participation_claim_signature",
    payload: validateInput,
  });
}

export async function getMyParticipationClaims(
  cell: CallableCell,
  filterInput?: GetParticipationClaimsInput
): Promise<HolochainRecord[]> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "get_my_participation_claims",
    payload: filterInput || null,
  });
}

export async function deriveReputationSummary(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<ReputationSummary> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "derive_reputation_summary",
    payload: agent_pub_key,
  });
}

// Test validation helpers
export function validateParticipationReceipt(
  expected: ParticipationReceiptInput,
  actual: any
): boolean {
  return (
    expected.claim_type === actual.claim_type &&
    expected.resource_specification === actual.resource_specification &&
    expected.description === actual.description
  );
}

export function validatePerformanceMetrics(
  expected: PerformanceMetrics,
  actual: PerformanceMetrics
): boolean {
  return (
    Math.abs(expected.quality_score - actual.quality_score) < 0.01 &&
    Math.abs(expected.timeliness_score - actual.timeliness_score) < 0.01 &&
    Math.abs(expected.collaboration_score - actual.collaboration_score) < 0.01 &&
    Math.abs(expected.innovation_score - actual.innovation_score) < 0.01 &&
    Math.abs(expected.reliability_score - actual.reliability_score) < 0.01
  );
}

export function validateCryptographicSignature(
  signature: CryptographicSignature
): boolean {
  return (
    signature.signature_data.length > 0 &&
    signature.timestamp > 0 &&
    signature.signature_method.length > 0
  );
}

// Common test patterns for governance
export interface GovernanceTestContext {
  alice: any;
  bob: any;
  lynn: any;
  aliceReceipts?: HolochainRecord[];
  bobReceipts?: HolochainRecord[];
  signedClaims?: HolochainRecord[];
  reputationData?: ReputationSummary[];
}

export async function setupBasicGovernanceTest(
  alice: any,
  bob: any,
  lynn?: any
): Promise<GovernanceTestContext> {
  return {
    alice,
    bob,
    lynn: lynn || null,
  };
}

export async function setupPPRTestScenario(
  alice: any,
  bob: any
): Promise<GovernanceTestContext> {
  const context = await setupBasicGovernanceTest(alice, bob);
  
  // Issue initial participation receipts
  const aliceReceipts = await issueParticipationReceipts(
    alice.cells[0],
    sampleParticipationClaim("ResourceContribution", {
      counterparty_agent: bob.agentPubKey,
      description: "Lynn provided web development services",
    })
  );

  const bobReceipts = await issueParticipationReceipts(
    bob.cells[0],
    sampleParticipationClaim("ResourceReception", {
      counterparty_agent: alice.agentPubKey,
      description: "Bob received web development services",
    })
  );

  return {
    ...context,
    aliceReceipts,
    bobReceipts,
  };
}

// Performance testing helpers
export const PERFORMANCE_BENCHMARKS = {
  RECEIPT_ISSUANCE_MAX_TIME: 500, // ms
  SIGNATURE_VALIDATION_MAX_TIME: 100, // ms
  REPUTATION_DERIVATION_MAX_TIME: 1000, // ms
  BATCH_OPERATION_MAX_TIME: 2000, // ms
};

export async function measureOperationTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;
  return { result, duration };
}

// Bulk test data generators
export function generateBulkParticipationClaims(
  count: number,
  baseType: ParticipationClaimType = "ResourceContribution"
): ParticipationReceiptInput[] {
  return Array.from({ length: count }, (_, i) =>
    sampleParticipationClaim(baseType, {
      description: `Bulk participation claim ${i + 1}`,
      resource_specification: `resource-spec-${i + 1}`,
    })
  );
}

export const CLAIM_TYPES: ParticipationClaimType[] = [
  "ResourceContribution",
  "ResourceReception", 
  "ServiceProvision",
  "ServiceReception",
  "KnowledgeSharing",
  "KnowledgeAcquisition",
  "CommunitySupport",
  "GovernanceParticipation",
  "ConflictResolution",
  "QualityAssurance",
  "ResourceStewardship",
  "CustodyAcceptance",
  "ComplianceValidation",
  "ProcessImprovement",
  "InnovationContribution",
];

export const TEST_RESOURCES = {
  WEB_DEVELOPMENT: "web-development-service",
  DESIGN_CONSULTATION: "design-consultation-service", 
  PROJECT_MANAGEMENT: "project-management-service",
  COMMUNITY_FACILITATION: "community-facilitation-service",
  TECHNICAL_WRITING: "technical-writing-service",
};