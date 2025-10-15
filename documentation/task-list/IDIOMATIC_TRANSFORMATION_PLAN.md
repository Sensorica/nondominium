# Idiomatic Holochain Transformation Plan

## Overview

This plan outlines the transformation of the nondominium hApp's private data system from custom implementations to idiomatic Holochain patterns using built-in capabilities and standard validation mechanisms.

## Current Non-Idiomatic Issues

### ❌ Custom Grant System Problems

- Reimplements functionality already available in Holochain capabilities
- Lacks built-in cryptographic security and verification
- Manual link management instead of standard capability lookup
- Creates maintenance burden and potential security vulnerabilities

### ❌ Custom SelfValidation Issues

- Complex workaround for private entry validation limitations
- Custom validation proofs instead of standard validation receipts
- Manual grant-to-proof relationships
- Reinvents standard Holochain validation patterns

## Completed Analysis Tasks

- [x] **Analyzed current grant implementation** - Identified custom `DataAccessGrant` structure
- [x] **Analyzed SelfValidation mechanism** - Identified custom proof creation and verification
- [x] **Reviewed Holochain documentation** - Confirmed idiomatic patterns using capabilities and validation receipts
- [x] **Identified security and maintenance concerns** - Custom implementations create unnecessary risks

## In Progress Tasks

- [ ] **Design idiomatic replacement architecture** - Create blueprint for capability-based system
- [ ] **Plan migration strategy** - Develop step-by-step transformation approach
- [ ] **Create implementation roadmap** - Detailed task breakdown for transformation

## Future Tasks

- [ ] **Implement capability-based access control**
- [ ] **Integrate validation receipts system**
- [ ] **Refactor private data sharing mechanism**
- [ ] **Update governance integration**
- [ ] **Create comprehensive test suite**
- [ ] **Document new idiomatic patterns**

## Implementation Plan

### Phase 1: Architecture Design

**Objective**: Design idiomatic replacement for custom systems

**Key Components**:

- Replace `DataAccessGrant` with Holochain `ZomeCallCapGrant`
- Replace `SelfValidationResult` with standard `ValidationReceipt`
- Use built-in capability checking instead of manual grant verification
- Leverage private entry validation patterns for governance workflows

### Phase 2: Capability System Integration

**Objective**: Replace custom grant system with Holochain capabilities

**Implementation Strategy**:

1. **Define capability structure** using `CapAccess::Assigned` for specific agents
2. **Create capability grant functions** using `create_cap_grant()`
3. **Implement capability checking** using HDK's automatic verification
4. **Migrate existing grant logic** to capability-based permissions

### Phase 3: Validation Receipts Integration

**Objective**: Replace custom SelfValidation with standard validation

**Implementation Strategy**:

1. **Use validation receipts** for proving private data validation
2. **Implement cross-zome validation** using standard `call()` mechanisms
3. **Replace custom proof creation** with receipt-based verification
4. **Maintain governance workflow** compatibility

### Phase 4: Private Data Sharing Refactor

**Objective**: Simplify data sharing using idiomatic patterns

**Implementation Strategy**:

1. **Use capability-based access control** for data sharing
2. **Simplify filtered data mechanism** using standard patterns
3. **Maintain privacy guarantees** while reducing complexity
4. **Improve performance** through built-in optimizations

## Relevant Files

### Current Non-Idiomatic Files

- `dnas/nondominium/zomes/integrity/zome_person/src/lib.rs` - Custom entry types and validation
- `dnas/nondominium/zomes/coordinator/zome_person/src/private_data.rs` - Private data management
- `dnas/nondominium/zomes/coordinator/zome_person/src/private_data_sharing.rs` - Custom grants and SelfValidation

### Target Files for Refactoring

- `dnas/nondominium/zomes/coordinator/zome_person/src/capability_management.rs` - **NEW** - Idiomatic capability system
- `dnas/nondominium/zomes/coordinator/zome_person/src/validation_integration.rs` - **NEW** - Standard validation patterns
- `dnas/nondominium/zomes/coordinator/zome_person/src/governance_capabilities.rs` - **NEW** - Governance-specific capabilities

