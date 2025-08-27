import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, AgentPubKey } from "@holochain/client";
import {
  PersonRole,
  PersonRoleInput,
  RoleType,
  CapabilityLevel,
  GetPersonRolesOutput,
} from "@nondominium/shared-types";

// Import parent person functions
import * as personCommon from "../common";
export const samplePerson = personCommon.samplePerson;
export const createPerson = personCommon.createPerson;
export const assignRole = personCommon.assignRole;
export const getPersonRoles = personCommon.getPersonRoles;
export const hasRoleCapability = personCommon.hasRoleCapability;
export const getCapabilityLevel = personCommon.getCapabilityLevel;
export const TEST_ROLES = personCommon.TEST_ROLES;
export const CAPABILITY_LEVELS = personCommon.CAPABILITY_LEVELS;
export const getExpectedCapabilityLevel = personCommon.getExpectedCapabilityLevel;

// Role-specific test scenarios
export interface RoleTestScenario {
  name: string;
  description: string;
  roles: RoleType[];
  expectedCapability: CapabilityLevel;
  expectedPermissions: string[];
  testComplexity: "simple" | "moderate" | "complex";
}

export const ROLE_TEST_SCENARIOS: RoleTestScenario[] = [
  {
    name: "New Community Member",
    description: "Basic member with simple capabilities",
    roles: ["Simple Member"],
    expectedCapability: "member",
    expectedPermissions: ["view_public_resources", "create_basic_requests"],
    testComplexity: "simple",
  },
  {
    name: "Community Advocate",
    description: "Stewardship level member with resource guidance capabilities",
    roles: ["Community Advocate"],
    expectedCapability: "stewardship", 
    expectedPermissions: ["view_public_resources", "guide_resource_usage", "moderate_discussions"],
    testComplexity: "moderate",
  },
  {
    name: "Resource Coordinator",
    description: "Coordination level member with resource management capabilities",
    roles: ["Resource Coordinator"],
    expectedCapability: "coordination",
    expectedPermissions: ["manage_resources", "assign_stewards", "coordinate_activities"],
    testComplexity: "moderate",
  },
  {
    name: "Multi-Role Steward",
    description: "Member with multiple stewardship roles",
    roles: ["Community Advocate", "Resource Steward"],
    expectedCapability: "stewardship",
    expectedPermissions: ["guide_resource_usage", "steward_specific_resources", "moderate_discussions"],
    testComplexity: "moderate",
  },
  {
    name: "Community Founder",
    description: "Governance level founder with all capabilities",
    roles: ["Community Founder"],
    expectedCapability: "governance",
    expectedPermissions: ["full_governance", "modify_structures", "assign_all_roles"],
    testComplexity: "complex",
  },
  {
    name: "Complex Multi-Role Leader", 
    description: "Member with roles spanning multiple capability levels",
    roles: ["Community Coordinator", "Resource Coordinator", "Governance Coordinator"],
    expectedCapability: "governance",
    expectedPermissions: ["coordinate_community", "manage_resources", "governance_decisions"],
    testComplexity: "complex",
  },
];

// Role assignment patterns
export interface RoleAssignmentPattern {
  pattern_name: string;
  description: string;
  role_sequence: RoleType[];
  validation_points: string[];
  expected_progression: CapabilityLevel[];
}

export const ROLE_PROGRESSION_PATTERNS: RoleAssignmentPattern[] = [
  {
    pattern_name: "Standard Member Progression",
    description: "Typical progression from member to steward",
    role_sequence: ["Simple Member", "Community Advocate", "Resource Steward"],
    validation_points: ["initial_capability", "stewardship_upgrade", "resource_specialization"],
    expected_progression: ["member", "stewardship", "stewardship"],
  },
  {
    pattern_name: "Leadership Track",
    description: "Progression toward coordination and governance",
    role_sequence: ["Simple Member", "Community Advocate", "Community Coordinator", "Governance Coordinator"],
    validation_points: ["member_level", "steward_level", "coordinator_level", "governance_level"],
    expected_progression: ["member", "stewardship", "coordination", "governance"],
  },
  {
    pattern_name: "Resource Specialist Track",
    description: "Specialized progression in resource management",
    role_sequence: ["Simple Member", "Resource Steward", "Resource Coordinator"],
    validation_points: ["basic_member", "resource_steward", "resource_coordinator"],
    expected_progression: ["member", "stewardship", "coordination"],
  },
];

// Access control test helpers
export interface AccessControlScenario {
  scenario_name: string;
  roles: RoleType[];
  protected_actions: string[];
  should_have_access: boolean;
  test_context: string;
}

export const ACCESS_CONTROL_SCENARIOS: AccessControlScenario[] = [
  {
    scenario_name: "Member tries governance action",
    roles: ["Simple Member"],
    protected_actions: ["modify_governance_rules", "assign_governance_roles"],
    should_have_access: false,
    test_context: "basic_member_limitations",
  },
  {
    scenario_name: "Advocate tries resource coordination",
    roles: ["Community Advocate"],
    protected_actions: ["assign_resource_steward", "modify_resource_policies"],
    should_have_access: false,
    test_context: "stewardship_level_limits",
  },
  {
    scenario_name: "Coordinator manages resources",
    roles: ["Resource Coordinator"],
    protected_actions: ["assign_resource_steward", "modify_resource_policies", "coordinate_resource_usage"],
    should_have_access: true,
    test_context: "coordination_level_access",
  },
  {
    scenario_name: "Founder has full access",
    roles: ["Community Founder"],
    protected_actions: ["modify_governance_rules", "assign_all_roles", "system_administration"],
    should_have_access: true,
    test_context: "governance_level_full_access",
  },
];

