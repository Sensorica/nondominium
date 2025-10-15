# Implementation Plan: Holochain-Idiomatic Private Data

## Overview

This document outlines the step-by-step implementation plan for transforming the existing private data sharing system to use Holochain's native capability token system. The implementation will be executed in phases to ensure minimal disruption to existing functionality while maintaining system integrity.

## Phase 1: Capability System Foundation

### 1.1 Update Entry Types and Link Types

**Files to modify:**
- `dnas/nondominium/zomes/integrity/zome_person/src/lib.rs`

**Changes required:**
```rust
// Remove old entry types
// DataAccessGrant, DataAccessRequest, SharedPrivateData

// Keep existing entry types with enhanced privacy
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Person(Person),
    #[entry_type(visibility = "private")]
    PrivatePersonData(PrivatePersonData),
    PersonRole(PersonRole),
    // Native capability grants will be managed through HDK
}

// Simplify link types - remove data access related links
#[hdk_link_types]
pub enum LinkTypes {
    AllPersons,
    AgentToPerson,
    PersonUpdates,
    PersonToPrivateData,
    AgentToPrivateData,
    PersonToRoles,
    RoleUpdates,
    // Remove: AgentToDataGrants, AgentToDataRequests, etc.
}
```

### 1.2 Create Capability Grant Module

**New file:** `dnas/nondominium/zomes/coordinator/zome_person/src/capability_grants.rs`

**Key functions to implement:**
```rust
#[hdk_extern]
pub fn create_private_data_grant(input: CreatePrivateDataGrantInput) -> ExternResult<CapGrant>

#[hdk_extern]
pub fn update_private_data_grant(input: UpdatePrivateDataGrantInput) -> ExternResult<CapGrant>

#[hdk_extern]
pub fn revoke_private_data_grant(grant_hash: ActionHash) -> ExternResult<()>

#[hdk_extern]
pub fn get_my_private_data_grants(_: ()) -> ExternResult<Vec<CapGrant>>

#[hdk_extern]
pub fn get_received_private_data_grants(_: ()) -> ExternResult<Vec<CapGrant>>
```

### 1.3 Create Capability Claim Module

**New file:** `dnas/nondominium/zomes/coordinator/zome_person/src/capability_claims.rs`

**Key functions to implement:**
```rust
#[hdk_extern]
pub fn claim_private_data_access(input: ClaimPrivateDataAccessInput) -> ExternResult<CapClaim>

#[hdk_extern]
pub fn get_private_data_with_claim(input: GetPrivateDataWithClaimInput) -> ExternResult<PrivatePersonData>

#[hdk_extern]
pub fn validate_private_data_access(input: ValidatePrivateDataAccessInput) -> ExternResult<bool>

#[hdk_extern]
pub fn get_my_claims(_: ()) -> ExternResult<Vec<CapClaim>>
```

### 1.4 Update Module Exports

**File to modify:** `dnas/nondominium/zomes/coordinator/zome_person/src/lib.rs`

**Changes required:**
```rust
pub mod capability_grants;
pub mod capability_claims;
pub mod private_data;
pub mod governance_integration;

// Remove old modules
// pub mod private_data_sharing;
// pub mod audit_and_notifications;
```

## Phase 2: Governance Integration

### 2.1 Create Governance Integration Module

**New file:** `dnas/nondominium/zomes/coordinator/zome_person/src/governance_integration.rs`

**Key functions to implement:**
```rust
#[hdk_extern]
pub fn create_governance_access_grant(input: CreateGovernanceAccessGrantInput) -> ExternResult<CapGrant>

#[hdk_extern]
pub fn validate_agent_for_governance(input: ValidateAgentForGovernanceInput) -> ExternResult<ValidationResult>

#[hdk_extern]
pub fn create_governance_validation_proof(input: CreateGovernanceValidationProofInput) -> ExternResult<ValidationProof>

#[hdk_extern]
pub fn verify_governance_validation_proof(proof: ValidationProof) -> ExternResult<ValidationResult>
```

