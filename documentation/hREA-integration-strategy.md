# hREA Integration Strategy for Nondominium

## Executive Summary

This document outlines the comprehensive integration strategy for incorporating hREA (Holochain Regenerative Economics Architecture) into Nondominium's architecture. The approach positions hREA as a backend engine while maintaining Nondominium's specialized focus on persons, resources, and governance through its Private Participation Receipt (PPR) system.

**Key Decision**: Use git submodule + cross-DNA calls to bypass GraphQL API and maintain economic logic directly in Rust/Holochain backend.

## Architecture Vision

### Strategic Positioning

```
┌─────────────────────────────────────────────────────────────┐
│                    TrueCommon                                │
│  (Broader application using Nondominium as core engine)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Nondominium                                │
│           (Specialized Engine - 3 Zomes)                    │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   Person        │    Resource     │   Governance    │    │
│  │   Management    │   Lifecycle     │   + PPR System  │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
│                      │  Cross-DNA Calls                      │
└─────────────────────▼───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                     hREA                                    │
│        (Standard ValueFlows Implementation)                  │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   ReaAgent      │ EconomicResource│  ReaCommitment  │    │
│  │   (Enhanced)    │   (Enhanced)    │   (Enhanced)    │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Integration Benefits

1. **Immediate ValueFlows Compliance**: Standard-compliant economic data structures
2. **Proven Implementation**: Battle-tested economic coordination patterns
3. **Interoperability**: Direct compatibility with hREA ecosystem
4. **Separation of Concerns**: Clean architectural boundaries
5. **Contribution Path**: Clear pathway to contribute back to hREA

## Integration Approach

### Phase 1: Person Zome Pilot (Starting Point)

**Why Person Zome First?**
- Self-contained with minimal dependencies
- Tests cross-DNA calls without complex business logic
- Immediate value - agents are foundational to all hREA functionality
- Natural place to demonstrate private data innovations

#### Implementation Pattern

```rust
// Nondominium Person Zome Architecture
pub struct NondominiumPerson {
    // Core: HreaAgent via hREA bridge calls
    pub hrea_agent_hash: ActionHash,

    // Extensions: Private data and capabilities
    pub encrypted_profile_hash: Option<ActionHash>,
    pub capability_assignments: Vec<CapabilityAssignment>,
    pub governance_context: GovernanceContext,
}
```

#### Bridge Functions

```rust
// Core bridge functions for Person integration
#[hdk_extern]
pub fn create_person_with_private_data(
    person_data: CreatePersonData,
    private_data: Option<EncryptedProfileData>
) -> ExternResult<PersonRecord> {
    // 1. Create HreaAgent in hREA DNA
    let hrea_agent = call_remote(
        hrea_dna_id,
        "hrea",
        "create_rea_agent",
        convert_to_hrea_agent(person_data)
    )?;

    // 2. Create EncryptedProfile (private entry)
    let private_hash = if let Some(private) = private_data {
        Some(create_entry(&EntryTypes::EncryptedProfile(private))?)
    } else { None };

    // 3. Create cross-reference links
    let person_record = PersonRecord {
        hrea_agent_hash: hrea_agent.signed_action.hashed.hash,
        encrypted_profile_hash: private_hash,
        created_at: sys_time()?,
    };

    Ok(person_record)
}
```

### Phase 2: Resource Lifecycle Integration

Extend the pattern to resource management with enhanced hREA `ReaEconomicResource` entries.

### Phase 3: Governance Integration

Integrate Nondominium's PPR system with hREA's commitment and agreement structures.

## Technical Implementation

### Git Submodule Strategy

```bash
# Setup development environment
git submodule add https://github.com/h-REA/hREA.git vendor/hrea
cd vendor/hrea
git checkout latest-stable  # Pin to stable version

# Build process
bun run build:zomes      # Build Nondominium zomes
cd vendor/hrea && npm run build  # Build hREA zomes
bun run build:happ       # Package Nondominium DNA
```

#### Workspace Structure

```toml
# Cargo.toml workspace configuration
[workspace]
members = [
    "dnas/*/zomes/coordinator/*",
    "dnas/*/zomes/integrity/*",
    "vendor/hrea/dnas/*/zomes/coordinator/*",
    "vendor/hrea/dnas/*/zomes/integrity/*"
]

