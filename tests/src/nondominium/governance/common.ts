import { CallableCell } from "@holochain/tryorama";
import {
  ActionHash,
  Record as HolochainRecord,
  AgentPubKey,
  Timestamp,
} from "@holochain/client";
import {
  ParticipationClaimType,
  PerformanceMetrics,
  CryptographicSignature,
  ReputationSummary,
  ParticipationReceiptInput,
} from "@nondominium/shared-types";

// Modern PPR input interfaces
export interface PrivateParticipationClaimInput {
  fulfills: ActionHash;
  fulfilled_by: ActionHash;
  claim_type: ParticipationClaimType;
  performance_metrics: PerformanceMetrics;
  counterparty: AgentPubKey;
  resource_hash?: ActionHash;
  notes?: string;
}

// Sample data generators for governance testing
export function sampleParticipationClaim(
  claim_type: ParticipationClaimType = "ResourceCreation",
  partial: Partial<PrivateParticipationClaimInput> = {},
): PrivateParticipationClaimInput {
  return {
    fulfills: partial.fulfills || (new Uint8Array(32) as ActionHash),
    fulfilled_by: partial.fulfilled_by || (new Uint8Array(32) as ActionHash),
    claim_type,
    performance_metrics:
      partial.performance_metrics || samplePerformanceMetrics(),
    counterparty: partial.counterparty || (new Uint8Array(32) as AgentPubKey),
    resource_hash: partial.resource_hash,
    notes: partial.notes || "Sample participation claim",
    ...partial,
  };
}

export function samplePerformanceMetrics(
  partial: Partial<PerformanceMetrics> = {},
): PerformanceMetrics {
  return {
    timeliness: partial.timeliness || 0.8,
    quality: partial.quality || 0.9,
    reliability: partial.reliability || 0.85,
    communication: partial.communication || 0.8,
    overall_satisfaction: partial.overall_satisfaction || 0.85,
    notes: partial.notes || "Sample performance metrics",
    ...partial,
  };
}

export function sampleCryptographicSignature(
  partial: Partial<CryptographicSignature> = {},
): CryptographicSignature {
  return {
    recipient_signature:
      partial.recipient_signature || (new Uint8Array([1, 2, 3, 4, 5]) as any), // Signature type
    counterparty_signature:
      partial.counterparty_signature ||
      (new Uint8Array([6, 7, 8, 9, 10]) as any), // Signature type
    signed_data_hash: partial.signed_data_hash || new Uint8Array(32),
    signed_at: partial.signed_at || Date.now() * 1000, // microseconds to match Timestamp
    ...partial,
  };
}

// Zome function wrappers for governance operations
export async function issueParticipationReceipts(
  cell: CallableCell,
  receiptInput: PrivateParticipationClaimInput,
): Promise<HolochainRecord[]> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "issue_participation_receipts",
    payload: receiptInput,
  });
}

// Modern input interfaces for other PPR functions
export interface SignParticipationClaimInput {
  claim_hash: ActionHash;
  signature: CryptographicSignature;
}

export interface ValidateSignatureInput {
  claim_hash: ActionHash;
  signature: CryptographicSignature;
}

export interface GetParticipationClaimsInput {
  claim_type_filter?: ParticipationClaimType;
  date_range_start?: Timestamp;
  date_range_end?: Timestamp;
}

export async function signParticipationClaim(
  cell: CallableCell,
  signInput: SignParticipationClaimInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "sign_participation_claim",
    payload: signInput,
  });
}

export async function validateParticipationClaimSignature(
  cell: CallableCell,
  validateInput: ValidateSignatureInput,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "validate_participation_claim_signature",
    payload: validateInput,
  });
}

export async function getMyParticipationClaims(
  cell: CallableCell,
  filterInput?: GetParticipationClaimsInput,
): Promise<HolochainRecord[]> {
  return cell.callZome({
    zome_name: "zome_gouvernance",
    fn_name: "get_my_participation_claims",
    payload: filterInput || null,
  });
}

export async function deriveReputationSummary(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
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
  actual: any,
): boolean {
  return (
    expected.claim_type === actual.claim_type &&
    expected.resource_specification === actual.resource_specification &&
    expected.description === actual.description
  );
}

export function validatePerformanceMetrics(
  expected: PerformanceMetrics,
  actual: PerformanceMetrics,
): boolean {
  return (
    Math.abs(expected.quality - actual.quality) < 0.01 &&
    Math.abs(expected.timeliness - actual.timeliness) < 0.01 &&
    Math.abs(expected.communication - actual.communication) < 0.01 &&
    Math.abs(expected.overall_satisfaction - actual.overall_satisfaction) <
      0.01 &&
    Math.abs(expected.reliability - actual.reliability) < 0.01
  );
}

export function validateCryptographicSignature(
  signature: CryptographicSignature,
): boolean {
  return (
    signature.recipient_signature.length > 0 &&
    signature.counterparty_signature.length > 0 &&
    signature.signed_data_hash.length > 0 &&
    signature.signed_at > 0
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
  lynn?: any,
): Promise<GovernanceTestContext> {
  return {
    alice,
    bob,
    lynn: lynn || null,
  };
}

export async function setupPPRTestScenario(
  alice: any,
  bob: any,
): Promise<GovernanceTestContext> {
  const context = await setupBasicGovernanceTest(alice, bob);

  // Issue initial participation receipts
  const aliceReceipts = await issueParticipationReceipts(
    alice.cells[0],
    sampleParticipationClaim("ResourceCreation", {
      counterparty: bob.agentPubKey,
      notes: "Lynn created web development resource",
    }),
  );

  const bobReceipts = await issueParticipationReceipts(
    bob.cells[0],
    sampleParticipationClaim("ResourceCreation", {
      counterparty: alice.agentPubKey,
      notes: "Bob created web development resource",
    }),
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
  operation: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;
  return { result, duration };
}

// Bulk test data generators
export function generateBulkParticipationClaims(
  count: number,
  baseType: ParticipationClaimType = "ResourceCreation",
): PrivateParticipationClaimInput[] {
  return Array.from({ length: count }, (_, i) =>
    sampleParticipationClaim(baseType, {
      notes: `Bulk participation claim ${i + 1}`,
    }),
  );
}

export const TEST_RESOURCES = {
  WEB_DEVELOPMENT: "web-development-service",
  DESIGN_CONSULTATION: "design-consultation-service",
  PROJECT_MANAGEMENT: "project-management-service",
  COMMUNITY_FACILITATION: "community-facilitation-service",
  TECHNICAL_WRITING: "technical-writing-service",
};