### 2.2 Update Governance Zome Integration

**Files to modify:**
- `dnas/nondominium/zomes/coordinator/zome_gouvernance/src/validation.rs`
- `dnas/nondominium/zomes/coordinator/zome_gouvernance/src/agent_promotion.rs`

**Changes required:**
- Update calls to use new capability-based private data access
- Replace old grant system calls with new capability functions
- Integrate with PPR system using capability validation

## Phase 3: Integrity Zome Migration

### 3.1 Move Validation Logic to Integrity Zome

**File to modify:** `dnas/nondominium/zomes/integrity/zome_person/src/lib.rs`

**Changes required:**
```rust
// Add comprehensive validation for private person data
fn validate_private_person_data_creation(data: &PrivatePersonData, author: &AgentPubKey) -> ExternResult<ValidateCallbackResult> {
    // Validate required fields
    if data.legal_name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid("Legal name cannot be empty".to_string()));
    }

    if !data.email.contains('@') {
        return Ok(ValidateCallbackResult::Invalid("Valid email required".to_string()));
    }

    // Ensure only agent can create their own private data
    // This will be enforced by private entry visibility, but add explicit check

    Ok(ValidateCallbackResult::Valid)
}

// Add validation for capability access patterns
fn validate_capability_access_pattern(
    grant: &CapGrant,
    claim: &CapClaim,
    context: &str
) -> ExternResult<ValidateCallbackResult> {
    // Validate that claim matches grant
    // Check that context is appropriate
    // Validate field permissions
    // Check expiration

    Ok(ValidateCallbackResult::Valid)
}
```

### 3.2 Update Validation Callbacks

**File to modify:** `dnas/nondominium/zomes/integrity/zome_person/src/lib.rs`

**Changes required:**
```rust
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => {
            match store_entry {
                OpEntry::CreateEntry { app_entry, action } => {
                    match app_entry {
                        EntryTypes::PrivatePersonData(data) => {
                            validate_private_person_data_creation(data, &action.author)
                        }
                        EntryTypes::PersonRole(role) => {
                            validate_person_role_creation(role, &action.author)
                        }
                        EntryTypes::Person(person) => {
                            validate_person_creation(person, &action.author)
                        }
                    }
                }
                // Handle other operations...
            }
        }
        // Handle other flat ops...
    }
}
```

## Phase 4: Testing and Migration

### 4.1 Create Comprehensive Test Suite

**New test files:**
- `tests/src/nondominium/person/capability_grants_test.rs`
- `tests/src/nondominium/person/capability_claims_test.rs`
- `tests/src/nondominium/person/governance_integration_test.rs`
- `tests/src/nondominium/person/migration_test.rs`

**Test scenarios to cover:**
- Grant creation, update, and revocation
- Claim creation and validation
- Field-level access control
- Context-based access validation
- Governance workflow integration
- PPR system compatibility
- Error handling and edge cases

### 4.2 Create Migration Utilities

**New file:** `dnas/nondominium/zomes/coordinator/zome_person/src/migration.rs`

**Key functions to implement:**
```rust
#[hdk_extern]
pub fn migrate_old_private_data_system(_: ()) -> ExternResult<MigrationResult> {
    // Find existing DataAccessGrant entries
    // Convert to native capability grants
    // Migrate SharedPrivateData to capability-based access
    // Clean up old entries
    // Report migration status
}

#[hdk_extern]
pub fn cleanup_old_system_entries(_: ()) -> ExternResult<CleanupResult> {
    // Remove old DataAccessGrant entries
    // Remove old SharedPrivateData entries
    // Remove old DataAccessRequest entries
    // Clean up unused links
}
```

### 4.3 Update Private Data Storage

**File to modify:** `dnas/nondominium/zomes/coordinator/zome_person/src/private_data.rs`

