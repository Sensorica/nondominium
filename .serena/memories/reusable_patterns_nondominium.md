# Reusable Patterns - Nondominium Holochain Development

## Entry Creation Pattern
```rust
// Standard pattern for all entry types
let entry = EntryType {
    field: value,
    agent_pub_key: agent_info.agent_initial_pubkey,
    created_at: sys_time()?,
};
let hash = create_entry(EntryTypes::EntryType(entry.clone()))?;

// Create discovery anchor links
let path = Path::from("anchor_name");
create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::AnchorType, LinkTag::new("tag"))?;
```

## Function Naming Conventions
- `create_[entry_type]`: Creates new entries with anchor links
- `get_[entry_type]`: Retrieves entries by hash
- `get_all_[entry_type]`: Discovery via anchor traversal
- `update_[entry_type]`: Updates existing entries
- `delete_[entry_type]`: Soft deletion marking

## Privacy Model Implementation
- Public Data: Entry types with discoverable information (e.g., Person)
- Private Data: Encrypted entries with PII (e.g., EncryptedProfile)
- Access Control: Role-based capabilities linked through validation metadata

## Testing Structure
1. **Foundation Tests**: Basic zome function calls and connectivity
   - File pattern: `*-foundation-tests.test.ts`
   - Purpose: Verify basic zome functionality

2. **Integration Tests**: Cross-zome interactions and multi-agent scenarios
   - File pattern: `*-integration-tests.test.ts`
   - Purpose: Test interactions between components

3. **Scenario Tests**: Complete user journeys and workflows
   - File pattern: `*-scenario-tests.test.ts`
   - Purpose: End-to-end workflow validation

4. **Performance Tests**: Load and stress testing
   - File pattern: `*-performance-tests.test.ts`
   - Purpose: System performance validation

## Link Types Pattern
```rust
#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum LinkTypes {
    // Discovery anchors
    All[EntryType]s,

    // Hierarchical relationships
    [Parent]To[Child],

    // Agent-centric patterns
    AgentToOwned[Type],
    AgentToManaged[Type],

    // Query optimization
    [Type]By[Attribute],

    // Update tracking
    [EntryType]Updates,
}
```

## Validation Pattern
```rust
fn validate_create_[entry_type](
    entry: &[EntryType],
    author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // 1. Validate required fields
    if entry.required_field.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid("Field cannot be empty".to_string()));
    }

    // 2. Validate field constraints
    if entry.field.len() > MAX_LENGTH {
        return Ok(ValidateCallbackResult::Invalid("Field too long".to_string()));
    }

    // 3. Validate author matches
    if entry.created_by != *author {
        return Ok(ValidateCallbackResult::Invalid(
            "Entry can only be created by the action author".to_string(),
        ));
    }

    Ok(ValidateCallbackResult::Valid)
}
```

## Development Commands
```bash
nix develop              # Enter reproducible environment (REQUIRED)
bun install              # Install dependencies

# Development
bun run start            # Start 2-agent development network
AGENTS=3 bun run network # Custom agent network

# Testing
bun run tests            # Full test suite
bun run test:foundation  # Basic connectivity tests
bun run test:integration # Multi-agent tests
bun run test:scenarios   # Workflow simulations

# Build
bun run build:zomes      # Compile Rust to WASM
bun run build:happ       # Package DNA
bun run package          # Create .webhapp distribution
```

## Debugging in Rust Zomes
Use the `warn!` macro for debugging output visible in tests:
```rust
warn!("Debug info: variable = {:?}", some_variable);
warn!("Checkpoint reached in function_name");
warn!("Processing entry: {}", entry_hash);
```

## Project Structure
```
dnas/nondominium/
├── zomes/
│   ├── integrity/          # Entry definitions and validation
│   │   ├── zome_person/
│   │   ├── zome_resource/
│   │   └── zome_gouvernance/
│   └── coordinator/        # Business logic and external API
│       ├── zome_person/
│       ├── zome_resource/
│       └── zome_gouvernance/
tests/src/nondominium/      # Test suites
ui/                         # Svelte frontend
documentation/              # Project docs
```

## ValueFlows Integration
- EconomicResource: Actual resource instances
- EconomicEvent: Resource state changes
- Commitment: Agreements between agents
- ResourceSpecification: Templates for resources

## Key Principles
1. **Agent-Centric**: All data tied to individual agents
2. **Capability-Based Security**: Role-based access tokens
3. **ValueFlows Compliance**: Standard economic ontology
4. **Embedded Governance**: Rules within resources themselves
5. **Privacy by Design**: Public/private data separation