## Technical Architecture

### Current Architecture

```
Custom DataAccessGrant → Manual Link Management → Custom Validation Proofs
```

### Target Idiomatic Architecture

```
Holochain CapGrant → Built-in Capability Checking → Validation Receipts
```

### Migration Benefits

- **Security**: Leverages Holochain's cryptographic security
- **Maintainability**: Reduces custom code by ~60%
- **Performance**: Uses built-in optimizations
- **Standards Compliance**: Follows Holochain best practices
- **Future-Proofing**: Automatic benefits from Holochain improvements

## Implementation Tasks Breakdown

### Phase 1: Foundation (Tasks 1-5)

1. **Create capability management module**
2. **Define capability grant structures**
3. **Implement grant creation functions**
4. **Create capability verification helpers**
5. **Design capability revocation mechanism**

### Phase 2: Validation Integration (Tasks 6-10)

6. **Implement validation receipt system**
7. **Create cross-zome validation calls**
8. **Replace SelfValidation proofs with receipts**
9. **Update governance validation workflow**
10. **Test validation receipt verification**

### Phase 3: Data Sharing Refactor (Tasks 11-15)

11. **Refactor private data access using capabilities**
12. **Simplify shared data creation mechanism**
13. **Update field-level access control**
14. **Implement automatic capability grants**
15. **Optimize performance with built-in caching**

### Phase 4: Testing & Documentation (Tasks 16-20)

16. **Create comprehensive test suite**
17. **Write integration tests for capabilities**
18. **Document new idiomatic patterns**
19. **Create migration guide**
20. **Performance testing and optimization**

## Risk Assessment

### Low Risk

- **Backward compatibility**: Can maintain existing APIs during transition
- **Data migration**: Private data structure remains unchanged
- **Functionality**: All existing features preserved

### Medium Risk

- **Complexity**: Need careful coordination between multiple zomes
- **Testing**: Comprehensive testing required to ensure no regressions
- **Learning curve**: Team needs to understand new idiomatic patterns

### High Risk

- **Timing**: Must ensure governance workflows remain functional during transition
- **Security**: Must verify capability system provides equivalent protection

## Success Criteria

### Functional Requirements

- ✅ All existing functionality preserved
- ✅ Governance workflows remain operational
- ✅ Privacy guarantees maintained or improved
- ✅ Performance equal or better than current system

### Technical Requirements

- ✅ Uses Holochain built-in capabilities
- ✅ Leverages validation receipts system
- ✅ Follows Holochain development best practices
- ✅ Reduces custom code complexity by 50%+

### Quality Requirements

- ✅ Comprehensive test coverage (>90%)
- ✅ Clear documentation for new patterns
- ✅ Migration guide for developers
- ✅ Performance benchmarks met

## Timeline Estimate

**Total Estimated Effort**: 3-4 weeks

**Phase Breakdown**:

- **Phase 1** (Foundation): 1 week
- **Phase 2** (Validation): 1 week
- **Phase 3** (Data Sharing): 1 week
- **Phase 4** (Testing): 0.5-1 week

## Dependencies

### Internal Dependencies

- Governance zome integration for capability testing
- Test suite updates for new patterns
- Documentation updates for development team

### External Dependencies

- Holochain HDK capability functions
- Validation receipt system availability
- Cross-zome call mechanism stability

## Quality Gates

### Pre-Implementation

- [ ] Architecture review completed
- [ ] Migration strategy approved
- [ ] Test plan defined
- [ ] Risk assessment completed

### Post-Implementation

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation finalized
- [ ] Team training completed

## Detailed Implementation Specifications

### Phase 1: Foundation Implementation Details

#### Task 1: Create Capability Management Module

**File**: `dnas/nondominium/zomes/coordinator/zome_person/src/capability_management.rs`

**Structure**:

```rust
use hdk::prelude::*;
use zome_person_integrity::*;

/// Capability-based access control for private data
pub struct CapabilityManager;

impl CapabilityManager {
    /// Create a governance capability grant
    pub fn create_governance_grant(
        target_agent: AgentPubKey,
        role: String,
        fields: Vec<String>,
    ) -> ExternResult<CapGrant> {
        // Implementation using Holochain's create_cap_grant
    }

    /// Create a peer-to-peer data sharing capability
    pub fn create_peer_grant(
        target_agent: AgentPubKey,
        fields: Vec<String>,
        context: String,
        duration_days: u32,
    ) -> ExternResult<CapGrant> {
        // Implementation with time-limited access
    }

    /// Revoke a capability grant
    pub fn revoke_grant(grant_id: CapGrantId) -> ExternResult<()> {
        // Implementation using delete_cap_grant
    }

    /// Check if agent has specific capability
    pub fn has_capability(
        agent: AgentPubKey,
        required_function: String,
        required_context: String,
    ) -> ExternResult<bool> {
        // Implementation using capability info checking
    }
}
```

#### Task 2: Define Capability Grant Structures

**Key Structures**:

```rust
/// Governance-specific capability grant
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceCapabilityGrant {
    pub target_role: String,
    pub required_fields: Vec<String>,
    pub governance_context: String,
    pub expires_at: Timestamp,
    pub created_at: Timestamp,
}

/// Private data access capability
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PrivateDataCapability {
    pub allowed_fields: Vec<String>,
    pub access_context: String,
    pub expires_at: Timestamp,
    pub created_at: Timestamp,
}

/// Capability grant wrapper with metadata
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CapabilityGrantWrapper {
    pub grant: CapGrant,
    pub metadata: CapabilityMetadata,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CapabilityMetadata {
    pub grant_type: String, // "governance" or "peer"
    pub created_by: AgentPubKey,
    pub created_for: AgentPubKey,
    pub context: String,
}
```

#### Task 3: Implement Grant Creation Functions

**Core Functions**:

```rust
/// Create governance access capability
#[hdk_extern]
pub fn create_governance_capability(
    input: GovernanceCapabilityInput,
) -> ExternResult<CapabilityGrantOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Define required fields based on role
    let required_fields = match input.target_role.as_str() {
        "Simple Agent" => vec!["email"],
        "Accountable Agent" => vec!["email", "phone"],
        "Primary Accountable Agent" => vec!["email", "phone", "location"],
        "Transport Agent" | "Repair Agent" | "Storage Agent" => {
            vec!["email", "phone", "location", "time_zone"]
        }
        _ => return Err(WasmError::Guest("Invalid role".to_string()).into()),
    };

    // Create capability grant using Holochain's built-in system
    let cap_grant = CapGrant {
        tag: format!("governance_{}", input.target_role.to_lowercase().replace(" ", "_")),
        access: CapAccess::Assigned {
            secret: generate_cap_secret()?,
            assignees: BTreeSet::from([input.governance_agent]),
        },
        functions: GrantedFunctions::Listed(BTreeSet::from([
            ("zome_person".into(), "validate_agent_private_data".into()),
            ("zome_person".into(), "create_self_validation_receipt".into()),
        ])),
    };

    let grant_output = create_cap_grant(cap_grant)?;

    // Store capability metadata for tracking
    let metadata = CapabilityMetadata {
        grant_type: "governance".to_string(),
        created_by: agent_info.agent_initial_pubkey,
        created_for: input.governance_agent,
        context: format!("role_{}", input.target_role.to_lowercase().replace(" ", "_")),
    };

    // Create link for capability tracking
    create_link(
        agent_info.agent_initial_pubkey,
        grant_output.grant_address.clone(),
        LinkTypes::AgentToCapabilityGrants,
        LinkTag::new("governance"),
    )?;

    Ok(CapabilityGrantOutput {
        grant_address: grant_output.grant_address,
        metadata,
    })
}

/// Create peer-to-peer data sharing capability
#[hdk_extern]
pub fn create_peer_capability(
    input: PeerCapabilityInput,
) -> ExternResult<CapabilityGrantOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Validate requested fields
    let allowed_fields = ["email", "phone", "location", "time_zone", "emergency_contact"];
    for field in &input.requested_fields {
        if !allowed_fields.contains(&field.as_str()) {
            return Err(WasmError::Guest(format!("Field '{}' not allowed for sharing", field)).into());
        }
    }

    // Create time-limited capability
    let cap_grant = CapGrant {
        tag: format!("peer_{}", input.context.to_lowercase().replace(" ", "_")),
        access: CapAccess::Assigned {
            secret: generate_cap_secret()?,
            assignees: BTreeSet::from([input.target_agent]),
        },
        functions: GrantedFunctions::Listed(BTreeSet::from([
            ("zome_person".into(), "get_granted_private_data".into()),
        ])),
    };

    let grant_output = create_cap_grant(cap_grant)?;

    // Create metadata for peer capability
    let metadata = CapabilityMetadata {
        grant_type: "peer".to_string(),
        created_by: agent_info.agent_initial_pubkey,
        created_for: input.target_agent,
        context: input.context.clone(),
    };

    // Create capability tracking links
    create_link(
        agent_info.agent_initial_pubkey,
        grant_output.grant_address.clone(),
        LinkTypes::AgentToCapabilityGrants,
        LinkTag::new(&input.context),
    )?;

    Ok(CapabilityGrantOutput {
        grant_address: grant_output.grant_address,
        metadata,
    })
}
```

