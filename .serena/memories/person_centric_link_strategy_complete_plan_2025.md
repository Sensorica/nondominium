# Person-Centric Link Strategy - Complete Implementation Plan

**Created**: 2025-11-04
**Scope**: Holochain person zome architecture refactoring
**Status**: Comprehensive plan with implementation details, tests, and documentation

## Executive Summary 🎯

**Objective**: Simplify person zome's over-engineered link management while adding multi-device/person support through Person-centric architecture.

**Core Architecture Shift**: Agent-centric → Person-centric (`Agent → Person → Data`)

**Key Benefits**:

- Reduces link complexity from 3 redundant strategies to 1 consistent approach
- Enables multi-device/person scenarios (phones, laptops, shared access)
- Maintains 100% backward compatibility with existing functionality
- Aligns with Holochain agent-first principles AND real-world identity patterns
- Preserves all current test coverage (4/4 scenario tests passing)

## Current State Analysis ❌

### **Over-Engineered Link Management**

```rust
// ❌ Current problematic approach - 3 redundant strategies
// Strategy 1: Direct Agent -> PrivateData link
create_link(agent_pubkey, private_data_hash, LinkTypes::AgentToPrivateData, ());

// Strategy 2: Person -> PrivateData link
create_link(person_link.target, private_data_hash, LinkTypes::PersonToPrivateData, ());

// Strategy 3: Anchor-based link
let anchor_path = Path::from(format!("private_data_{}", agent_pubkey.to_string()));
create_link(anchor_path.path_entry_hash()?, private_data_hash, LinkTypes::PrivateDataDiscovery, ());
```

### **Issues Identified**

- **Maintenance Burden**: 3 different discovery patterns to maintain
- **DHT Inconsistency**: Multiple links can become stale or out of sync
- **Performance Overhead**: Creating and querying multiple link types
- **Test Complexity**: Tests need to account for multiple strategies
- **Future Limitations**: No support for multi-device/person scenarios

## Proposed Solution ✅

### **Person-Centric Architecture**

```
Agent 1 (Mobile) ──┐
Agent 2 (Laptop) ──┼──→ Person Identity ──→ Private Data
Agent 3 (Tablet) ──┘        └──→ Roles & Capabilities
```

### **Simplified Link Strategy**

```rust
// ✅ New simplified approach - single consistent strategy
pub fn create_person_entry_links(
    person_hash: ActionHash,
    entry_hash: ActionHash,
    entry_type: PersonEntryType
) -> ExternResult<()> {
    // 1. Person -> Entry (primary relationship)
    create_link(person_hash, entry_hash, entry_type.to_link_type(), ())?;

    // 2. Global discovery anchor (for network-wide queries)
    let anchor_path = match entry_type {
        PersonEntryType::Person => Path::from("all_persons"),
        PersonEntryType::PrivateData => Path::from("all_private_data"),
        PersonEntryType::Role => Path::from("all_roles"),
    };
    create_link(anchor_path.path_entry_hash()?, entry_hash, LinkTypes::AllPersons, ())?;

    Ok(())
}
```

## Detailed Implementation Plan

### **Phase 1: Core Architecture Changes (Week 1)**

#### **1.1 Update Link Types and Enums**

```rust
// ✅ Simplified link types
#[derive(LinkTypes)]
pub enum LinkTypes {
    // Core person relationships
    AgentToPerson,           // Agent -> Person (device/user session)
    PersonToPrivateData,     // Person -> PrivateData (person's data)
    PersonToRoles,           // Person -> Roles (person's roles)

    // Global discovery anchors
    AllPersons,              // Global persons discovery
    AllRoles,                // Global roles discovery

    // Versioning links
    PersonUpdates,           // Person version history
    RoleUpdates,             // Role version history

    // Capability links (unchanged - working well)
    PersonToCapabilityMetadata,
    CapabilityGrantAnchor,
}

#[derive(Debug, Clone)]
pub enum PersonEntryType {
    Person,
    PrivateData,
    Role,
}

impl PersonEntryType {
    fn to_link_type(&self) -> LinkTypes {
        match self {
            PersonEntryType::Person => LinkTypes::AllPersons,
            PersonEntryType::PrivateData => LinkTypes::PersonToPrivateData,
            PersonEntryType::Role => LinkTypes::PersonToRoles,
        }
    }
}
```

#### **1.2 Agent-Person Relationship Management**

