import { CallableCell, PlayerApp, dhtSync } from "@holochain/tryorama";
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
  PersonData,
  RoleData,
  RoleType,
  CapabilityLevel,
} from "@nondominium/shared-types";

// Sample data generators
export function samplePerson(
  partialPerson: Partial<PersonData> = {},
): PersonInput {
  return {
    name: "John Doe",
    avatar_url: "https://example.com/avatar.png",
    bio: "A community member",
    ...partialPerson,
  };
}

export function samplePrivateData(
  partialData: Partial<PersonData> = {},
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
  role_data: Partial<RoleData> = {},
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
// CAPABILITY-BASED PRIVATE DATA SHARING FUNCTIONS
// ============================================================================

export async function grantPrivateDataAccess(
  cell: CallableCell,
  payload: {
    agent_to_grant: AgentPubKey;
    fields_allowed: string[];
    context: string;
    expires_in_days?: number;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "grant_private_data_access",
    payload,
  });
}

export async function createPrivateDataCapClaim(
  cell: CallableCell,
  payload: {
    grantor: AgentPubKey;
    cap_secret: any;
    context: string;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_private_data_cap_claim",
    payload,
  });
}

export async function getPrivateDataWithCapability(
  cell: CallableCell,
  payload: {
    requested_fields: string[];
  },
  cap_secret: any,
): Promise<any> {
  return (cell.callZome as any)({
    zome_name: "zome_person",
    fn_name: "get_private_data_with_capability",
    payload,
    cap_secret,
  });
}

export async function grantRoleBasedPrivateDataAccess(
  cell: CallableCell,
  payload: {
    agent: AgentPubKey;
    role: { role_name: string };
    context: string;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "grant_role_based_private_data_access",
    payload,
  });
}

export async function createTransferablePrivateDataAccess(
  cell: CallableCell,
  payload: {
    context: string;
    fields_allowed: string[];
    expires_in_days?: number;
  },
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_transferable_private_data_access",
    payload,
  });
}

export async function revokePrivateDataAccess(
  cell: CallableCell,
  grant_hash: any,
): Promise<void> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "revoke_private_data_access",
    payload: grant_hash,
  });
}

export async function validateCapabilityGrant(
  cell: CallableCell,
  grant_hash: any,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "validate_capability_grant",
    payload: grant_hash,
  });
}

// ============================================================================
// SELF-VALIDATION FUNCTIONS (NEW ARCHITECTURE)
// ============================================================================

export interface CreateSelfValidationProofInput {
  target_agent: AgentPubKey;
  validation_context: string;
  required_fields: string[];
  governance_requester: AgentPubKey;
  grant_hash: ActionHash;
}

export interface SelfValidationResult {
  is_valid: boolean;
  validated_fields: Record<string, string>;
  validation_context: string;
  validated_at: number;
  agent_pubkey: AgentPubKey;
  grant_hash: ActionHash;
  governance_requester: AgentPubKey;
  error_message: string | null;
}

export interface VerifySelfValidationProofInput {
  selfValidationResult: SelfValidationResult;
}

export interface ValidationResult {
  is_valid: boolean;
  validated_data: Record<string, string> | null;
  validation_context: string;
  validated_at: number;
  error_message: string | null;
}

export async function createSelfValidationProof(
  cell: CallableCell,
  input: CreateSelfValidationProofInput,
): Promise<SelfValidationResult> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_self_validation_proof",
    payload: input,
  });
}

export async function verifySelfValidationProof(
  cell: CallableCell,
  proof: SelfValidationResult,
): Promise<ValidationResult> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "verify_self_validation_proof",
    payload: proof,
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
  lynn: any;
  bob: any;
  lynnPerson?: HolochainRecord;
  bobPerson?: HolochainRecord;
  lynnPrivateData?: HolochainRecord;
  bobPrivateData?: HolochainRecord;
}

export async function setupBasicPersons(
  lynn: any,
  bob: any,
): Promise<PersonTestContext> {
  // Create persons for both agents
  const lynnPerson = await createPerson(
    lynn.cells[0],
    samplePerson({ name: "Lynn" }),
  );
  const bobPerson = await createPerson(
    bob.cells[0],
    samplePerson({ name: "Bob" }),
  );

  return {
    lynn,
    bob,
    lynnPerson,
    bobPerson,
  };
}