[workspace.dependencies]
hrea = { path = "vendor/hrea/dnas/hrea/zomes/coordinator/hrea" }
hrea_integrity = { path = "vendor/hrea/dnas/hrea/zomes/integrity/hrea" }
```

### Cross-DNA Call Architecture

#### Bridge Calls (Same hApp, Different DNAs)

```rust
// Recommended bridge call pattern
pub fn call_hrea<R, S>(
    zome_name: &str,
    function_name: &str,
    payload: S
) -> ExternResult<R>
where
    R: serde::de::DeserializeOwned + std::fmt::Debug,
    S: serde::Serialize,
{
    let hrea_cell_id = get_hrea_cell_id()?;

    call(
        CallTargetCell::Other(hrea_cell_id),
        zome_name.to_string(),
        function_name.to_string(),
        None, // Capability managed at integration layer
        payload
    )
}
```

#### Capability Management

```rust
// Cross-DNA capability pattern
pub fn create_hrea_capability_grant(
    assignee: AgentPubKey,
    functions: Vec<GrantedFunction>
) -> ExternResult<CapabilityGrant> {
    let grant = CapabilityGrant {
        tag: "nondominium-hrea-integration".to_string(),
        access: CapAccess::Assigned {
            assignees: vec![assignee],
            secret: generate_cap_secret(),
        },
        functions: GrantedFunctions::Listed(functions),
    };

    create_capability_grant(grant)
}
```

### Data Model Alignment

#### Person/Agent Integration

```rust
// Current Nondominium Person → hREA ReaAgent mapping
impl From<NondominiumPerson> for ReaAgent {
    fn from(person: NondominiumPerson) -> Self {
        ReaAgent {
            id: None,
            name: person.name,
            agent_type: "Person".to_string(), // hREA standard
            image: person.avatar_url,
            classified_as: person.roles,
            note: None, // Keep public notes minimal
        }
    }
}
```

#### Private Data Extension

```rust
// Complementary private data architecture
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
enum EntryTypes {
    // hREA-compatible public agent
    #[entry_type]
    ReaAgent(ReaAgent),

    // Nondominium private profile extension
    #[entry_type(visibility = "private")]
    EncryptedProfile(EncryptedProfileData),

    // Cross-reference link
    #[entry_type]
    AgentProfileLink(AgentProfileLink),
}

