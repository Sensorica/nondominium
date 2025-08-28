import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, Link, AgentPubKey } from "@holochain/client";
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
  partialPerson: Partial<MockPersonData> = {}
): PersonInput {
  return {
    name: "John Doe",
    avatar_url: "https://example.com/avatar.png",
    bio: "A community member",
    ...partialPerson,
  };
}

export function samplePrivateData(
  partialData: Partial<MockPersonData> = {}
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
  partialRole: Partial<MockRoleData> = {},
  agent_pub_key: AgentPubKey
): PersonRoleInput {
  return {
    agent_pubkey: agent_pub_key,
    role_name: "Simple Agent",
    description: "A basic community member",
    ...partialRole,
  };
}

// Zome function wrappers for person management
export async function createPerson(
  cell: CallableCell,
  person: PersonInput
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_person",
    payload: person,
  });
}

export async function storePrivateData(
  cell: CallableCell,
  privateData: PrivatePersonDataInput
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "store_private_person_data",
    payload: privateData,
  });
}

export async function getPersonProfile(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<PersonProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_profile",
    payload: agent_pub_key,
  });
}

export async function getMyProfile(
  cell: CallableCell
): Promise<PersonProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_person_profile",
    payload: null,
  });
}

export async function getAllPersons(
  cell: CallableCell
): Promise<GetAllPersonsOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_all_persons",
    payload: null,
  });
}

export async function assignRole(
  cell: CallableCell,
  roleInput: PersonRoleInput
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "assign_person_role",
    payload: roleInput,
  });
}

export async function getPersonRoles(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
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
  required_role: string
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "has_person_role_capability",
    payload: [agent_pub_key, required_role],
  });
}

export async function getCapabilityLevel(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<string> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_capability_level",
    payload: agent_pub_key,
  });
}

export async function getMyPrivateData(
  cell: CallableCell
): Promise<PrivatePersonData | null> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_private_person_data",
    payload: null,
  });
}

// Test helper functions
export function validatePersonData(
  expected: PersonInput,
  actual: Person
): boolean {
  return (
    expected.name === actual.name &&
    expected.avatar_url === actual.avatar_url &&
    expected.bio === actual.bio
  );
}

export function validatePrivateData(
  expected: PrivatePersonDataInput,
  actual: PrivatePersonData
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
  actual: PersonRole
): boolean {
  return (
    expected.role_name === actual.role_name &&
    expected.description === actual.description &&
    expected.agent_pubkey.toString() === actual.assigned_to.toString()
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
  bob: any
): Promise<PersonTestContext> {
  // Create persons for both agents
  const alicePerson = await createPerson(
    alice.cells[0],
    samplePerson({ name: "Lynn" })
  );
  const bobPerson = await createPerson(
    bob.cells[0],
    samplePerson({ name: "Bob" })
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
  bob: any
): Promise<PersonTestContext> {
  const context = await setupBasicPersons(alice, bob);

  // Add private data for both agents
  const alicePrivateData = await storePrivateData(
    alice.cells[0],
    samplePrivateData({
      legal_name: "Lynn Smith",
      email: "lynn@example.com",
    })
  );

  const bobPrivateData = await storePrivateData(
    bob.cells[0],
    samplePrivateData({
      legal_name: "Bob Johnson",
      email: "bob@example.com",
    })
  );

  return {
    ...context,
    alicePrivateData,
    bobPrivateData,
  };
}

// Role-related test helpers
export const TEST_ROLES: Record<string, RoleType> = {
  SIMPLE: "Simple Agent",
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
    ["Primary Accountable Agent"].includes(role)
  );

  const hasCoordinationRole = roles.some((role) =>
    ["Accountable Agent"].includes(role)
  );

  const hasStewardshipRole = roles.some((role) =>
    ["Transport Agent", "Repair Agent", "Storage Agent"].includes(role)
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