```rust
// ✅ Multiple agents can point to same person
#[hdk_extern]
pub fn create_agent_person_association(agent_pubkey: AgentPubKey, person_hash: ActionHash) -> ExternResult<()> {
    // Check if agent already has a person association
    let existing_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build()
    )?;

    if !existing_links.is_empty() {
        return Err(PersonError::AgentAlreadyHasPerson.into());
    }

    // Create Agent -> Person link
    create_link(agent_pubkey, person_hash, LinkTypes::AgentToPerson, ())?;

    Ok(())
}

#[hdk_extern]
pub fn get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Option<Person>> {
    let agent_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build()
    )?;

    if let Some(agent_link) = agent_links.first() {
        if let Some(person_hash) = agent_link.target.clone().into_action_hash() {
            if let Some(person) = get_latest_person(person_hash)? {
                return Ok(Some(person));
            }
        }
    }

    Ok(None)
}
```

#### **1.3 Person-Centric Private Data Management**

```rust
// ✅ Private data linked to Person, not Agent
#[hdk_extern]
pub fn store_private_person_data(input: PrivatePersonDataInput) -> ExternResult<Record> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // Find the person for this agent
    let person = get_agent_person(agent_pubkey)?.ok_or(
        PersonError::PersonNotFound("No person associated with this agent".to_string())
    )?;

    let private_data = PrivatePersonData {
        legal_name: input.legal_name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        emergency_contact: input.emergency_contact,
        time_zone: input.time_zone,
        location: input.location,
    };

    let private_data_hash = create_entry(&EntryTypes::PrivatePersonData(private_data.clone()))?;

    // Link to PERSON, not agent
    create_person_entry_links(
        get_person_hash_by_agent(agent_pubkey)?,
        private_data_hash,
        PersonEntryType::PrivateData
    )?;

    Ok(get(private_data_hash, GetOptions::default())?.ok_or(
        PersonError::EntryOperationFailed("Failed to retrieve created private data".to_string())
    )?)
}
```

### **Phase 2: Cross-Zome Compatibility Updates (Week 2)**

#### **2.1 Resource Zome Integration**

```rust
// ✅ Updated capability checks through person
pub fn has_agent_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool> {
    let (agent_pubkey, required_role) = input;

    // Find person for this agent
    let person = get_agent_person(agent_pubkey)?;

    match person {
        Some(person) => {
            // Check person's roles (person-centric)
            let roles_output = get_person_roles(person.original_action_hash)?;
            Ok(roles_output.roles.iter().any(|role| role.role_name == required_role))
        }
        None => Ok(false) // Agent has no person = no roles
    }
}

pub fn get_person_capability_level(agent_pubkey: AgentPubKey) -> ExternResult<String> {
    let person = get_agent_person(agent_pubkey)?.ok_or(
        PersonError::PersonNotFound("No person associated with this agent".to_string())
    )?;

    // Check person's roles, not agent's roles
    let roles_output = get_person_roles(person.original_action_hash)?;

    // ... capability logic unchanged from current implementation
}
```

#### **2.2 Governance Zome Integration**

```rust
// ✅ Agent promotion works through person validation
#[hdk_extern]
pub fn promote_agent_to_accountable(input: PromoteAgentInput) -> ExternResult<String> {
    // Get person associated with the agent
    let person = get_agent_person(input.agent.clone())?.ok_or(
        PersonError::PersonNotFound("No person associated with this agent".to_string())
    )?;

    // Get person's private data through person relationship
    let private_data_hash = get_private_data_for_person(person.original_action_hash)?
        .map(|_| ActionHash::from_raw_36(vec![0; 36])); // Placeholder for security

    // Call governance with person's data (unchanged)
    let validation_result = call(
        CallTargetCell::Local,
        "zome_gouvernance",
        "validate_agent_identity".into(),
        None,
        &ValidateAgentIdentityInput {
            agent: input.agent,
            resource_hash: input.first_resource_hash,
            private_data_hash,
        },
    );

    match validation_result {
        Ok(_) => Ok("Agent successfully promoted to Accountable Agent".to_string()),
        Err(e) => Err(PersonError::EntryOperationFailed(format!("Agent promotion failed: {:?}", e)).into()),
    }
}
```

### **Phase 3: Multi-Device Management Features (Week 3)**

#### **3.1 Device Registration and Management**

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterDeviceInput {
    pub person_hash: ActionHash,
    pub device_name: String,
    pub device_type: String, // "mobile", "desktop", "tablet", etc.
}

