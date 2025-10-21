# Holochain Development Skill for nondominium

## Overview

This skill provides interactive guidance for Holochain development with integrity-first architecture, specifically tailored for the nondominium ValueFlows-compliant resource sharing application.

## Key Features

### 🏗️ Integrity-First Architecture

- **Proper Zome Development**: Integrity zome → Coordinator zome workflow
- **Data Modeling**: Entry types, link types, and validation design
- **Validation Patterns**: Comprehensive validation function templates
- **Cross-Zome Communication**: Coordinator-to-coordinator interaction patterns

### 🎯 Project-Specific Patterns

- **Person Zome**: Agent identity, roles, private data, PPR system
- **Resource Zome**: EconomicResource lifecycle, governance rules, transfers
- **Governance Zome**: Commitments, claims, economic events, PPR validation
- **ValueFlows Compliance**: Economic event tracking and resource management

### 📚 Interactive Development Guidance

- **Architecture Planning**: Step-by-step zome design decisions
- **Code Generation**: Template-based code creation
- **Pattern Library**: Reusable patterns for common operations
- **Best Practices**: Holochain development standards and conventions

## How to Use

### Basic Usage

Ask Claude questions like:

- "Help me create a new ResourceRequest entry type"
- "Show me the integrity → coordinator development pattern"
- "Generate cross-zome call between person and resource zomes"
- "Debug this integrity zome validation issue"
- "Explain when to use validate_entry vs validate_link"

### Code Generation Examples

**Integrity Entry Type**:

```
User: "Create integrity entry for ResourceProposal with validation"

Skill: I'll generate a complete integrity entry type following nondominium patterns:

[Generates complete Rust code with proper struct, validation, EntryTypes integration]
```

**Coordinator Functions**:

```
User: "Generate CRUD functions for ResourceProposal coordinator zome"

Skill: I'll create the business logic functions using integrity validation:

[Generates create_, get_, update_, delete_ functions with proper error handling]
```

**Cross-Zome Communication**:

```
User: "Show me how to call person zome from resource zome"

Skill: Here's the proper cross-zome communication pattern:

[Generates complete call_ function with error handling and response parsing]
```

## Templates

### Available Templates

1. **integrity_zome_template.rs**: Complete integrity zome structure
2. **coordinator_zome_template.rs**: Complete coordinator zome structure
3. **validation_patterns.rs**: Common validation function patterns
4. **cross_zome_patterns.rs**: Cross-zome communication patterns

### Template Usage

Templates are designed as reference examples that you can adapt:

```rust
// Copy from validation_patterns.rs
pub fn validate_positive_number(value: f64, field_name: &str) -> Result<(), String> {
    if value <= 0.0 {
        return Err(format!("{} must be positive", field_name));
    }
    // ... rest of validation
}
```

## Development Workflow

### Step 1: Architecture Planning

```
User: "I want to add ResourceProposal functionality"

Skill: Let me guide you through integrity-first development:

1. **Integrity Zome First**: Define the data structure
   - ResourceProposal entry type (title, description, resource_hash, status)
   - Validation rules (title not empty, valid resource reference, status validation)
   - Link types (resource → proposals, proposer → proposals)

2. **Coordinator Zome Second**: Implement business logic
   - create_proposal() function with integrity validation
   - get_proposals_for_resource() query function
   - update_proposal_status() workflow with validation

Would you like me to generate the complete integrity entry type first?
```

### Step 2: Implementation

```
User: "Yes, generate the integrity entry type"

Skill: I'll create a complete integrity entry type following nondominium patterns:

[Generates complete Rust code with proper struct, validation, EntryTypes integration]

Should I also generate the corresponding coordinator CRUD functions?
```

### Step 3: Testing Integration

```
User: "How should I test this new functionality?"

Skill: I recommend the testing approach:

1. **Foundation Tests**: Test basic CRUD operations
2. **Integration Tests**: Test cross-zome interactions
3. **Scenario Tests**: Test complete user workflows

Would you like me to use the Holochain Testing Skill to generate appropriate tests?
```

## Architecture Principles

### Integrity-First Development

1. **Integrity Zomes Define What**: Data structures, validation rules, invariants
2. **Coordinator Zomes Define How**: Business logic, workflows, user interactions
3. **Never Bypass Validation**: All data must pass integrity validation
4. **Clear Separation**: Validation in integrity, business logic in coordinator

### ValueFlows Integration

1. **EconomicResource**: Resources with embedded governance rules
2. **EconomicEvent**: Changes to resource state and flows
3. **Commitment**: Economic agreements between agents
4. **PPR System**: Private data sharing with purpose and rights

### Cross-Zome Communication

1. **Coordinator to Coordinator**: Only coordinator zomes call each other
2. **External Zome Calls**: Use `call()` function with proper error handling
3. **Data Validation**: Always validate external data before using
4. **Error Recovery**: Handle cross-zone errors gracefully

