---
name: Holochain Development
description: Interactive guidance for Holochain hApp development with integrity-first architecture, best practices, and project-specific patterns for nondominium
---

# Holochain Development

## Instructions

This skill provides comprehensive interactive guidance for Holochain development, focusing on proper integrity-first architecture, best practices, and patterns specific to the nondominium ValueFlows implementation.

## Capabilities

### 🏗️ Architecture & Design Guidance

- **Integrity-First Development**: Proper workflow (Integrity zome → Coordinator zome)
- **Zome Separation Strategy**: How to split functionality across zomes
- **Data Modeling**: Entry types, link types, and validation design
- **Cross-Zome Communication**: Coordinator-to-coordinator interaction patterns
- **ValueFlows Integration**: EconomicResource, EconomicEvent, and Commitment patterns

### 📐 Integrity Zome Development

- **Entry Type Definition**: Struct design with proper validation
- **Link Type Design**: Relationship modeling and validation rules
- **Validation Functions**: validate_entry, validate_link, validate_open_chain
- **Schema Definition**: Complete data structures and constraints
- **Business Invariants**: Rules that must always hold true

### 🎯 Coordinator Zome Development

- **CRUD Operations**: create*\*, get*_, update\__, delete\_\* functions
- **Business Logic**: Complex workflows and orchestration
- **Query Functions**: Data retrieval and filtering patterns
- **Agent Operations**: Agent-specific functionality and permissions
- **Cross-Zome Calls**: Inter-zome communication patterns

### 🔧 Project-Specific Patterns (nondominium)

- **Person Management**: Agent identity, roles, private data sharing (PPR)
- **Resource Lifecycle**: EconomicResource with embedded governance rules
- **Governance Workflows**: Commitments, claims, economic events
- **Capability System**: Role-based access control and permissions
- **ValueFlows Compliance**: Economic event tracking and resource management

### 📚 Holochain Best Practices

- **Integrity-First Architecture**: Why validation belongs in integrity zomes
- **Error Handling**: Proper error patterns and recovery strategies
- **Performance Optimization**: Efficient DHT operations and validation
- **Security Patterns**: Capability-based access control implementation
- **Testing Strategy**: When and how to test different components

## How to Use

### 🤔 Interactive Development Guidance

**Start a new feature**:
"I want to add resource proposal functionality"

**Add a new entry type**:
"Create a ResourceProposal entry type with validation"

**Design a workflow**:
"Guide me through implementing a resource approval workflow"

**Debug an issue**:
"Help me debug this cross-zome communication problem"

**Learn a concept**:
"Explain when to use validate_entry vs validate_link"

### 🎯 Code Generation Patterns

**Integrity Zome Patterns**:
"Generate integrity entry type for ResourceRequest with validation"

"Create validation function for economic events"

"Design link types for person-resource relationships"

**Coordinator Zome Patterns**:
"Generate CRUD functions for ResourceProposal"

"Create business logic for resource approval workflow"

"Implement cross-zome call to person zome for validation"

**Project-Specific Patterns**:
"Generate PPR (Private data, Purpose, Rights) validation pattern"

"Create capability token generation for role assignment"

"Implement ValueFlows economic event creation"

## Examples

### Architecture Planning

```
User: "I want to add a bidding system for resources"

Skill: Let me guide you through integrity-first development:

1. **Integrity Zome First**: Define the data structure
   - ResourceBid entry type (bidder, amount, resource_hash, timestamp)
   - Validation rules (positive amounts, valid resource references)
   - Link types (resource → bids, bidder → bids)

2. **Coordinator Zome Second**: Implement business logic
   - create_bid() function with integrity validation
   - get_bids_for_resource() query function
   - accept_bid() workflow with validation

Would you like me to generate the complete integrity entry type first?
```

### Code Generation

```
User: "Generate a ResourceRequest integrity entry type"

Skill: I'll create a complete integrity entry type following nondominium patterns:

[Generates complete Rust code with proper struct, validation, EntryTypes enum integration]

Should I also generate the corresponding coordinator CRUD functions?
```

### Debugging Help

```
User: "My cross-zome call from resource to person zome is failing"

Skill: Let me help you debug this:

1. Check external zome call syntax in your coordinator zome
2. Verify the target function exists and is properly exposed
3. Validate the parameters match the expected signature
4. Check if both zomes are in the same DNA

Can you show me the exact error message and the code you're using?
```

## Scripts

- **pattern_generator.py**: Generates code patterns for integrity and coordinator zomes
- **architecture_analyzer.py**: Analyzes existing zome structure and suggests improvements
- **validation_helper.py**: Creates validation functions following best practices
- **cross_zome_mapper.py**: Designs cross-zome communication patterns

## Templates

- **integrity_zome_template.rs**: Complete integrity zome structure
- **coordinator_zome_template.rs**: Complete coordinator zome structure
- **entry_type_template.rs**: Entry type with validation template
- **workflow_template.rs**: Business workflow implementation template

## Best Practices

### Integrity Zome Guidelines

1. **All validation logic lives in integrity zomes**
2. **Never put business logic in validation functions**
3. **Keep validation functions pure and deterministic**
4. **Validate all constraints and business invariants**
5. **Use proper error types and error handling**

### Coordinator Zome Guidelines

1. **All business logic lives in coordinator zomes**
2. **Never bypass integrity validation**
3. **Handle all user interactions and permissions**
4. **Implement proper error recovery**
5. **Orchestrate complex workflows using integrity-validated data**

### Cross-Zome Communication

1. **Coordinator zomes call other coordinator zomes**
2. **Never call integrity zomes externally**
3. **Handle cross-zome errors gracefully**
4. **Validate external data before using**
5. **Implement proper fallback strategies**

## Project Integration

This skill is specifically tailored for the nondominium project:

- Uses your existing zome structure (person, resource, governance)
- Follows your ValueFlows implementation patterns
- Incorporates your PPR (Private data, Purpose, Rights) system
- Respects your capability-based access control
- Aligns with your 4-layer testing strategy

## Examples

### Creating a New Zome Entry Type

```
User: "I want to add ResourceProposal functionality to the governance zome"

Skill: I'll guide you through integrity-first development:

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

### Cross-Zome Communication

```
User: "Show me how to call person zome from resource zome"

Skill: Here's the proper cross-zome communication pattern:

[Generates complete call_ function with error handling and response parsing]

Key points:
- Coordinator-to-coordinator calls only
- Proper error handling for network failures
- Response validation before using external data
```

### Debugging Validation Issues

```
User: "My integrity zome validation is failing"

Skill: Let me help debug this systematically:

1. **Check validation function signatures**
2. **Verify data types match EntryTypes enum**
3. **Ensure all required fields are present**
4. **Validate business rule constraints**

Can you share the specific validation error you're seeing?
```

## Limitations

- Focuses on coordinator/integrity zome patterns (not DNA-level concerns)
- Assumes basic Holochain development knowledge
- Tailored to Rust HDK patterns
- Optimized for nondominium project structure