### Phase 2: Validation Integration Implementation Details

#### Task 6: Implement Validation Receipt System

**File**: `dnas/nondominium/zomes/coordinator/zome_person/src/validation_integration.rs`

**Core Validation Functions**:

```rust
/// Create validation receipt for private data
#[hdk_extern]
pub fn create_private_data_validation_receipt(
    input: ValidationReceiptInput,
) -> ExternResult<ValidationReceiptOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Only the data owner can create validation receipts
    if agent_info.agent_initial_pubkey != input.target_agent {
        return Err(WasmError::Guest("Cannot create validation receipt for another agent".to_string()).into());
    }

    // Get private data for validation
    let private_data = crate::private_data::get_my_private_person_data(())?
        .ok_or(WasmError::Guest("No private data found".to_string()))?;

    // Validate requested fields
    let mut validated_fields = HashMap::new();
    let mut missing_fields = Vec::new();

    for field in &input.required_fields {
        match field.as_str() {
            "email" => {
                if !private_data.email.is_empty() && private_data.email.contains('@') {
                    validated_fields.insert("email".to_string(), private_data.email.clone());
                } else {
                    missing_fields.push(field.clone());
                }
            }
            "phone" => {
                if let Some(phone) = &private_data.phone {
                    if !phone.is_empty() {
                        validated_fields.insert("phone".to_string(), phone.clone());
                    } else {
                        missing_fields.push(field.clone());
                    }
                } else {
                    missing_fields.push(field.clone());
                }
            }
            // Add other field validations...
            _ => missing_fields.push(field.clone()),
        }
    }

    // Create validation receipt
    let receipt = ValidationReceipt {
        agent_pubkey: agent_info.agent_initial_pubkey,
        validation_context: input.validation_context,
        validated_fields,
        missing_fields,
        is_valid: missing_fields.is_empty(),
        validated_at: now,
        signature: Signature::from([0u8; 64]), // Will be signed
    };

    // Sign the receipt
    let signed_receipt = sign(&receipt.try_into()?)?;

    // Store the receipt
    let receipt_hash = create_entry(&EntryTypes::ValidationReceipt(receipt))?;

    Ok(ValidationReceiptOutput {
        receipt_hash,
        signature: signed_receipt,
    })
}

/// Verify validation receipt authenticity
#[hdk_extern]
pub fn verify_validation_receipt(
    input: VerifyReceiptInput,
) -> ExternResult<VerifyReceiptOutput> {
    // Get the receipt entry
    let receipt_record = get(input.receipt_hash, GetOptions::default())?
        .ok_or(WasmError::Guest("Receipt not found".to_string()))?;

    let receipt: ValidationReceipt = receipt_record
        .entry()
        .to_app_option()?
        .ok_or(WasmError::Guest("Invalid receipt entry".to_string()))?;

    // Verify signature
    let is_valid_signature = verify_signature(
        &receipt.signature,
        &receipt.try_into()?,
        &receipt.agent_pubkey
    )?;

    // Check if receipt is still valid (not expired)
    let now = sys_time()?;
    let receipt_age = now.as_micros() - receipt.validated_at.as_micros();
    let max_age = 7 * 24 * 60 * 60 * 1_000_000; // 7 days

    let is_valid = is_valid_signature && receipt_age <= max_age && receipt.is_valid;

    Ok(VerifyReceiptOutput {
        is_valid,
        validated_fields: receipt.validated_fields,
        validation_context: receipt.validation_context,
        validated_at: receipt.validated_at,
        agent_pubkey: receipt.agent_pubkey,
    })
}
```

