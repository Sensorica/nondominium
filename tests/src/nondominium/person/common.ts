import { CallableCell } from "@holochain/tryorama";
import {
  ActionHash,
  Record as HolochainRecord,
  Link,
  AgentPubKey,
} from "@holochain/client";
import {
  Person,
  PrivatePersonData,
  PersonRole,
  PersonInput,
  PrivatePersonDataInput,
  PersonRoleInput,
  PersonProfileOutput,
  GetAllPersonsOutput,
  GetPersonRolesOutput,
  MockPersonData,
  MockRoleData,
  RoleType,
  CapabilityLevel,
} from "@nondominium/shared-types";

// Sample data generators
export function samplePerson(
  partialPerson: Partial<MockPersonData> = {},
): PersonInput {
  return {
    name: "John Doe",
    avatar_url: "https://example.com/avatar.png",
    bio: "A community member",
    ...partialPerson,
  };
}

export function samplePrivateData(
  partialData: Partial<MockPersonData> = {},
): PrivatePersonDataInput {
  return {
    legal_name: "John Doe Smith",
    address: "123 Main St, Anytown, AT 12345",
    email: "john.doe@example.com",
    phone: "+1-555-123-4567",
    emergency_contact: "Jane Doe, +1-555-987-6543",
    time_zone: "America/New_York",
    location: "New York, NY",
    ...partialData,
  };
}

export function sampleRole(
  agent_pub_key: AgentPubKey,
  role_data: Partial<MockRoleData> = {},
): PersonRoleInput {
  return {
    agent_pubkey: agent_pub_key,
    role_name: "Simple Agent",
    description: "A basic community agent",
    ...role_data,
  };
}

// Zome function wrappers for person management
export async function createPerson(
  cell: CallableCell,
  person: PersonInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_person",
    payload: person,
  });
}

export async function storePrivateData(
  cell: CallableCell,
  privateData: PrivatePersonDataInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "store_private_person_data",
    payload: privateData,
  });
}

export async function getPersonProfile(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
): Promise<PersonProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_profile",
    payload: agent_pub_key,
  });
}

export async function getMyProfile(
  cell: CallableCell,
): Promise<PersonProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_person_profile",
    payload: null,
  });
}

export async function getAllPersons(
  cell: CallableCell,
): Promise<GetAllPersonsOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_all_persons",
    payload: null,
  });
}

export async function assignPersonRole(
  cell: CallableCell,
  roleInput: PersonRoleInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "assign_person_role",
    payload: roleInput,
  });
}

// Convenience alias to match other test files that import `assignRole`
export const assignRole = assignPersonRole;

export async function getPersonRoles(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
): Promise<GetPersonRolesOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_roles",
    payload: agent_pub_key,
  });
}

export async function hasRoleCapability(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
  required_role: string,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "has_person_role_capability",
    payload: [agent_pub_key, required_role],
  });
}

export async function getCapabilityLevel(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
): Promise<string> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_capability_level",
    payload: agent_pub_key,
  });
}

export async function getMyPrivateData(
  cell: CallableCell,
): Promise<PrivatePersonData | null> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_private_person_data",
    payload: null,
  });
}

// ============================================================================
// PRIVATE DATA SHARING FUNCTIONS
// ============================================================================

export interface RequestPrivateDataAccessInput {
  requested_from: AgentPubKey;
  fields_requested: string[];
  context: string;
  resource_hash: ActionHash | null;
  justification: string;
}

export interface RespondToDataAccessInput {
  request_hash: ActionHash;
  response: {
    granted: boolean;
    expires_at: number | null;
  };
}

export interface RespondToDataAccessOutput {
  request_record: HolochainRecord;
  grant_hash: ActionHash | null;
}

export interface GetGrantedPrivateDataInput {
  target_agent: AgentPubKey;
  requested_fields: string[];
  context: string;
}

export async function requestPrivateDataAccess(
  cell: CallableCell,
  input: RequestPrivateDataAccessInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "request_private_data_access",
    payload: input,
  });
}

export async function respondToDataAccessRequest(
  cell: CallableCell,
  input: RespondToDataAccessInput,
): Promise<RespondToDataAccessOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "respond_to_data_access_request",
    payload: input,
  });
}

export async function getGrantedPrivateData(
  cell: CallableCell,
  input: GetGrantedPrivateDataInput,
): Promise<PrivatePersonData> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_granted_private_data",
    payload: input,
  });
}

export async function revokeDataAccessGrant(
  cell: CallableCell,
  grantHash: ActionHash,
): Promise<void> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "revoke_data_access_grant",
    payload: grantHash,
  });
}

export async function getPendingDataRequests(
  cell: CallableCell,
): Promise<any[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_pending_data_requests",
    payload: null,
  });
}

export async function getMyDataGrants(
  cell: CallableCell,
): Promise<any[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_data_grants",
    payload: null,
  });
}

export async function validateAgentPrivateData(
  cell: CallableCell,
  input: {
    target_agent: AgentPubKey;
    validation_context: string;
    required_fields: string[];
    governance_requester: AgentPubKey;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "validate_agent_private_data",
    payload: input,
  });
}

export async function autoGrantGovernanceAccess(
  cell: CallableCell,
  input: {
    target_role: string;
    governance_agent: AgentPubKey;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "auto_grant_governance_access",
    payload: input,
  });
}

export async function promoteAgentWithValidation(
  cell: CallableCell,
  input: {
    target_agent: AgentPubKey;
    target_role: string;
    justification: string;
    validate_private_data: boolean;
    grant_hash?: ActionHash;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "promote_agent_with_validation",
    payload: input,
  });
}