## Common Patterns

### Entry Creation Pattern

```rust
// Standard entry creation in coordinator zomes
pub fn create_entry_type(input: CreateEntryTypeInput) -> ExternResult<ActionHash> {
    let agent_info = agent_info()?;

    let entry = EntryType {
        // Map input to entry fields
        created_at: sys_time()?,
        agent_pub_key: agent_info.agent_initial_pubkey,
        // ... other fields
    };

    let hash = create_entry(EntryTypes::EntryType(entry.clone()))?;

    // Create anchor links for discoverability
    let path = Path::from("entry_type");
    create_link(path.path_entry_hash()?, hash.clone(),
                LinkTypes::Anchor, LinkTag::new("entry_type"))?;

    Ok(hash)
}
```

### Validation Pattern

```rust
// Standard validation in integrity zomes
pub fn validate_entry_type(entry: EntryType) -> Result<(), String> {
    // Basic field validation
    if entry.title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }

    // Business rule validation
    // ... additional validation logic

    Ok(())
}
```

### Cross-Zome Call Pattern

```rust
// Standard cross-zome communication
pub fn call_person_zome(agent_pub_key: AgentPubKey) -> ExternResult<Option<Value>> {
    let response = call(
        None, // target zome (local DNA)
        "person", // target coordinator zome
        "get_person_profile", // target function
        None, // cap grant
        agent_pub_key, // parameters
    )?;

    match response {
        ZomeCallResponse::Ok(result) => {
            let profile: Option<Value> = serde_json::from_str(&result)?;
            Ok(profile)
        },
        ZomeCallResponse::NetworkError(err) => {
            Err(WasmError::Guest(format!("Network error: {:?}", err)))
        },
        ZomeCallResponse::CountersigningSession(_, _) => {
            Err(WasmError::Guest("Unexpected countersigning response".to_string()))
        },
    }
}
```

## Debugging Support

### Common Issues and Solutions

1. **Entry Validation Errors**
   - Check integrity validation functions
   - Verify data types and formats
   - Ensure all required fields are provided

2. **Cross-Zome Call Failures**
   - Verify target zome and function names
   - Check parameter types and formats
   - Ensure proper error handling

3. **Link Creation Issues**
   - Verify link types are defined
   - Check base and target hash validity
   - Ensure proper tag formatting

### Debug Questions

Ask Claude for help with:

- "Debug this integrity zome validation error"
- "Why is my cross-zome call failing?"
- "Help me understand this compilation error"
- "Validate my zome architecture design"

## Integration with Holochain Testing Skill

This skill works seamlessly with the Holochain Testing Skill:

1. **Development Phase**: Use Holochain Development Skill for architecture and implementation
2. **Testing Phase**: Use Holochain Testing Skill for test creation and execution
3. **Debug Phase**: Use both skills for comprehensive troubleshooting

Example workflow:

```
User: "Create ResourceProposal functionality with tests"

Skill: I'll help you implement ResourceProposal with comprehensive testing:

1. **Architecture Design** (Holochain Development Skill)
   - Integrity entry type with validation
   - Coordinator functions with business logic
   - Cross-zome integration patterns

2. **Test Generation** (Holochain Testing Skill)
   - Foundation tests for basic CRUD
   - Integration tests for cross-zome scenarios
   - Scenario tests for complete workflows

3. **Command Guidance** (Holochain Testing Skill)
   - Exact test commands to run
   - Multi-agent test setup
   - Debug support for test failures
```

## Best Practices

### For nondominium Project

1. **Follow Existing Patterns**: Use person/resource/governance zome patterns as examples
2. **ValueFlows Compliance**: Ensure all economic events follow ValueFlows standards
3. **PPR Integration**: Include private data sharing patterns where appropriate
4. **Test Coverage**: Test all layers (foundation, integration, scenario)
5. **Error Handling**: Implement comprehensive error recovery patterns

### General Holochain Development

1. **Integrity First**: Always design integrity zomes before coordinator zomes
2. **Validation First**: Put all validation logic in integrity zomes
3. **Business Logic Second**: Keep business logic in coordinator zomes
4. **Cross-Zone Communication**: Use proper cross-zome call patterns
5. **Testing Strategy**: Test at multiple levels with realistic scenarios

## Limitations

- Assumes basic Holochain development knowledge
- Optimized for Rust HDK and coordinator/integrity patterns
- Tailored to nondominium project structure
- Focuses on application-level development (not DNA-level concerns)

## Future Enhancements

Planned additions include:

1. **More Templates**: Additional templates for common patterns
2. **Validation Library**: Extended validation function library
3. **Performance Patterns**: Templates for optimizing DHT operations
4. **Security Patterns**: Enhanced security and cryptography examples
5. **Migration Patterns**: Templates for upgrading existing code

---

This skill is designed to evolve with your nondominium project and provide increasingly sophisticated guidance as your development needs grow.