// Role validation helpers
export function validateRoleProgression(
  currentRoles: RoleType[],
  newRole: RoleType
): { valid: boolean; reason?: string } {
  const currentCapability = getExpectedCapabilityLevel(currentRoles);
  const newCapability = getExpectedCapabilityLevel([...currentRoles, newRole]);
  
  // Check if progression makes sense
  const capabilityOrder: CapabilityLevel[] = ["member", "stewardship", "coordination", "governance"];
  const currentIndex = capabilityOrder.indexOf(currentCapability);
  const newIndex = capabilityOrder.indexOf(newCapability);
  
  // Allow same level or progression
  if (newIndex >= currentIndex) {
    return { valid: true };
  }
  
  return { 
    valid: false, 
    reason: `Cannot assign role that decreases capability level from ${currentCapability} to ${newCapability}` 
  };
}

export function validateCapabilityPermissions(
  capability: CapabilityLevel,
  requestedAction: string
): boolean {
  const permissionMatrix: Record<CapabilityLevel, string[]> = {
    member: [
      "view_public_resources",
      "create_basic_requests", 
      "participate_in_discussions",
    ],
    stewardship: [
      "guide_resource_usage",
      "moderate_discussions",
      "mentor_new_members",
      "validate_basic_claims",
    ],
    coordination: [
      "manage_resources",
      "assign_stewards", 
      "coordinate_activities",
      "resolve_conflicts",
      "approve_resource_transfers",
    ],
    governance: [
      "modify_governance_rules",
      "assign_all_roles",
      "system_administration",
      "approve_policy_changes",
      "handle_appeals",
    ],
  };

  // Get all permissions for this capability level and below
  const capabilityOrder: CapabilityLevel[] = ["member", "stewardship", "coordination", "governance"];
  const currentIndex = capabilityOrder.indexOf(capability);
  
  const allPermissions = capabilityOrder
    .slice(0, currentIndex + 1)
    .flatMap(level => permissionMatrix[level]);

  return allPermissions.includes(requestedAction);
}

// Bulk role testing helpers
export async function assignMultipleRoles(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
  roles: RoleType[]
): Promise<HolochainRecord[]> {
  const results: HolochainRecord[] = [];
  
  for (const role of roles) {
    const roleInput: PersonRoleInput = {
      agent_pubkey: agent_pub_key,
      role_name: role,
      description: `${role} assigned for testing`,
    };
    
    const result = await assignRole(cell, roleInput);
    results.push(result);
  }
  
  return results;
}

export async function testRoleProgressionScenario(
  cell: CallableCell,
  agent_pub_key: AgentPubKey,
  pattern: RoleAssignmentPattern
): Promise<{
  progression_results: CapabilityLevel[];
  validation_results: boolean[];
  final_capability: CapabilityLevel;
}> {
  const progression_results: CapabilityLevel[] = [];
  const validation_results: boolean[] = [];
  
  for (let i = 0; i < pattern.role_sequence.length; i++) {
    const role = pattern.role_sequence[i];
    
    // Get current roles
    const currentRolesOutput = await getPersonRoles(cell, agent_pub_key);
    const currentRoles: RoleType[] = currentRolesOutput.roles.map(r => r.role_name as RoleType);
    
    // Validate progression
    const validation = validateRoleProgression(currentRoles, role);
    validation_results.push(validation.valid);
    
    if (validation.valid) {
      // Assign role
      await assignRole(cell, {
        agent_pubkey: agent_pub_key,
        role_name: role,
        description: `Role progression: ${role}`,
      });
      
      // Check resulting capability
      const capability = await getCapabilityLevel(cell, agent_pub_key);
      progression_results.push(capability as CapabilityLevel);
    }
  }
  
  const final_capability = await getCapabilityLevel(cell, agent_pub_key);
  
  return {
    progression_results,
    validation_results, 
    final_capability: final_capability as CapabilityLevel,
  };
}

// Role conflict detection
export interface RoleConflict {
  conflicting_roles: [RoleType, RoleType];
  conflict_reason: string;
  severity: "warning" | "error";
}

export function detectRoleConflicts(roles: RoleType[]): RoleConflict[] {
  const conflicts: RoleConflict[] = [];
  
  // Example conflicts (customize based on your governance model)
  const conflictMatrix: Record<string, { conflicts_with: RoleType[]; reason: string; severity: "warning" | "error" }> = {
    "Community Moderator": {
      conflicts_with: ["Resource Steward"],
      reason: "Potential bias in moderating resource-related conflicts",
      severity: "warning",
    },
    // Add more conflict rules as needed
  };
  
  for (const role of roles) {
    const conflictRule = conflictMatrix[role];
    if (conflictRule) {
      for (const conflictingRole of conflictRule.conflicts_with) {
        if (roles.includes(conflictingRole)) {
          conflicts.push({
            conflicting_roles: [role, conflictingRole],
            conflict_reason: conflictRule.reason,
            severity: conflictRule.severity,
          });
        }
      }
    }
  }
  
  return conflicts;
}

// Test context setup for role management
export interface RoleTestContext {
  alice: any;
  bob: any;
  lynn?: any;
  agentRoles: Map<string, RoleType[]>;
  agentCapabilities: Map<string, CapabilityLevel>;
}

export async function setupRoleManagementTest(
  alice: any,
  bob: any,
  lynn?: any
): Promise<RoleTestContext> {
  const agentRoles = new Map<string, RoleType[]>();
  const agentCapabilities = new Map<string, CapabilityLevel>();
  
  // Set up basic persons first
  await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
  await createPerson(bob.cells[0], samplePerson({ name: "Bob" })); 
  if (lynn) {
    await createPerson(lynn.cells[0], samplePerson({ name: "Charlie" }));
  }
  
  return {
    alice,
    bob,
    lynn,
    agentRoles,
    agentCapabilities,
  };
}