#[derive(Clone, PartialEq, Debug)]
pub struct EncryptedProfileData {
    pub agent_pub_key: AgentPubKey,
    pub encrypted_pii: Vec<u8>,
    pub encryption_metadata: EncryptionMetadata,
    pub created_at: Timestamp,
}
```

## Privacy Architecture

### hREA Privacy Analysis

**Key Finding**: hREA has minimal privacy implementation - relies entirely on Holochain's base privacy model.

- **No custom privacy layers**: All economic data is public by design
- **Agent data is public**: `ReaAgent` entries contain no private information
- **Economic transparency**: Prioritizes economic coordination over privacy

### Nondominium Privacy Enhancement

**Opportunity**: Nondominium's `EncryptedProfile` system perfectly complements hREA:

1. **No architectural conflicts**: hREA doesn't have private agent data
2. **Enhanced capability**: Adds missing privacy layer
3. **Holochain-native**: Uses built-in privacy mechanisms correctly
4. **ValueFlows compatible**: Doesn't interfere with economic flows

### Privacy Strategy

1. **Public Discovery**: Use hREA's `ReaAgent` for network discovery
2. **Private Details**: Store sensitive PII in `EncryptedProfile` private entries
3. **Controlled Access**: Use capability-based access for profile data sharing
4. **Separation of Concerns**: Economic data public, personal data private

## Testing Strategy

### Tryorama-Based Dual-DNA Testing

#### Test Architecture

```typescript
// tests/src/multi-dna/hrea-integration.test.ts
describe('Nondominium-hREA Integration', () => {
  let scenario: Scenario;
  let agents: PlayerApp[];

  beforeAll(async () => {
    scenario = await runScenario(async (s) => {
      // Setup dual-DNA environment
      const nondominiumConfig = {
        appBundleSource: { type: "path", value: "workdir/nondominium.happ" },
        options: { networkSeed: "integration_test" }
      };

      const hreaConfig = {
        appBundleSource: { type: "path", value: "workdir/hrea.happ" },
        options: { networkSeed: "integration_test" }
      };

      return await s.addPlayersWithApps([nondominiumConfig, hreaConfig]);
    });
  });

  test('Person creation cross-DNA integration', async () => {
    // 1. Create person via Nondominium interface
    const personResult = await agents[0].appWs.callZome({
      role_name: "person",
      zome_name: "person",
      fn_name: "create_person_with_private_data",
      payload: {
        name: "Alice Smith",
        privateData: { email: "alice@example.com", phone: "555-1234" }
      }
    });

    // 2. Verify HreaAgent created in hREA DNA
    const hreaAgent = await agents[0].appWs.callZome({
      role_name: "planning",
      zome_name: "economic_agent",
      fn_name: "get_agent",
      payload: personResult.hrea_agent_hash
    });

    expect(hreaAgent.name).toBe("Alice Smith");
    expect(hreaAgent.agent_type).toBe("Person");

    // 3. Verify private data is accessible only with capabilities
    const privateProfile = await agents[0].appWs.callZome({
      role_name: "person",
      zome_name: "person",
      fn_name: "get_private_profile",
      payload: personResult.encrypted_profile_hash
    });

    expect(privateProfile.email).toBe("alice@example.com");
  });
});
```

#### Testing Best Practices

1. **DHT Synchronization**: Use `dhtSync` with appropriate timeouts
2. **Retry Logic**: Implement retry patterns for flaky cross-DNA operations
3. **Performance Testing**: Test with multiple agents for scalability
4. **Capability Testing**: Test all grant/usage/revocation scenarios
5. **Submodule Integration**: Verify git submodule dependencies in test setup

#### Helper Utilities

```typescript
// tests/src/helpers/multi-dna-helpers.ts
export class HreaIntegrationTestUtils {
  static async createTestPerson(player: PlayerApp, name: string, privateData?: any) {
    return await player.appWs.callZome({
      role_name: "person",
      zome_name: "person",
      fn_name: "create_person_with_private_data",
      payload: { name, privateData }
    });
  }

  static async verifyCrossDnaSync(player: PlayerApp, personHash: ActionHash) {
    const hreaAgent = await player.appWs.callZome({
      role_name: "planning",
      zome_name: "economic_agent",
      fn_name: "get_agent",
      payload: personHash
    });
    return hreaAgent;
  }

  static async ensureDhtSync(players: PlayerApp[], timeout = 30000) {
    try {
      await dhtSync(players, players[0].cells[0].cell_id[0], {
        timeout,
        pollingInterval: 1000
      });
    } catch (error) {
      console.warn("DHT sync timeout, proceeding with test");
    }
  }
}
```

## Performance Considerations

### Cross-DNA Call Optimization

1. **Batch Operations**: Group multiple hREA operations into single calls
2. **Local Caching**: Cache frequently accessed hREA data
3. **Async Patterns**: Use signals for non-critical updates
4. **Capability Token Reuse**: Cache capability tokens to avoid repeated auth

### Performance Hierarchy (Fastest to Slowest)

1. **Cross-Zome Calls** (Same DNA): ~1ms - in-process
2. **Bridge Calls** (Same hApp): ~5-10ms - local conductor
3. **Remote Calls** (Same DNA): ~100-500ms - network latency
4. **Cross-DNA Auth Calls**: ~200-1000ms - includes auth overhead

## Version Management & Evolution

### Compatibility Strategy

1. **Semantic Versioning**: Track hREA API changes across versions
2. **Adapter Pattern**: Version-specific compatibility layers
3. **Migration Support**: Gradual upgrade paths for breaking changes
4. **Feature Flags**: Enable/disable features based on hREA version compatibility

### Submodule Management

```bash
# Version management workflow
git submodule add https://github.com/h-REA/hREA.git vendor/hrea
cd vendor/hrea
git checkout v0.3.0  # Pin to stable version
cd ../..
git add vendor/hrea
git commit -m "Integrate hREA v0.3.0 as submodule"

