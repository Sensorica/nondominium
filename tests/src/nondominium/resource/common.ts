import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, Link, AgentPubKey } from "@holochain/client";
import {
  ResourceSpecification,
  EconomicResource,
  GovernanceRule,
  ResourceSpecificationInput,
  EconomicResourceInput,
  GovernanceRuleInput,
  CreateResourceSpecificationOutput,
  CreateEconomicResourceOutput,
  GetAllResourceSpecificationsOutput,
  GetAllEconomicResourcesOutput,
  GetAllGovernanceRulesOutput,
  GetResourceSpecWithRulesOutput,
  ResourceState,
  TransferCustodyInput,
  TransferCustodyOutput,
} from "../../../types";

// Sample data generators
export function sampleResourceSpecification(
  partialSpec: Partial<ResourceSpecificationInput> = {}
): ResourceSpecificationInput {
  return {
    name: "Community Tool",
    description: "A shared tool for community use",
    category: "tools",
    image_url: "https://example.com/tool.png",
    tags: ["shared", "community", "tool"],
    governance_rules: [
      {
        rule_type: "access_requirement",
        rule_data: JSON.stringify({ min_member_level: "verified" }),
        enforced_by: "Resource Steward",
      },
    ],
    ...partialSpec,
  };
}

export function sampleEconomicResource(
  spec_hash: ActionHash,
  partialResource: Partial<EconomicResourceInput> = {}
): EconomicResourceInput {
  return {
    spec_hash,
    quantity: 1.0,
    unit: "piece",
    current_location: "Community Workshop",
    ...partialResource,
  };
}

export function sampleGovernanceRule(
  partialRule: Partial<GovernanceRuleInput> = {}
): GovernanceRuleInput {
  return {
    rule_type: "usage_limit",
    rule_data: JSON.stringify({ max_hours_per_week: 10 }),
    enforced_by: "Resource Coordinator",
    ...partialRule,
  };
}

// Zome function wrappers for resource management
export async function createResourceSpecification(
  cell: CallableCell,
  spec: ResourceSpecificationInput
): Promise<CreateResourceSpecificationOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "create_resource_specification",
    payload: spec,
  });
}

export async function createEconomicResource(
  cell: CallableCell,
  resource: EconomicResourceInput
): Promise<CreateEconomicResourceOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "create_economic_resource",
    payload: resource,
  });
}

export async function createGovernanceRule(
  cell: CallableCell,
  rule: GovernanceRuleInput
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "create_governance_rule",
    payload: rule,
  });
}

export async function getAllResourceSpecifications(
  cell: CallableCell
): Promise<GetAllResourceSpecificationsOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_all_resource_specifications",
    payload: null,
  });
}

export async function getAllEconomicResources(
  cell: CallableCell
): Promise<GetAllEconomicResourcesOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_all_economic_resources",
    payload: null,
  });
}

export async function getAllGovernanceRules(
  cell: CallableCell
): Promise<GetAllGovernanceRulesOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_all_governance_rules",
    payload: null,
  });
}

export async function getResourceSpecificationWithRules(
  cell: CallableCell,
  spec_hash: ActionHash
): Promise<GetResourceSpecWithRulesOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_resource_specification_with_rules",
    payload: spec_hash,
  });
}

export async function getResourcesBySpecification(
  cell: CallableCell,
  spec_hash: ActionHash
): Promise<HolochainRecord[]> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_resources_by_specification",
    payload: spec_hash,
  });
}

export async function getMyEconomicResources(
  cell: CallableCell
): Promise<Link[]> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_my_economic_resources",
    payload: null,
  });
}

export async function getMyResourceSpecifications(
  cell: CallableCell
): Promise<Link[]> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "get_my_resource_specifications",
    payload: null,
  });
}

export async function transferCustody(
  cell: CallableCell,
  input: TransferCustodyInput
): Promise<TransferCustodyOutput> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "transfer_custody",
    payload: input,
  });
}

export async function updateResourceState(
  cell: CallableCell,
  resource_hash: ActionHash,
  new_state: ResourceState
): Promise<HolochainRecord> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "update_resource_state",
    payload: { resource_hash, new_state },
  });
}

export async function checkFirstResourceRequirement(
  cell: CallableCell,
  agent_pub_key: AgentPubKey
): Promise<boolean> {
  return cell.callZome({
    zome_name: "zome_resource",
    fn_name: "check_first_resource_requirement",
    payload: agent_pub_key,
  });
}