#### Task 8: Replace SelfValidation Proofs with Receipts

**Migration Strategy**:

```rust
/// Replace custom SelfValidationResult with standard validation receipts
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ValidationReceipt {
    pub agent_pubkey: AgentPubKey,
    pub validation_context: String,
    pub validated_fields: HashMap<String, String>,
    pub missing_fields: Vec<String>,
    pub is_valid: bool,
    pub validated_at: Timestamp,
    pub signature: Signature,
}

/// New validation result using validation receipts
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ValidationReceiptResult {
    pub receipt_hash: ActionHash,
    pub is_valid: bool,
    pub validated_data: Option<HashMap<String, String>>,
    pub validation_context: String,
    pub validated_at: Timestamp,
    pub agent_pubkey: AgentPubKey,
}

/// Migrate from SelfValidationResult to ValidationReceiptResult
impl From<SelfValidationResult> for ValidationReceiptResult {
    fn from(old_result: SelfValidationResult) -> Self {
        ValidationReceiptResult {
            receipt_hash: old_result.receipt_hash, // Will be set during migration
            is_valid: old_result.is_valid,
            validated_data: Some(old_result.validated_fields),
            validation_context: old_result.validation_context,
            validated_at: old_result.validated_at,
            agent_pubkey: old_result.agent_pubkey,
        }
    }
}
```

### Phase 3: Data Sharing Refactor Implementation Details

#### Task 11: Refactor Private Data Access Using Capabilities

**New Access Control Pattern**:

```rust
/// Get private data using capability-based access control
#[hdk_extern]
pub fn get_private_data_with_capability(
    input: GetDataWithCapabilityInput,
) -> ExternResult<FilteredPrivateData> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Check if caller has valid capability
    let has_capability = check_capability(
        agent_info.agent_initial_pubkey,
        "get_granted_private_data".to_string(),
        input.request_context.clone(),
    )?;

    if !has_capability {
        return Err(WasmError::Guest("No valid capability for this operation".to_string()).into());
    }

    // Get private data if we are the owner
    let private_data = crate::private_data::get_my_private_person_data(())?
        .ok_or(WasmError::Guest("No private data found".to_string()))?;

    // Filter data based on requested fields
    let mut filtered_data = HashMap::new();

    for field in &input.requested_fields {
        match field.as_str() {
            "email" => {
                filtered_data.insert("email".to_string(), private_data.email.clone());
            }
            "phone" => {
                if let Some(phone) = &private_data.phone {
                    filtered_data.insert("phone".to_string(), phone.clone());
                }
            }
            // Add other field mappings...
            _ => {} // Skip invalid fields
        }
    }

    Ok(FilteredPrivateData {
        data: filtered_data,
        filtered_at: now,
        context: input.request_context,
    })
}

/// Filtered private data structure for capability-based access
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FilteredPrivateData {
    pub data: HashMap<String, String>,
    pub filtered_at: Timestamp,
    pub context: String,
}
```

#### Task 14: Implement Automatic Capability Grants

**Automatic Grant System**:

```rust
/// Automatically grant capabilities for governance workflows
#[hdk_extern]
pub fn auto_grant_governance_capabilities(
    input: AutoGrantCapabilitiesInput,
) -> ExternResult<AutoGrantCapabilitiesOutput> {
    let agent_info = agent_info()?;

    // Create automatic grant for governance agent
    let governance_grant = GovernanceCapabilityInput {
        target_role: input.target_role.clone(),
        governance_agent: input.governance_agent,
    };

    let grant_output = create_governance_capability(governance_grant)?;

    // Create link for automatic grant tracking
    create_link(
        agent_info.agent_initial_pubkey,
        grant_output.grant_address.clone(),
        LinkTypes::AgentToAutoGrants,
        LinkTag::new(&input.target_role),
    )?;

    Ok(AutoGrantCapabilitiesOutput {
        grant_address: grant_output.grant_address,
        role: input.target_role,
        granted_at: sys_time()?,
    })
}
```

## Migration Strategy

### Step-by-Step Migration Process

1. **Phase 1: Setup Foundation**
   - Create new capability management files
   - Define new data structures
   - Set up basic capability functions

2. **Phase 2: Parallel Implementation**
   - Keep existing custom system running
   - Implement new capability system alongside
   - Create compatibility layer

3. **Phase 3: Gradual Migration**
   - Migrate governance workflows first
   - Update private data sharing mechanisms
   - Remove custom implementations

4. **Phase 4: Cleanup**
   - Remove old custom code
   - Update documentation
   - Optimize performance

### Backward Compatibility

**Compatibility Functions**:

```rust
/// Legacy grant function for backward compatibility
#[hdk_extern]
pub fn request_private_data_access_legacy(
    input: RequestPrivateDataAccessInput,
) -> ExternResult<Record> {
    // Convert legacy request to new capability request
    let capability_input = PeerCapabilityInput {
        target_agent: input.requested_from,
        requested_fields: input.fields_requested,
        context: input.context,
        justification: input.justification,
    };

    // Use new capability system
    create_peer_capability(capability_input)
}

/// Convert old grant results to new format
impl From<DataAccessGrant> for CapabilityGrantWrapper {
    fn from(old_grant: DataAccessGrant) -> Self {
        // Convert old grant structure to new capability wrapper
        // This maintains compatibility during transition
    }
}
```

## Testing Strategy

### Comprehensive Test Coverage

#### Unit Tests

- Capability creation and verification
- Validation receipt generation and verification
- Private data access with capabilities
- Automatic grant functionality

#### Integration Tests

- End-to-end governance workflows
- Multi-agent data sharing scenarios
- Capability revocation and renewal
- Cross-zome communication

#### Performance Tests

- Capability lookup performance
- Validation receipt verification speed
- Private data access latency
- DHT synchronization behavior

### Test Structure

```
tests/src/nondominium/person/
├── capability_management.test.ts
├── validation_integration.test.ts
├── private_data_sharing.test.ts
├── governance_workflows.test.ts
└── migration_compatibility.test.ts
```

## Next Steps

### Immediate Actions (Week 1)

1. **Create capability management module**
2. **Define new data structures**
3. **Implement basic capability functions**
4. **Set up testing infrastructure**

### Short-term Goals (Weeks 2-3)

1. **Implement validation receipt system**
2. **Refactor private data sharing**
3. **Update governance integration**
4. **Create comprehensive test suite**

### Long-term Goals (Week 4+)

1. **Complete migration from custom systems**
2. **Performance optimization**
3. **Documentation and training**
4. **Monitor and refine new system**

## Conclusion

This transformation plan provides a comprehensive roadmap for converting the nondominium hApp's private data system from custom implementations to idiomatic Holochain patterns. The benefits include:

- **Improved Security**: Leverages Holochain's built-in cryptographic protections
- **Reduced Complexity**: Eliminates ~60% of custom code
- **Better Maintainability**: Uses standard Holochain patterns
- **Enhanced Performance**: Benefits from built-in optimizations
- **Future-Proofing**: Automatic improvements from Holochain updates

The phased approach ensures minimal disruption to existing functionality while systematically improving the system's architecture and maintainability.

---

**Status**: Ready for implementation
**Next Phase**: Begin Phase 1 Foundation implementation
**Review Date**: 2025-10-14
**Estimated Completion**: 3-4 weeks