# Update process
cd vendor/hrea
git fetch origin
git checkout v0.3.1  # Upgrade to newer version
cd ../..
git add vendor/hrea
git commit -m "Update hREA to v0.3.1"
```

### Integration Layer Architecture

```rust
// compatibility_layer.rs
pub struct HreaCompatibilityManager {
    hrea_version: String,
    supported_functions: HashMap<String, Vec<String>>,
    migration_adapters: HashMap<String, Box<dyn MigrationAdapter>>,
}

impl HreaCompatibilityManager {
    pub fn call_hrea_function<R, S>(
        &self,
        function_name: &str,
        payload: S
    ) -> ExternResult<R> {
        // Check version compatibility
        // Apply migration adapters if needed
        // Execute cross-DNA call
        // Handle response format differences
    }
}
```

## Future Governance Innovation

### PPR System as hREA Enhancement

While maintaining Nondominium's innovations as a separate layer initially, the PPR system could eventually enhance hREA's governance capabilities:

1. **Enhanced Commitment Governance**: Temporal commitment patterns
2. **Capability-Based Access Control**: Role-based resource access
3. **Private Data Management**: Secure PII handling alongside public economic data
4. **Multi-Agent Governance**: Complex decision-making frameworks

### Contribution Pathway

1. **Prove Innovation**: Demonstrate PPR system value in Nondominium
2. **Document Patterns**: Create clear documentation of governance enhancements
3. **Community Engagement**: Present findings to hREA community
4. **Upstream Contribution**: Contribute proven patterns back to hREA

## Implementation Roadmap

### Phase 1: Foundation (Person Zome Integration)
- [ ] Set up git submodule structure
- [ ] Implement Person zome bridge functions
- [ ] Create EncryptedProfile integration
- [ ] Develop comprehensive Tryorama tests
- [ ] Validate cross-DNA capability patterns

### Phase 2: Expansion (Resource Integration)
- [ ] Extend resource lifecycle with hREA integration
- [ ] Implement bi-directional synchronization
- [ ] Add performance optimization layer
- [ ] Create comprehensive resource sharing tests

### Phase 3: Governance Integration
- [ ] Integrate PPR system with hREA commitments
- [ ] Implement governance workflow bridges
- [ ] Develop governance-specific testing scenarios
- [ ] Document governance enhancement patterns

### Phase 4: Production Readiness
- [ ] Performance optimization and monitoring
- [ ] Security audit of cross-DNA interactions
- [ ] Documentation and deployment guides
- [ ] Community engagement and contribution planning

## Risk Assessment & Mitigation

### Technical Risks

1. **Cross-DNA Performance**: Mitigate through caching and batch operations
2. **Version Compatibility**: Manage through adapter patterns and careful versioning
3. **Testing Complexity**: Address through comprehensive Tryorama strategies
4. **Security Surface Area**: Minimize through capability-based security

### Strategic Risks

1. **Dependency Management**: Mitigate through careful submodule management
2. **Community Alignment**: Address through active hREA community engagement
3. **Innovation Timing**: Balance between stability and contribution opportunities

## Conclusion

This integration strategy positions Nondominium as both a user of and contributor to the hREA ecosystem. By using hREA as a backend engine while maintaining specialized governance and privacy innovations, Nondominium can achieve:

- **Immediate ValueFlows Compliance**: Standard-compliant economic coordination
- **Enhanced Privacy**: Complementary private data handling not present in hREA
- **Governance Innovation**: PPR system as potential hREA enhancement
- **Ecosystem Integration**: Direct interoperability with hREA-based applications
- **Contribution Pathway**: Clear path to contribute innovations back to hREA

The git submodule + cross-DNA approach provides the right balance of integration depth and architectural independence, enabling Nondominium to leverage hREA's proven patterns while maintaining its unique value proposition in the regenerative economics ecosystem.

---

*Document Version: 1.0*
*Last Updated: 2025-11-04*
*Status: Implementation Planning*