export async function setupPersonsWithPrivateData(
  lynn: any,
  bob: any,
): Promise<PersonTestContext> {
  const context = await setupBasicPersons(lynn, bob);

  // Add private data for both agents
  const lynnPrivateData = await storePrivateData(
    lynn.cells[0],
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
    lynnPrivateData,
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
  FOUNDER: "Primary Accountable Agent", // maps to governance level
  RESOURCE_COORDINATOR: "Accountable Agent", // maps to coordination level

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

// ============================================================================
// DEVICE MANAGEMENT FUNCTIONS
// ============================================================================

export interface DeviceInput {
  device_id: string;
  device_name: string;
  device_type: string;
  person_hash: ActionHash;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: string;
  registered_at: number;
  last_active: number;
  status: "Active" | "Inactive" | "Revoked";
}

export function sampleDevice(
  person_hash: ActionHash,
  partialDevice: Partial<DeviceInput> = {},
): DeviceInput {
  return {
    device_id: "device_" + Math.random().toString(36).substr(2, 9),
    device_name: "Test Device",
    device_type: "mobile",
    person_hash,
    ...partialDevice,
  };
}

export function sampleDeviceWithId(
  device_id: string,
  person_hash: ActionHash,
  partialDevice: Partial<DeviceInput> = {},
): DeviceInput {
  return {
    device_id,
    device_name: `Device ${device_id}`,
    device_type: "mobile",
    person_hash,
    ...partialDevice,
  };
}

// Device management zome function wrappers
export async function registerDeviceForPerson(
  cell: CallableCell,
  deviceInput: DeviceInput,
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "register_device_for_person",
    payload: deviceInput,
  });
}

export async function getDevicesForPerson(
  cell: CallableCell,
  person_hash: ActionHash,
): Promise<DeviceInfo[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_devices_for_person",
    payload: person_hash,
  });
}

export async function getMyDevices(cell: CallableCell): Promise<DeviceInfo[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_devices",
    payload: null,
  });
}

export async function getDeviceInfo(
  cell: CallableCell,
  device_id: string,
): Promise<DeviceInfo | null> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_device_info",
    payload: device_id,
  });
}

export async function updateDeviceActivity(
  cell: CallableCell,
  device_id: string,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "update_device_activity",
    payload: device_id,
  });
}

export async function deactivateDevice(
  cell: CallableCell,
  device_id: string,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "deactivate_device",
    payload: device_id,
  });
}

// Agent-Person relationship management for multi-device support
export async function addAgentToPerson(
  cell: CallableCell,
  agentToAdd: AgentPubKey,
  personHash: ActionHash,
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "add_agent_to_person",
    payload: [agentToAdd, personHash],
  });
}

// Device validation helper functions
export function validateDeviceData(
  expected: DeviceInput,
  actual: DeviceInfo,
): boolean {
  return (
    expected.device_id === actual.device_id &&
    expected.device_name === actual.device_name &&
    expected.device_type === actual.device_type &&
    actual.status === "Active"
  );
}

export function validateDeviceTimestamps(device: DeviceInfo): boolean {
  const now = Date.now() * 1000; // Convert to microseconds
  const oneHourAgo = now - 60 * 60 * 1000000; // 1 hour ago in microseconds

  return (
    device.registered_at >= oneHourAgo &&
    device.last_active >= device.registered_at &&
    device.last_active <= now
  );
}

// Multi-device test setup helpers
export interface DeviceTestContext {
  alice: PlayerApp;
  bob: PlayerApp;
  carol: PlayerApp;
  alicePerson: HolochainRecord;
  personHash: ActionHash;
  aliceDevice: DeviceInfo;
  bobDevice: DeviceInfo;
  carolDevice: DeviceInfo;
}