#[hdk_extern]
pub fn register_device_for_person(input: RegisterDeviceInput) -> ExternResult<()> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // Validate this agent can register for this person
    validate_device_registration(agent_pubkey, input.person_hash)?;

    // Create Agent -> Person association
    create_agent_person_association(agent_pubkey, input.person_hash)?;

    Ok(())
}

#[hdk_extern]
pub fn get_person_agents(person_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
    // Use agent anchor approach for efficient reverse lookup
    let anchor_path = Path::from(format!("person_agents_{}", person_hash.to_string()));
    let agent_links = get_links(
        GetLinksInputBuilder::try_new(anchor_path.path_entry_hash()?, LinkTypes::PersonToAgents)?.build()
    )?;

    let mut agents = Vec::new();
    for link in agent_links {
        if let Some(agent_hash) = link.target.into_action_hash() {
            agents.push(agent_hash);
        }
    }

    Ok(agents)
}
```

#### **3.2 Session Management**

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct SessionInfo {
    pub agent_pubkey: AgentPubKey,
    pub device_name: String,
    pub last_active: Timestamp,
    pub is_current_session: bool,
}

#[hdk_extern]
pub fn get_person_active_sessions(person_hash: ActionHash) -> ExternResult<Vec<SessionInfo>> {
    let agents = get_person_agents(person_hash)?;
    let mut active_sessions = Vec::new();

    for agent in agents {
        if let Some(session) = get_agent_session_info(agent)? {
            active_sessions.push(session);
        }
    }

    Ok(active_sessions)
}
```

## Comprehensive Test Strategy

### **Current Test Status**

- ✅ **All 4 scenario tests currently passing** (`person-scenario-tests.test.ts`)
- ✅ Foundation tests: Basic function validation
- ✅ Integration tests: Cross-functionality testing
- ✅ Capability tests: Privacy and access control

### **New Test Files to Create**

#### **person-multi-device-tests.test.ts**

```typescript
test("Multi-device access to person data", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Alice creates person profile on primary device
      const { personHash, devices } = await setupPersonWithMultipleDevices(
        scenario,
        samplePerson({ name: "Alice Smith" }),
        3, // Alice, Bob, Carol as Alice's devices
      );

      // All devices should access Alice's person data
      for (const device of devices) {
        const profile = await getMyProfile(device);
        assert.isNotNull(profile.person);
        assert.equal(profile.person!.name, "Alice Smith");
        assert.isNotNull(profile.private_data);
      }

      // Test device-specific capabilities
      const aliceRoles = await getPersonRoles(devices[0]); // Primary device
      const bobRoles = await getPersonRoles(devices[1]); // Secondary device
      const carolRoles = await getPersonRoles(devices[2]); // Secondary device

      // All devices should see same roles
      assert.equal(aliceRoles.roles.length, bobRoles.roles.length);
      assert.equal(aliceRoles.roles.length, carolRoles.roles.length);
    },
  );
});

test("Person-centric role assignment across devices", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with multiple devices
      const { personHash, devices } = await setupPersonWithMultipleDevices(
        scenario,
        samplePerson({ name: "Alice Smith" }),
        2,
      );

      // Assign role from primary device
      await assignRole(
        devices[0],
        sampleRole(devices[0].cellId[1], {
          role_name: "Accountable Agent",
          description: "Promoted from primary device",
        }),
      );

      await dhtSync([alice, bob], devices[0].cell_id[0]);

      // Role should be visible from all devices
      for (const device of devices) {
        const roles = await getPersonRoles(device);
        assert.equal(roles.roles.length, 1);
        assert.equal(roles.roles[0].role_name, "Accountable Agent");
      }

      // Capability level should be consistent across devices
      for (const device of devices) {
        const capabilityLevel = await getCapabilityLevel(device);
        assert.equal(capabilityLevel, "coordination");
      }
    },
  );
});
```

#### **person-backward-compatibility-tests.test.ts**