export async function requestRolePromotion(
  cell: CallableCell,
  input: {
    target_role: string;
    justification: string;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "request_role_promotion",
    payload: input,
  });
}

export async function getAgentAccessAuditTrail(
  cell: CallableCell,
  agentPubkey: AgentPubKey,
): Promise<any[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_agent_access_audit_trail",
    payload: { agent_pubkey: agentPubkey },
  });
}

export async function getExpiringGrants(
  cell: CallableCell,
  daysAhead: number,
): Promise<any[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_expiring_grants",
    payload: daysAhead,
  });
}

export async function requestGrantRenewal(
  cell: CallableCell,
  input: {
    grant_hash: ActionHash;
    additional_days: number;
    renewal_justification: string;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "request_grant_renewal",
    payload: input,
  });
}

export async function getPrivateDataSharingStats(
  cell: CallableCell,
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_private_data_sharing_stats",
    payload: null,
  });
}

export async function executeBulkGrantOperation(
  cell: CallableCell,
  input: {
    operation_type: string;
    grant_hashes: ActionHash[];
    justification: string;
  },
): Promise<any[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "execute_bulk_grant_operation",
    payload: input,
  });
}

export async function cleanupExpiredGrants(
  cell: CallableCell,
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "cleanup_expired_grants",
    payload: null,
  });
}

// Test helper functions
export function validatePersonData(
  expected: PersonInput,
  actual: Person,
): boolean {
  return (
    expected.name === actual.name &&
    expected.avatar_url === actual.avatar_url &&
    expected.bio === actual.bio
  );
}

export function validatePrivateData(
  expected: PrivatePersonDataInput,
  actual: PrivatePersonData,
): boolean {
  return (
    expected.legal_name === actual.legal_name &&
    expected.address === actual.address &&
    expected.email === actual.email &&
    expected.phone === actual.phone &&
    expected.emergency_contact === actual.emergency_contact &&
    expected.time_zone === actual.time_zone &&
    expected.location === actual.location
  );
}

export function validateRoleData(
  expected: PersonRoleInput,
  actual: PersonRole,
): boolean {
  return (
    expected.role_name === actual.role_name &&
    expected.description === actual.description &&
    expected.agent_pubkey.toString() === actual.assigned_to?.toString()
  );
}

// Common test patterns
export interface PersonTestContext {
  alice: any;
  bob: any;
  alicePerson?: HolochainRecord;
  bobPerson?: HolochainRecord;
  alicePrivateData?: HolochainRecord;
  bobPrivateData?: HolochainRecord;
}

export async function setupBasicPersons(
  alice: any,
  bob: any,
): Promise<PersonTestContext> {
  // Create persons for both agents
  const alicePerson = await createPerson(
    alice.cells[0],
    samplePerson({ name: "Lynn" }),
  );
  const bobPerson = await createPerson(
    bob.cells[0],
    samplePerson({ name: "Bob" }),
  );

  return {
    alice,
    bob,
    alicePerson,
    bobPerson,
  };
}

export async function setupPersonsWithPrivateData(
  alice: any,
  bob: any,
): Promise<PersonTestContext> {
  const context = await setupBasicPersons(alice, bob);

  // Add private data for both agents
  const alicePrivateData = await storePrivateData(
    alice.cells[0],
    samplePrivateData({
      legal_name: "Lynn Smith",
      email: "lynn@example.com",
    }),
  );

  const bobPrivateData = await storePrivateData(
    bob.cells[0],
    samplePrivateData({
      legal_name: "Bob Johnson",
      email: "bob@example.com",
    }),
  );

  return {
    ...context,
    alicePrivateData,
    bobPrivateData,
  };
}

// Role-related test helpers
// Note: keep values as plain strings to avoid coupling to workspace build state
// (dist of @nondominium/shared-types may momentarily diverge). Zome expects these
// exact human-readable strings, and all consumers accept `string`.
export const TEST_ROLES: Record<string, string> = {
  // Friendly test keys mapped to zome-recognized role names
  SIMPLE: "Simple Agent",

  // Governance/coordination roles
  FOUNDER: "Primary Accountable Agent",       // maps to governance level
  RESOURCE_COORDINATOR: "Accountable Agent",  // maps to coordination level

  // Stewardship roles (any of these map to stewardship level). We choose one canonical string.
  RESOURCE_STEWARD: "Transport Agent",

  // Keep original explicit role names for direct usage if needed
  ACCOUNTABLE: "Accountable Agent",
  PRIMARY_ACCOUNTABLE: "Primary Accountable Agent",
  TRANSPORT: "Transport Agent",
  REPAIR: "Repair Agent",
  STORAGE: "Storage Agent",
};

export const CAPABILITY_LEVELS: Record<string, CapabilityLevel> = {
  MEMBER: "member",
  STEWARDSHIP: "stewardship",
  COORDINATION: "coordination",
  GOVERNANCE: "governance",
};

export function getExpectedCapabilityLevel(roles: RoleType[]): CapabilityLevel {
  const hasGovernanceRole = roles.some((role) =>
    ["Primary Accountable Agent"].includes(role),
  );

  const hasCoordinationRole = roles.some((role) =>
    ["Accountable Agent"].includes(role),
  );

  const hasStewardshipRole = roles.some((role) =>
    ["Transport Agent", "Repair Agent", "Storage Agent"].includes(role),
  );

  if (hasGovernanceRole) {
    return CAPABILITY_LEVELS.GOVERNANCE;
  } else if (hasCoordinationRole) {
    return CAPABILITY_LEVELS.COORDINATION;
  } else if (hasStewardshipRole) {
    return CAPABILITY_LEVELS.STEWARDSHIP;
  } else {
    return CAPABILITY_LEVELS.MEMBER;
  }
}