**Changes required:**
```rust
#[hdk_extern]
pub fn store_private_person_data(input: PrivatePersonDataInput) -> ExternResult<Record> {
    // Keep existing functionality but ensure private visibility
    // Simplify link structure - focus on agent-based access
    // Remove complex discovery patterns
    // Use native capability validation for access
}

#[hdk_extern]
pub fn get_my_private_person_data(_: ()) -> ExternResult<Option<PrivatePersonData>> {
    // Keep existing functionality for owner access
    // Simplify retrieval logic
    // Remove complex link traversal
}
```

## Phase 5: Performance Optimization

### 5.1 Optimize DHT Queries

**Files to modify:**
- `dnas/nondominium/zomes/coordinator/zome_person/src/capability_grants.rs`
- `dnas/nondominium/zomes/coordinator/zome_person/src/capability_claims.rs`

**Optimizations:**
- Use native Holochain capability validation instead of manual link traversal
- Implement efficient caching for frequently accessed grants
- Optimize grant discovery patterns
- Reduce redundant DHT calls

### 5.2 Implement Cleanup Routines

**New file:** `dnas/nondominium/zomes/coordinator/zome_person/src/maintenance.rs`

**Key functions to implement:**
```rust
#[hdk_extern]
pub fn cleanup_expired_capabilities(_: ()) -> ExternResult<CleanupResult> {
    // Find and remove expired capability grants
    // Clean up orphaned claims
    // Update access logs
}

#[hdk_extern]
pub fn maintenance_check(_: ()) -> ExternResult<MaintenanceReport> {
    // Check system health
    // Report expired grants needing cleanup
    // Validate data consistency
}
```

## Implementation Dependencies

### Prerequisites
1. Holochain HDK 0.5.3 / HDI 0.6.3 (already available)
2. Understanding of Holochain capability token system
3. Comprehensive test coverage for existing functionality
4. Backup of existing private data system

### Dependencies Between Phases
- Phase 1 must be completed before Phase 2
- Phase 2 can be developed in parallel with Phase 3
- Phase 4 depends on completion of Phases 1-3
- Phase 5 can begin after Phase 4 is partially complete

## Risk Mitigation

### Technical Risks
1. **Capability System Complexity**: Mitigate with comprehensive testing and gradual rollout
2. **Data Migration Issues**: Mitigate with backup systems and rollback procedures
3. **Performance Degradation**: Mitigate with performance testing and optimization
4. **Governance Integration Issues**: Mitigate with thorough integration testing

### Business Risks
1. **Disruption to Existing Workflows**: Mitigate with parallel running of old and new systems
2. **Data Loss**: Mitigate with comprehensive backup and verification procedures
3. **User Experience Issues**: Mitigate with clear documentation and support

## Success Metrics

### Technical Metrics
- All private data uses Holochain private entry visibility
- 100% of access control uses native capability tokens
- <200ms response time for access validation
- 95% test coverage for new functionality
- Zero data loss during migration

### Business Metrics
- Seamless integration with existing governance workflows
- Improved user experience for private data sharing
- Enhanced security and privacy protections
- Maintained system reliability during transition
- Positive user feedback on new capability system

## Timeline

### Phase 1: 2-3 weeks
- Capability system foundation
- Basic grant/claim functionality
- Core testing

### Phase 2: 2-3 weeks
- Governance integration
- PPR system compatibility
- Workflow testing

### Phase 3: 2 weeks
- Integrity zome migration
- Validation logic centralization
- Security testing

### Phase 4: 2-3 weeks
- Comprehensive testing
- Migration utilities
- Data validation

### Phase 5: 1-2 weeks
- Performance optimization
- Cleanup routines
- Final testing

**Total estimated timeline: 9-13 weeks**

## Rollback Plan

### If Issues Arise During Implementation
1. Maintain old system in parallel during development
2. Gradual rollout with feature flags
3. Comprehensive testing before deployment
4. Clear rollback procedures and communication

### If Migration Issues Occur
1. Stop migration process immediately
2. Restore from backup if necessary
3. Investigate and fix issues
4. Re-attempt migration with fixes applied