```typescript
test("Legacy agent-centric queries still work", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Setup using existing agent-centric approach
      const lynnPersonResult = await createPerson(
        lynn.cells[0],
        samplePerson({ name: "Lynn Cooper" }),
      );

      await storePrivateData(lynn.cells[0], samplePrivateData());

      // Test that existing agent-centric queries still work
      const lynnProfile = await getPersonProfile(
        lynn.cells[0],
        lynn.cells[0].cellId[1],
      );
      assert.isNotNull(lynnProfile.person);
      assert.equal(lynnProfile.person!.name, "Lynn Cooper");

      // Test person-centric queries work too
      const lynnPersonData = await lynn.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_agent_person",
        payload: lynn.cells[0].cellId[1],
      });

      assert.isNotNull(lynnPersonData);
    },
  );
});

test("Cross-zome compatibility during migration", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Setup person with role using existing patterns
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn Cooper" }));
      await storePrivateData(lynn.cells[0], samplePrivateData());
      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.cells[0].cellId[1], {
          role_name: "Accountable Agent",
        }),
      );

      // Test resource zome integration still works
      const hasCapability = await hasRoleCapability(
        lynn.cells[0],
        lynn.cells[0].cellId[1],
        "Accountable Agent",
      );
      assert.isTrue(hasCapability);

      // Test governance zome integration still works
      const capabilityLevel = await getCapabilityLevel(lynn.cells[0]);
      assert.equal(capabilityLevel, "coordination");

      // Test new person-centric queries give same results
      const personLevel = await lynn.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_person_capability_level",
        payload: lynn.cells[0].cellId[1],
      });

      assert.equal(capabilityLevel, personLevel);
    },
  );
});
```

### **Updated Test Helpers (common.ts)**

```typescript
// ✅ NEW: person-centric test helpers
export async function setupPersonWithMultipleDevices(
  scenario: Scenario,
  personData: PersonInput,
  deviceCount: number = 3,
): Promise<{ personHash: ActionHash; devices: CallableCell[] }> {
  // Create primary device agent
  const primaryAgent = scenario.conductor[0].player;

  // Create person
  const personResult = await createPerson(primaryAgent.cells[0], personData);
  const personHash = personResult.signed_action.hashed.hash;

  // Store private data
  await storePrivateData(primaryAgent.cells[0], samplePrivateData());

  // Register additional devices
  const devices = [primaryAgent.cells[0]];
  for (let i = 1; i < deviceCount; i++) {
    const deviceAgent = scenario.conductor[i].player;
    await registerDeviceForPerson(
      deviceAgent.cells[0],
      personHash,
      `Device ${i + 1}`,
      "mobile",
    );
    devices.push(deviceAgent.cells[0]);
  }

  return { personHash, devices };
}

export async function registerDeviceForPerson(
  cell: CallableCell,
  personHash: ActionHash,
  deviceName: string,
  deviceType: string,
): Promise<void> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "register_device_for_person",
    payload: {
      person_hash: personHash,
      device_name: deviceName,
      device_type: deviceType,
    },
  });
}

export async function getAgentPerson(
  cell: CallableCell,
  agentPubKey: AgentPubKey,
): Promise<any> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_agent_person",
    payload: agentPubKey,
  });
}

export async function getPersonAgents(
  cell: CallableCell,
  personHash: ActionHash,
): Promise<AgentPubKey[]> {
  return cell.callZome({
    zome_name: "zome_person",
    fn_name: "get_person_agents",
    payload: personHash,
  });
}
```

## Documentation Updates

### **Files to Update**

1. `documentation/zomes/person_zome.md` - Main person zome documentation
2. `documentation/specifications/specifications.md` - Technical specifications
3. `documentation/ARCHITECTURE_COMPONENTS.md` - Architecture overview
4. `CLAUDE.md` - Development instructions
5. `documentation/TEST_COMMANDS.md` - Testing documentation

### **Updated Documentation Structure**

#### **person_zome.md - Key Sections to Update**

```markdown
## Architecture Overview

### Agent-Person Relationship Model
```

Agent 1 (Mobile) ──┐
Agent 2 (Laptop) ──┼──→ Person Identity ──→ Private Data
Agent 3 (Tablet) ──┘ └──→ Roles & Capabilities

