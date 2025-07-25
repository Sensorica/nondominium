import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, Link, AgentPubKey } from "@holochain/client";
import {
  Person,
  PrivateAgentData,
  AgentRole,
  CreatePersonInput,
  CreatePersonOutput,
  StorePrivateDataInput,
  StorePrivateDataOutput,
  AgentProfileOutput,
  GetAllAgentsOutput,
  AssignRoleInput,
  AssignRoleOutput,
  GetAgentRolesOutput,
  MockPersonData,
  MockRoleData,
  RoleType,
  CapabilityLevel,
} from "../../../types";

// Sample data generators
export function samplePerson(
  partialPerson: Partial<MockPersonData> = {}
): CreatePersonInput {
  return {
    name: "John Doe",
    avatar_url: "https://example.com/avatar.png",
    ...partialPerson,
  };
}

export function samplePrivateData(
  partialData: Partial<MockPersonData> = {}
): StorePrivateDataInput {
  return {
    legal_name: "John Doe Smith",
    address: "123 Main St, Anytown, AT 12345",
    email: "john.doe@example.com",
    phone: "+1-555-123-4567",
    emergency_contact: "Jane Doe, +1-555-987-6543",
    ...partialData,
  };
}

export function sampleRole(
  partialRole: Partial<MockRoleData> = {},
  agent_pub_key: AgentPubKey
): AssignRoleInput {
  return {
    agent_pub_key,
    role_name: "Simple Member",
    description: "A basic community member",
    ...partialRole,
  };
}

// Zome function wrappers for person management
export async function createPerson(
  cell: CallableCell,
  person: CreatePersonInput
): Promise<CreatePersonOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "create_person",
    payload: person,
  });
}

export async function storePrivateData(
  cell: CallableCell,
  privateData: StorePrivateDataInput
): Promise<StorePrivateDataOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "store_private_data",
    payload: privateData,
  });
}

export async function getAgentProfile(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<AgentProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_agent_profile",
    payload: agent_pub_key,
  });
}

export async function getMyProfile(
  cell: CallableCell
): Promise<AgentProfileOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_my_profile",
    payload: null,
  });
}

export async function getAllAgents(
  cell: CallableCell
): Promise<GetAllAgentsOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_all_agents",
    payload: null,
  });
}

export async function assignRole(
  cell: CallableCell,
  roleInput: AssignRoleInput
): Promise<AssignRoleOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "assign_role",
    payload: roleInput,
  });
}

export async function getAgentRoles(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<GetAgentRolesOutput> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_agent_roles",
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
    fn_name: "has_role_capability",
    payload: [agent_pub_key, required_role],
  });
}

export async function getAgentCapabilityLevel(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<CapabilityLevel> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_agent_capability_level",
    payload: agent_pub_key,
  });
}

// Test helper functions
export function validatePersonData(
  expected: CreatePersonInput,
  actual: Person
): boolean {
  return (
    expected.name === actual.name && expected.avatar_url === actual.avatar_url
  );
}

export function validatePrivateData(
  expected: StorePrivateDataInput,
  actual: PrivateAgentData
): boolean {
  return (
    expected.legal_name === actual.legal_name &&
    expected.address === actual.address &&
    expected.email === actual.email &&
    expected.phone === actual.phone &&
    expected.emergency_contact === actual.emergency_contact
  );
}

export function validateRoleData(
  expected: AssignRoleInput,
  actual: AgentRole
): boolean {
  return (
    expected.role_name === actual.role_name &&
    expected.description === actual.description &&
    expected.agent_pub_key.toString() === actual.assigned_to.toString()
  );
}

// Common test patterns
export interface PersonTestContext {
  alice: any;
  bob: any;
  alicePerson?: CreatePersonOutput;
  bobPerson?: CreatePersonOutput;
  alicePrivateData?: StorePrivateDataOutput;
  bobPrivateData?: StorePrivateDataOutput;
}

export async function setupBasicPersons(
  alice: any,
  bob: any
): Promise<PersonTestContext> {
  // Create persons for both agents
  const alicePerson = await createPerson(
    alice.cells[0],
    samplePerson({ name: "Alice" })
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
      legal_name: "Alice Smith",
      email: "alice@example.com",
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
  SIMPLE: "Simple Member",
  STEWARD: "Community Steward",
  COORDINATOR: "Resource Coordinator",
  ADVOCATE: "Community Advocate",
  PRIMARY: "Primary Accountable Agent",
  FOUNDER: "Community Founder",
};

export const CAPABILITY_LEVELS: Record<string, CapabilityLevel> = {
  SIMPLE: "simple",
  ACCOUNTABLE: "accountable",
  PRIMARY: "primary_accountable",
};

export function getExpectedCapabilityLevel(roles: RoleType[]): CapabilityLevel {
  const hasPlayfulRole = roles.some((role) =>
    ["Primary Accountable Agent", "Community Founder"].includes(role)
  );

  const hasAccountableRole = roles.some((role) =>
    [
      "Community Steward",
      "Resource Coordinator",
      "Community Advocate",
    ].includes(role)
  );

  if (hasPlayfulRole) {
    return CAPABILITY_LEVELS.PRIMARY;
  } else if (hasAccountableRole) {
    return CAPABILITY_LEVELS.ACCOUNTABLE;
  } else {
    return CAPABILITY_LEVELS.SIMPLE;
  }
}

