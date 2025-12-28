# ValueFlows DSL - Technical Specifications

Companion document to [ValueFlows DSL Requirements](../requirements/valueflows-dsl.md)

---

## Table of Contents

1. [Language Syntax and Grammar](#1-language-syntax-and-grammar)
2. [Validation Pipeline](#2-validation-pipeline)
3. [Governance Rule DSL](#3-governance-rule-dsl)
4. [Security Model](#4-security-model)
5. [Performance Optimization](#5-performance-optimization)
6. [Migration and Versioning](#6-migration-and-versioning)
7. [Testing Framework](#7-testing-framework)
8. [CLI Interface Specification](#8-cli-interface-specification)
9. [Parser Architecture](#9-parser-architecture)
10. [Compilation Pipeline](#10-compilation-pipeline)

---

## 1. Language Syntax and Grammar

### 1.1 Language Design Philosophy

The DSL follows a **progressive enhancement** strategy with three tiers:

**Tier 1: Pure Declarative (MVP)**

- Entity definitions with properties
- Static relationships and references
- Template-based bulk operations
- No variables or control flow
- Target: Network administrators bootstrapping networks

**Tier 2: Template-Based Operations (Phase 2)**

- Bulk operations with wildcards (`* 5` syntax)
- Conditional updates with `where` clauses
- Template inheritance and composition
- Basic expression evaluation
- Target: Power users managing dynamic inventories

**Tier 3: Full Scripting (Future)**

- Variables and constants
- Loops and iteration
- Conditionals and branching
- Function definitions
- Target: Developers creating complex automation

### 1.2 Grammar Specification (EBNF-like)

```
<program> ::= <statement>*

<statement> ::= <network_decl>
              | <agents_decl>
              | <resources_decl>
              | <resource_specs_decl>
              | <governance_decl>
              | <recipe_decl>
              | <event_decl>
              | <transaction_decl>

<entity_decl> ::= <identifier> ':' <type> '{' <property_list> '}'

<property_list> ::= <property>*
<property> ::= <identifier> ':' <value>

<value> ::= <string>
          | <number>
          | <boolean>
          | <identifier>  # reference
          | <list>
          | <duration>

<duration> ::= <number> <unit>
<unit> ::= 's' | 'm' | 'h' | 'd' | 'w'
```

### 1.3 Core Language Constructs

#### 1.3.1 Network Declaration

```vf
network <identifier> {
  created: <date>
  jurisdiction: <string>
  [optional properties...]
}
```

**Example**:

```vf
network FabLabMontreal {
  created: 2025-01-15
  jurisdiction: Quebec
}
```

#### 1.3.2 Agent Declaration

```vf
agents {
  organization <name> {
    type: <org_type>
    location: <string>
    [...]
  }

  person <name> {
    roles: [<role>, ...]
    [...]
  }
}
```

**Organization Types**:

- `OpenValueNetwork`
- `Cooperative`
- `NonProfit`
- `ForProfit`
- `Informal`

#### 1.3.3 Resource Specification Declaration

```vf
resource_specifications {
  <spec_name> {
    governance: <governance_model>
    accounting: <accounting_method>
    [...]
  }
}
```

**Governance Models**:

- `commons_stewardship` - Shared resource managed by stewards
- `pool_contribution` - Contributory pooling
- `private_ownership` - Individual or group ownership
- `shared_custody` - Joint custody arrangement

**Accounting Methods**:

- `use_tracking` - Track usage events
- `quantity_consumed` - Track consumed quantities
- `transfer_tracking` - Track transfers
- `none` - No accounting

#### 1.3.4 Resource Declaration

```vf
resources {
  <resource_name> : <specification> {
    custodian: <agent>
    location: <string>
    quantity: <number> <unit>?
    [...]
  }

  # Bulk creation
  <fleet_name> : <specification> * <count> {
    [...]
  }
}
```

#### 1.3.5 Governance Rule Declaration

See [Section 3: Governance Rule DSL](#3-governance-rule-dsl) for complete syntax.

#### 1.3.6 Recipe Declaration

```vf
recipe <name> {
  inputs:
    <resource> <quantity> <unit>? (<action>)
    [...]

  work:
    <work_type> <duration>
    [...]

  outputs:
    <resource> <quantity> <unit>? (<action>)
    [...]
}
```

**Action Types**:

- `consume` - Resource consumed in process
- `use` - Resource used without consumption
- `cite` - Referenced but not used
- `produce` - Resource produced by process

---

## 2. Validation Pipeline

### 2.1 Five-Phase Validation

The DSL implements a comprehensive validation pipeline:

**Phase 1: Syntax Validation (Parse-Time)**

- Grammar compliance checking
- Token and structural validation
- Immediate feedback with line/column numbers

**Phase 2: Semantic Validation (Type Checking)**

- Unit compatibility (e.g., cannot assign "hours" to "kilograms")
- Resource specification matching
- Agent role compatibility
- Data type validation

**Phase 3: Reference Integrity (Existence Checks)**

- Agent references must exist or be defined in script
- Resource specification references must be valid
- Location and organization references verified
- Forward references allowed within same script

**Phase 4: Economic Logic Validation**

- Process input/output balance checking
- Valid action sequences (e.g., cannot consume before produce)
- Quantity conservation laws
- Temporal consistency (events in chronological order)

**Phase 5: Governance Compliance**

- Rule coverage analysis (are all resources covered?)
- Conflict detection between rules
- Access control validation
- Approval workflow completeness

### 2.2 Error Handling Strategy

| Error Type        | Severity | Recovery           | Example                      |
| ----------------- | -------- | ------------------ | ---------------------------- |
| Syntax Error      | Fatal    | Must fix           | Missing closing brace        |
| Type Mismatch     | Fatal    | Must fix           | Assigning "kg" to time field |
| Unknown Reference | Fatal    | Must fix or create | Agent not found              |
| Logic Warning     | Warning  | Optional fix       | Process doesn't balance      |
| Style Issue       | Info     | Optional fix       | Inconsistent naming          |

### 2.3 Validation Commands

```bash
nondom validate --strict script.vf    # Treat warnings as errors
nondom validate --phase 2 script.vf   # Stop after semantic validation
nondom validate --explain script.vf   # Detailed explanations
```

### 2.4 Error Message Format

```bash
$ nondom validate script.vf

error[E0301]: unknown agent reference
  --> script.vf:25:12
   |
25 |     custodian: UnknownOrg
   |                ^^^^^^^^^^ agent not found
   |
   = hint: create agent first or use `or_default` fallback
   = help: see https://docs.nondominium.org/dsl/errors/E0301

warning[W0201]: process doesn't balance
  --> script.vf:42:5
   |
42 | recipe MakePart { ... }
   |    ---- outputs exceed inputs by 2 units
   |
   = note: this may be intentional for additive manufacturing
```

---

## 3. Governance Rule DSL

### 3.1 Rule Definition Syntax

```vf
governance {
  rule <name> {
    # Basic properties
    applies_to: <resource_spec>
    requires_role: <role>
    max_booking_duration: <duration>
    requires_approval_when: <condition>
    approvers: [<role>, ...]

    # Temporal constraints
    valid_from: <date>
    valid_until: <date>

    # Condition composition
    conditions {
      operating_hours: <time_range>
      excluded_days: [<day>, ...]
    }
  }
}
```

### 3.2 Rule Composition Operators

#### 3.2.1 Logical Operators

```vf
rule AdvancedEquipment {
  applies_to: Equipment AND category == "Precision"
  requires: (role == Member OR role == Technician)
  NOT blacklisted
}
```

**Operators**:

- `AND` - Both conditions must be true
- `OR` - At least one condition must be true
- `NOT` - Condition must be false
- Parentheses `()` for grouping

#### 3.2.2 Priority Specification

```vf
governance {
  rule BasicAccess { priority: 100 }
  rule EmergencyOverride { priority: 1000 }  # Higher wins
}
```

**Conflict Resolution Order**:

1. Priority ordering (higher wins)
2. Most specific rule (more conditions wins)
3. Most recent definition
4. Explicit combination via `combine_with`

#### 3.2.3 Rule Inheritance and Composition

```vf
# Base rule template
template EquipmentRule {
  requires_role: Member
  max_booking: 4h
}

# Specialized rules inherit from template
rule CNC_Machines : EquipmentRule {
  applies_to: CNC_Router
  requires_approval_when: duration > 2h
  approvers: [Senior_Technician]
}

rule BasicTools : EquipmentRule {
  applies_to: HandTools
  requires_approval: false  # Override
}
```

### 3.3 Temporal Validity and Scheduling

```vf
rule SeasonalEquipment {
  applies_to: Outdoor_Equipment

  # Season-based availability
  schedule {
    available: April-September
    unavailable: October-March
  }

  # Time-of-day restrictions
  time_windows {
    weekday: 9am-9pm
    weekend: 10am-6pm
  }
}
```

### 3.4 Rule Testing and Validation

```vf
# Test cases can be embedded
governance {
  rule EquipmentBooking {
    # ... rule definition ...
  }

  test "Weekend booking requires approval" {
    given: EquipmentBooking
    when: agent.role == Member AND day == Saturday
    then: requires_approval == true
  }
}
```

---

## 4. Security Model

### 4.1 Authentication and Authorization

**Agent Authentication**:

- Scripts execute with the permissions of the authenticated agent
- Agent identity verified through Holochain's signature system
- Cross-agent operations require explicit capability grants

```vf
# Script can declare required permissions
permissions {
  require: [create_resource, transfer_resource]
  as_agent: Alice
  delegate_to: Bob  # Allow Bob to act on behalf
}
```

### 4.2 Capability-Based Access Control

**Capability Token Validation**:

- All operations validated against Nondominium's capability tokens
- Role-based access enforced at zome level
- Temporary capabilities for time-limited operations

```vf
# Request specific capabilities for script execution
capabilities {
  create_resources: 100          # Max 100 resources
  duration: 1h                   # Session timeout
  renewable: false               # One-time execution
}
```

### 4.3 Data Privacy and Sensitive Information

**Private Data Handling**:

- Encrypted profile fields never exported in plain text
- PII (Personally Identifiable Information) redacted from logs
- Audit trails respect privacy settings

```vf
# Privacy-aware export
nondom export --privacy-mode minimal  # Exclude private fields
nondom export --privacy-mode full     # Include all accessible data
```

### 4.4 Audit Logging

```bash
# Enable detailed audit logging
nondom apply script.vf --audit --log-level debug
```

**Log Contents**:

- Script hash and timestamp
- Agent identity and capabilities used
- All zome calls performed
- Resource modifications (before/after)
- Governance rule evaluations

### 4.5 Sandboxing and Execution Safety

**Declarative-Only Guarantee**:

- No arbitrary code execution possible
- No filesystem access beyond script I/O
- No network access except to Holochain conductor
- No shell command execution

```vf
# Script can request resource limits
limits {
  max_entities: 1000
  max_execution_time: 5min
  max_memory: 100MB
}
```

### 4.6 Rate Limiting and Abuse Prevention

**Bulk Operation Limits**:

- Rate limits on resource creation (e.g., 100/minute)
- Detection of bulk deletion patterns
- Require confirmation for destructive operations

```bash
# Interactive confirmation for dangerous operations
$ nondom apply mass_delete.vf
Warning: This script will delete 50 resources. Continue? [y/N]
```

---

## 5. Performance Optimization

### 5.1 Performance Metrics

**Parsing Performance**:
| Script Size | Parse Time Target | Complexity |
|-------------|-------------------|------------|
| Small (~50 entities) | < 100ms | O(n) |
| Medium (~500 entities) | < 500ms | O(n) |
| Large (~1000+ entities) | < 1s | O(n) |

**Validation Performance**:
| Validation Phase | Time Target | Complexity |
|------------------|-------------|------------|
| Syntax | O(n) | < 100ms typical |
| Semantic | O(n²) worst-case | < 500ms typical |
| Reference Integrity | O(n) | Dependent on DHT |
| Economic Logic | O(n) | < 500ms typical |
| Governance | O(n×m) | n=entities, m=rules |

**Execution Performance**:
| Operation | Target | Notes |
|-----------|--------|-------|
| Create 100 resources | < 10s | Excluding DHT latency |
| Bulk update (where clause) | < 5s | For 100 resources |
| Export 1000 entities | < 5s | To DSL format |
| Diff two states | < 3s | For 500-entity networks |

### 5.2 Resource Limits

**Memory Usage**:

- Parser: < 10MB per 1000 entities
- Validation: < 50MB peak
- Execution: < 100MB (excluding DHT)

**Script Size Limits**:

- Maximum entities: 10,000 (configurable)
- Maximum file size: 5MB
- Maximum nesting depth: 10 levels

### 5.3 Optimization Strategies

**Parallel Entity Creation**:

```rust
// Order-independent entities created in parallel
let (agents, resources, governance) = tokio::join!(
    create_agents(agent_batch),
    create_resources(resource_batch),
    create_governance(governance_batch)
);
```

**Batch DHT Operations**:

```bash
# Configure batch size
nondom apply script.vf --batch-size 100
# Larger batches = fewer round-trips but higher memory
```

**Lazy Validation**:

```bash
# Skip expensive checks for trusted scripts
nondom apply script.vf --validation quick  # Syntax + basic semantic only
nondom apply script.vf --validation full   # All phases (default)
```

### 5.4 Progress Reporting

```bash
$ nondom apply bootstrap.vf
Processing: [████████░░░░░░░] 45% (450/1000 entities)
Created: 450 agents, 300 resources, 50 governance rules
ETA: 2s
```

### 5.5 Caching Strategy

**Parse Cache**:

```bash
# Cache parsed AST for repeated validation
nondom validate script.vf --cache
# Second run is instantaneous
```

**Validation Cache**:

```bash
# Cache validation results for unchanged scripts
nondom validate script.vf --incremental
# Only re-validates changed sections
```

**DHT Query Cache**:

- Cache reference integrity checks for 5 minutes
- Invalidation on entity updates
- LRU cache with 1000-entry limit

---

## 6. Migration and Versioning

### 6.1 State Export and Import

**Export Format**:

```bash
# Export entire network state
nondom export --format vf --output network_state.vf

# Export specific entity types
nondom export resources,governance --output partial.vf

# Export with filtering
nondom export --where "created > 2025-01-01" --output recent.vf
```

**State Representation**:

```vf
# Exported state script includes version metadata
# Generated: 2025-01-15T10:30:00Z
# Network: FabLabMontreal
# Version: 1.0

metadata {
  export_date: 2025-01-15T10:30:00Z
  dsl_version: "1.0"
  network_hash: "abc123..."
}

# ... full entity definitions ...
```

### 6.2 State Diff and Migration

```bash
# Compare current state with exported baseline
nondom diff baseline.vf --output migration.vf

# Preview changes before applying
nondom diff baseline.vf --dry-run

# Generate detailed change report
nondom diff baseline.vf --report changes.md
```

**Diff Output Format**:

```vf
# Auto-generated migration script
# Changes: +15 resources, -3 resources, ~8 resources

# ADDED resources
resources {
  New_Laser_Cutter : Equipment {
    custodian: Sensorica
    location: "Room 201"
    added: 2025-01-15
  }
}

# REMOVED resources
remove resource Old_3D_Printer  # Deprecated

# MODIFIED resources
update resource CNC_Router {
  location: "Room 101"  # Changed from "Room 100"
}
```

### 6.3 Version Compatibility

**DSL Versioning Strategy**:

| DSL Version | Status      | Migration Path                       |
| ----------- | ----------- | ------------------------------------ |
| 1.0         | Current     | N/A                                  |
| 0.9         | Deprecated  | `nondom migrate --from 0.9 --to 1.0` |
| 0.8         | Unsupported | Manual migration required            |

**Backward Compatibility Guarantees**:

- Scripts written in DSL 1.0 will work with DSL 1.x (minor versions)
- Breaking changes require major version increment (1.0 → 2.0)
- Migration tools provided for at least 2 previous major versions

**Version Detection**:

```vf
# Scripts declare required DSL version
#!/usr/bin/env nondom
# @version "1.0"

network MyNetwork { ... }
```

---

## 7. Testing Framework

### 7.1 Unit Testing Individual Constructs

```vf
# test/unit/resource_creation.vf
test "Create resource with minimal properties" {
  input: {
    resources { TestResource : Equipment { custodian: TestOrg } }
  }
  expect: {
    created: 1
    type: Equipment
    has_property: custodian
  }
}
```

### 7.2 Integration Testing

```vf
# test/integration/full_workflow.vf
test "Complete resource lifecycle" {
  setup: {
    # Create agents, specifications, governance
  }
  script: {
    # Create resources, transfer, consume, produce
  }
  verify: {
    # Check DHT state
    # Verify governance rules applied
    # Validate economic events
  }
  cleanup: {
    # Remove test data
  }
}
```

### 7.3 Golden File Testing

```bash
# Generate golden files
nondom compile test.vf --output test.golden.json

# Regression testing
nondom test --golden test.vf
# Compiles and compares with test.golden.json
```

### 7.4 Property-Based Testing

```rust
// Rust-based property tests
proptest!(|(resources: Vec<Resource>)| {
    let script = compile_to_dsl(resources);
    let result = nondom_apply(&script);
    prop_assert!(result.is_valid());
});
```

**Properties to Test**:

- Idempotency: Running script twice produces same result
- Commutativity: Order of entity creation doesn't matter (where possible)
- Round-trip: Export → Import preserves data

### 7.5 Test Organization

```
tests/
├── unit/              # Single feature tests
│   ├── agent_creation.vf
│   ├── resource_spec.vf
│   └── governance_rules.vf
├── integration/       # Cross-feature tests
│   ├── full_workflow.vf
│   └── multi_agent.vf
├── golden/           # Expected compiler outputs
│   └── *.golden.json
└── snapshots/        # Governance evaluation results
    └── *.snap.vf
```

### 7.6 Continuous Integration

```yaml
# .github/workflows/dsl-tests.yml
test:
  - bun run test:unit # Fast unit tests
  - bun run test:integration # Integration tests
  - bun run test:golden # Regression testing
  - bun run test:property # Property-based tests
```

---

## 8. CLI Interface Specification

### 8.1 Command Reference

| Command                                   | Description                                     |
| ----------------------------------------- | ----------------------------------------------- |
| `nondom apply <script.vf>`                | Execute a DSL script against the network        |
| `nondom validate <script.vf>`             | Validate syntax and semantics without executing |
| `nondom apply --dry-run <script.vf>`      | Show what would change without applying         |
| `nondom export --format vf`               | Export current state as DSL script              |
| `nondom import <file> --mapping <map.vf>` | Import from external format using mapping       |
| `nondom repl`                             | Interactive shell for exploratory scripting     |
| `nondom diff <baseline.vf>`               | Compare states and generate migration script    |
| `nondom migrate --from <ver> --to <ver>`  | Migrate scripts between DSL versions            |

### 8.2 Common Options

```bash
# Validation options
--strict                # Treat warnings as errors
--phase <number>        # Stop at specific validation phase
--explain               # Provide detailed explanations

# Execution options
--dry-run              # Preview changes without applying
--batch-size <number>   # Configure DHT operation batching
--validation <mode>     # quick | full
--interactive           # Prompt for confirmation on each change

# Performance options
--cache                # Enable parse caching
--incremental          # Use incremental validation
--profile              # Show performance breakdown
--chunk-size <number>  # Process large scripts in chunks

# Output options
--output <file>        # Specify output file
--format <format>      # vf | json | graphql
--privacy-mode <mode>  # minimal | full
--audit                # Enable audit logging
--log-level <level>    # debug | info | warn | error
```

---

## 9. Parser Architecture

### 9.1 Technology Stack

- **Implementation Language**: Rust (aligns with Nondominium codebase)
- **Parser Library**: pest or nom parser combinators
- **AST Representation**: Serde-serializable structs
- **Error Reporting**: Custom diagnostic types with span information

### 9.2 Parser Components

```rust
// Core parser structure
pub struct DslParser {
    lexer: pest::Parser<Rule>,
    ast_builder: AstBuilder,
    error_collector: ErrorCollector,
}

impl DslParser {
    pub fn parse(&mut self, input: &str) -> Result<Program, ParseError> {
        // Tokenization -> AST construction -> Validation
    }
}
```

### 9.3 AST Definition

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Program {
    pub version: Option<String>,
    pub statements: Vec<Statement>,
    pub metadata: Metadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Statement {
    Network(NetworkDecl),
    Agents(AgentsDecl),
    Resources(ResourcesDecl),
    Governance(GovernanceDecl),
    Recipe(RecipeDecl),
    Transaction(TransactionBlock),
    // ...
}
```

### 9.4 Error Reporting

```rust
#[derive(Debug)]
pub struct ParseError {
    pub kind: ErrorKind,
    pub span: Span,
    pub context: String,
    pub hints: Vec<String>,
}

pub type Span = std::ops::Range<usize>;
```

---

## 10. Compilation Pipeline

### 10.1 Compilation Stages

```
DSL Source Code
       ↓
   [Lexer] → Tokens
       ↓
 [Parser] → AST
       ↓
[Validator] → Validated AST
       ↓
[Compiler] → hREA Function Calls
       ↓
[Executor] → Holochain DHT Operations
```

### 10.2 Target: hREA Zome Calls

The DSL compiles to Nondominium's zome function calls:

```rust
// DSL: resources { CNC : Equipment { custodian: Sensorica } }
//
// Compiles to:
zome_resource::functions::create_resource(CreateResourceInput {
    resource_spec_id: "Equipment",
    custodian: "Sensorica",
    // ...
})
```

### 10.3 Secondary Compilation Targets

**JSON-LD Export**:

```bash
nondom compile script.vf --target jsonld --output script.jsonld
```

**GraphQL Mutations**:

```bash
nondom compile script.vf --target graphql --output mutations.graphql
```

---

## Appendix A: Error Codes

| Code        | Category       | Description                     |
| ----------- | -------------- | ------------------------------- |
| E0101-E0199 | Syntax         | Grammar and parsing errors      |
| E0201-E0299 | Semantic       | Type checking and validation    |
| E0301-E0399 | Reference      | Unknown entity references       |
| E0401-E0499 | Economic Logic | Balance and conservation errors |
| E0501-E0599 | Governance     | Rule conflicts and violations   |