```

### Key Concepts

- **Agent**: A device or session that can access a person's identity
- **Person**: The persistent identity that owns data, roles, and capabilities
- **Multi-Device Support**: Single person can have multiple agent devices
- **Cross-Device Access**: Data and roles accessible from any authorized device

## Updated API Functions

### Agent-Person Management

#### `register_device_for_person(input: RegisterDeviceInput) -> ExternResult<()>`
Registers a new device/agent for an existing person.

#### `get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Option<Person>>`
Gets the person associated with a specific agent/device.

#### `get_person_agents(person_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>>`
Lists all agents/devices registered for a person.

### Migration Notes

**Backward Compatibility**: All existing agent-centric functions remain supported during migration period.

**Migration Path**:
1. New functions added alongside existing ones
2. Gradual migration of queries to person-centric approach
3. Legacy functions deprecated but maintained for compatibility
```

#### **TEST_COMMANDS.md - Updates**

````markdown
# Testing Infrastructure

## Test Categories

### 1. Foundation Tests

- Basic function validation
- Person creation and management
- Private data handling

### 2. Integration Tests

- Cross-functionality testing
- Multi-device scenarios
- Role and capability management

### 3. Scenario Tests

- Complete user workflows
- Multi-agent interactions
- Real-world usage patterns ✅ **All currently passing**

### 4. Multi-Device Tests (NEW)

- Device registration and management
- Cross-device data access
- Device revocation scenarios

### 5. Backward Compatibility Tests (NEW)

- Legacy function support
- Migration validation
- Cross-zome integration stability

## Test Execution

```bash
# Run all person zome tests
bun run tests tests/src/nondominium/person/

# Run specific test categories
bun run tests tests/src/nondominium/person/person-scenario-tests.test.ts
bun run tests tests/src/nondominium/person/person-multi-device-tests.test.ts
bun run tests tests/src/nondominium/person/person-backward-compatibility-tests.test.ts
```
````

```

## Migration Strategy

### **Phase 1: Core Implementation (Week 1)**
- [ ] Implement simplified link management functions
- [ ] Add Agent-Person relationship management
- [ ] Update private data functions to be Person-centric
- [ ] Create new helper functions

### **Phase 2: Cross-Zome Integration (Week 2)**
- [ ] Update resource zome integration points
- [ ] Update governance zome integration points
- [ ] Ensure all existing function signatures remain unchanged
- [ ] Add new Person-centric function variants

### **Phase 3: Multi-Device Features (Week 3)**
- [ ] Implement device registration functions
- [ ] Add session management capabilities
- [ ] Create person-agent lookup utilities
- [ ] Test multi-device scenarios

### **Phase 4: Testing & Documentation (Week 4-5)**
- [ ] Create comprehensive multi-device test suite
- [ ] Add backward compatibility tests
- [ ] Update all documentation
- [ ] Validate cross-zome integration

### **Phase 5: Cleanup & Optimization (Week 6)**
- [ ] Remove redundant link creation patterns
- [ ] Clean up test workarounds from production code
- [ ] Optimize DHT query patterns
- [ ] Performance benchmarking

## Risk Mitigation

### **Backward Compatibility Guarantees**
- All existing function signatures preserved
- Existing link patterns continue to work
- Migration helpers support both old and new patterns
- Cross-zome integration remains stable

### **Testing Safety Net**
- Current 4/4 scenario tests must continue passing
- New test suite validates multi-device functionality
- Backward compatibility tests prevent regressions
- Cross-zome integration tests ensure compatibility

### **Rollback Strategy**
- Changes implemented incrementally
- Each phase can be independently rolled back
- Legacy functions maintained until migration complete
- Comprehensive test coverage ensures rapid issue detection

## Expected Outcomes

### **Immediate Benefits**
- Reduced code complexity by ~60%
- Improved DHT performance (fewer link queries)
- Enhanced multi-device support
- Better real-world identity modeling

### **Long-term Benefits**
- Future-proof architecture for shared/personal devices
- Simplified maintenance and debugging
- Enhanced privacy and security controls
- Better alignment with Holochain principles

### **Quality Metrics**
- Maintain 100% test coverage
- Zero breaking changes to existing APIs
- Improved performance benchmarks
- Enhanced documentation clarity

## Success Criteria

### **Technical Success**
- [ ] All existing tests continue to pass (4/4 scenario tests)
- [ ] New multi-device test suite passes
- [ ] Cross-zome integration unchanged
- [ ] Performance improvements measurable

### **User Experience Success**
- [ ] Seamless multi-device access to person data
- [ ] Simple device registration process
- [ ] Consistent experience across all devices
- [ ] No disruption to existing workflows

### **Development Success**
- [ ] Simplified codebase easier to maintain
- [ ] Clear documentation for new architecture
- [ ] Comprehensive test coverage
- [ ] Easy onboarding for new developers

This comprehensive plan ensures a safe, well-tested migration to Person-centric architecture while maintaining all existing functionality and adding powerful new capabilities for multi-device scenarios.

**Next Steps**: Begin Phase 1 implementation with core Person-centric link management functions.
```