export async function setupPersonWithMultipleDevices(
  alice: PlayerApp,
  bob: PlayerApp,
  carol: PlayerApp,
  personData: PersonInput = samplePerson({ name: "Alice Smith" }),
  deviceCount: number = 3,
): Promise<DeviceTestContext> {
  // Alice creates person profile on primary device
  const alicePerson = await createPerson(alice.cells[0], personData);
  const personHash = alicePerson.signed_action.hashed.hash;

  // Store private data for complete setup
  await storePrivateData(
    alice.cells[0],
    samplePrivateData({
      legal_name: "Alice Smith",
      email: "alice@example.com",
    }),
  );

  // Add Bob and Carol as agents to Alice's person for multi-device support
  await addAgentToPerson(alice.cells[0], bob.agentPubKey, personHash);
  await addAgentToPerson(alice.cells[0], carol.agentPubKey, personHash);

  // Wait for agent-person relationships to propagate through DHT
  await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

  // Register devices (Alice=mobile, Bob=desktop, Carol=tablet)
  const aliceDeviceInput = sampleDeviceWithId("alice_mobile", personHash, {
    device_name: "Alice's Mobile",
    device_type: "mobile",
  });

  const bobDeviceInput = sampleDeviceWithId("bob_desktop", personHash, {
    device_name: "Bob's Desktop (Alice's device)",
    device_type: "desktop",
  });

  const carolDeviceInput = sampleDeviceWithId("carol_tablet", personHash, {
    device_name: "Carol's Tablet (Alice's device)",
    device_type: "tablet",
  });

  // Register devices from different agents (now they can because they're associated with Alice's person)
  await registerDeviceForPerson(alice.cells[0], aliceDeviceInput);
  await registerDeviceForPerson(bob.cells[0], bobDeviceInput);
  await registerDeviceForPerson(carol.cells[0], carolDeviceInput);

  // Wait for device registrations to propagate through DHT
  await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

  // Get device info for validation
  const aliceDevices = await getMyDevices(alice.cells[0]);
  const bobDevices = await getMyDevices(bob.cells[0]);
  const carolDevices = await getMyDevices(carol.cells[0]);

  const aliceDevice = aliceDevices.find((d) => d.device_id === "alice_mobile");
  const bobDevice = bobDevices.find((d) => d.device_id === "bob_desktop");
  const carolDevice = carolDevices.find((d) => d.device_id === "carol_tablet");

  // Validate devices were found
  if (!aliceDevice || !bobDevice || !carolDevice) {
    throw new Error("Failed to find expected devices after registration");
  }

  return {
    alice,
    bob,
    carol,
    alicePerson,
    personHash,
    aliceDevice,
    bobDevice,
    carolDevice,
  };
}

export async function validateCrossDevicePersonAccess(
  devices: Array<{ agent: PlayerApp; deviceInfo: DeviceInfo }>,
): Promise<boolean> {
  const personProfiles = await Promise.all(
    devices.map(async ({ agent }) => {
      return await getMyProfile(agent.cells[0]);
    }),
  );

  // All devices should see the same person
  const firstPerson = personProfiles[0].person;
  if (!firstPerson) return false;

  return personProfiles.every(
    (profile: any) =>
      profile.person?.name === firstPerson.name &&
      profile.person?.avatar_url === firstPerson.avatar_url &&
      profile.person?.bio === firstPerson.bio,
  );
}

export async function validateCrossDevicePrivateDataAccess(
  devices: Array<{ agent: PlayerApp; deviceInfo: DeviceInfo }>,
): Promise<boolean> {
  const privateDataProfiles = await Promise.all(
    devices.map(async ({ agent }) => {
      return await getMyProfile(agent.cells[0]);
    }),
  );

  // All devices should see private data (from their associated person)
  // In a multi-device scenario, all agents should have access to private data
  // through their agent-person relationships
  return privateDataProfiles.every(
    (profile: any) => profile.private_data !== undefined,
  );
}

// Governance zome function wrappers removed - these functions don't exist in the actual zome implementation

export async function validateAgentPrivateData(
  cell: CallableCell,
  input: { requesting_agent: AgentPubKey; target_agent: AgentPubKey },
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "validate_agent_private_data",
    payload: input,
  });
}

export async function removeAgentFromPerson(
  cell: CallableCell,
  input: { agent: AgentPubKey; person_hash: ActionHash },
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "remove_agent_from_person",
    payload: [input.agent, input.person_hash],
  });
}

export async function isAgentAssociatedWithPerson(
  cell: CallableCell,
  input: { agent: AgentPubKey; person_hash: ActionHash },
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "is_agent_associated_with_person",
    payload: [input.agent, input.person_hash],
  });
}

// Resource update wrappers
export async function updateEconomicResource(
  cell: CallableCell,
  input: { resource_hash: ActionHash; new_quantity: number; note?: string },
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "update_economic_resource",
    payload: input,
  });
}

export async function getMyResourceSpecifications(
  cell: CallableCell,
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_my_resource_specifications",
    payload: null,
  });
}

// Device type constants for testing
export const DEVICE_TYPES = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
  TABLET: "tablet",
  WEB: "web",
  SERVER: "server",
} as const;

export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];