// Test helper functions
export function validateResourceSpecificationData(
  expected: ResourceSpecificationInput,
  actual: ResourceSpecification
): boolean {
  return (
    expected.name === actual.name &&
    expected.description === actual.description &&
    expected.category === actual.category &&
    expected.image_url === actual.image_url &&
    JSON.stringify(expected.tags) === JSON.stringify(actual.tags) &&
    actual.is_active === true
  );
}

export function validateEconomicResourceData(
  expected: EconomicResourceInput,
  actual: EconomicResource
): boolean {
  return (
    expected.spec_hash.toString() === actual.conforms_to.toString() &&
    expected.quantity === actual.quantity &&
    expected.unit === actual.unit &&
    expected.current_location === actual.current_location &&
    actual.state === "PendingValidation"
  );
}

export function validateGovernanceRuleData(
  expected: GovernanceRuleInput,
  actual: GovernanceRule
): boolean {
  return (
    expected.rule_type === actual.rule_type &&
    expected.rule_data === actual.rule_data &&
    expected.enforced_by === actual.enforced_by
  );
}

// Common test patterns
export interface ResourceTestContext {
  alice: any;
  bob: any;
  aliceSpec?: CreateResourceSpecificationOutput;
  bobSpec?: CreateResourceSpecificationOutput;
  aliceResource?: CreateEconomicResourceOutput;
  bobResource?: CreateEconomicResourceOutput;
  aliceRule?: HolochainRecord;
  bobRule?: HolochainRecord;
}

export async function setupBasicResourceSpecifications(
  alice: any,
  bob: any
): Promise<ResourceTestContext> {
  // Create resource specifications for both agents
  const aliceSpec = await createResourceSpecification(
    alice.cells[0],
    sampleResourceSpecification({
      name: "Lynn's Tool",
      category: "personal_tools",
    })
  );
  
  const bobSpec = await createResourceSpecification(
    bob.cells[0],
    sampleResourceSpecification({
      name: "Bob's Equipment",
      category: "equipment",
    })
  );

  return {
    alice,
    bob,
    aliceSpec,
    bobSpec,
  };
}

export async function setupResourcesWithSpecifications(
  alice: any,
  bob: any
): Promise<ResourceTestContext> {
  const context = await setupBasicResourceSpecifications(alice, bob);

  // Create economic resources based on the specifications
  const aliceResource = await createEconomicResource(
    alice.cells[0],
    sampleEconomicResource(context.aliceSpec!.spec_hash, {
      quantity: 2.0,
      unit: "pieces",
      current_location: "Lynn's Workspace",
    })
  );

  const bobResource = await createEconomicResource(
    bob.cells[0],
    sampleEconomicResource(context.bobSpec!.spec_hash, {
      quantity: 1.0,
      unit: "set",
      current_location: "Bob's Workshop",
    })
  );

  return {
    ...context,
    aliceResource,
    bobResource,
  };
}

export async function setupGovernanceRules(
  alice: any,
  bob: any
): Promise<ResourceTestContext> {
  // Create governance rules for both agents
  const aliceRule = await createGovernanceRule(
    alice.cells[0],
    sampleGovernanceRule({
      rule_type: "access_requirement",
      rule_data: JSON.stringify({ member_level: "verified" }),
      enforced_by: "Lynn",
    })
  );

  const bobRule = await createGovernanceRule(
    bob.cells[0],
    sampleGovernanceRule({
      rule_type: "usage_limit",
      rule_data: JSON.stringify({ max_days: 7 }),
      enforced_by: "Bob",
    })
  );

  return {
    alice,
    bob,
    aliceRule,
    bobRule,
  };
}

// Resource state constants for testing
export const RESOURCE_STATES: Record<string, ResourceState> = {
  PENDING: "PendingValidation",
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
  RESERVED: "Reserved",
};

export const TEST_CATEGORIES = {
  TOOLS: "tools",
  EQUIPMENT: "equipment",
  SPACE: "space",
  KNOWLEDGE: "knowledge",
  SERVICE: "service",
};

export const TEST_TAGS = {
  SHARED: "shared",
  COMMUNITY: "community", 
  PERSONAL: "personal",
  VERIFIED: "verified",
  EXPERIMENTAL: "experimental",
};