# Person Zome Implementation Guide

## Overview
This document describes the **actual implemented** Person zome functionality in the nondominium project.

**File Location**: `/dnas/nondominium/zomes/coordinator/zome_person/`

## Implemented Modules

### 1. Person Management (`person.rs`)

#### Core Functions

**`create_person(input: CreatePersonInput) -> ExternResult<ActionHash>`**
- Creates a new person profile with public information
- Requires: name, optional avatar
- Returns: ActionHash of the created person entry
- Links: Creates `AgentToPerson` link for discovery

**`update_person(input: UpdatePersonInput) -> ExternResult<Record>`**
- Updates an existing person's profile
- Requires: person_hash, new name, optional avatar
- Validates: Only the person owner can update their profile
- Returns: Updated record

**`get_my_person() -> ExternResult<Option<Record>>`**
- Retrieves the calling agent's person profile
- Returns: Person record or None if not found
- Used by: UI for profile display

**`get_person(person_hash: ActionHash) -> ExternResult<Option<Record>>`**
- Retrieves any person's public profile by hash
- Returns: Person record or None if not found
- Used by: Other agents for discovery

### 2. Private Data Management (`private_data.rs`)

#### Core Functions

**`create_private_data(input: CreatePrivateDataInput) -> ExternResult<ActionHash>`**
- Creates private data entry with encrypted personal information
- Fields: legal_name, address, email, phone, identification documents
- Storage: Holochain private entry (only accessible by owner)
- Returns: ActionHash of private data entry

**`update_private_data(input: UpdatePrivateDataInput) -> ExternResult<Record>`**
- Updates existing private data
- Requires: private_data_hash, updated fields
- Validates: Only the data owner can update
- Returns: Updated private data record

**`get_my_private_data() -> ExternResult<Option<Record>>`**
- Retrieves calling agent's private data
- Returns: Private data record or None
- Privacy: Only accessible by the owner

### 3. Private Data Sharing (`private_data_sharing.rs`)

#### Data Access Request System

**`request_private_data_access(input: DataAccessRequestInput) -> ExternResult<ActionHash>`**
- Creates a request to access another agent's private data
- Fields: target_agent, requested_fields, purpose, expiration
- Process: Target agent receives notification and can approve/deny
- Returns: ActionHash of the request

**`respond_to_data_request(input: DataRequestResponseInput) -> ExternResult<Record>`**
- Responds to a private data access request
- Options: Approve (with optional field restrictions) or Deny
- Creates: DataAccessGrant entry if approved
- Notifications: Notifies requester of decision

**`get_data_access_requests() -> ExternResult<Vec<Record>>`**
- Retrieves all pending data access requests for calling agent
- Used by: UI for displaying pending requests
- Filters: Can filter by status (pending, approved, denied)

#### Data Access Grant System

**`grant_private_data_access(input: GrantPrivateDataAccessInput) -> ExternResult<ActionHash>`**
- Directly grants access to private data without request process
- Fields: target_agent, accessible_fields, expiration_time, conditions
- Privacy: Owner maintains full control over what's shared
- Returns: ActionHash of the access grant

**`get_granted_private_data(grant_hash: ActionHash) -> ExternResult<Option<PrivateDataView>>`**
- Retrieves private data through an access grant
- Validates: Grant is still valid and not expired
- Filters: Returns only fields specified in the grant
- Security: Cross-validates grant permissions

**`revoke_data_access_grant(grant_hash: ActionHash) -> ExternResult<Record>`**
- Revokes an existing data access grant
- Immediate: Access is terminated immediately
- Audit: Creates revocation record for audit trail
- Notifications: Notifies affected agents

### 4. Role Management (`role.rs`)

#### Core Functions

**`assign_role(input: AssignRoleInput) -> ExternResult<ActionHash>`**
- Assigns a role to an agent
- Roles: User, Transport, Storage, Repair, Validator
- Process: May require validation depending on role type
- Creates: RoleAssignment entry with validation metadata
- Returns: ActionHash of the role assignment

**`get_agent_roles(agent_pub_key: AgentPubKey) -> ExternResult<Vec<Record>>`**
- Retrieves all roles assigned to a specific agent
- Used by: Other agents for capability verification
- Returns: List of role assignment records

**`validate_role_assignment(input: ValidateRoleAssignmentInput) -> ExternResult<ValidationReceipt>`**
- Validates a role assignment (for specialized roles)
- Required for: Transport, Storage, Repair roles
- Process: Existing role holders must validate new assignments
- Creates: ValidationReceipt confirming the validation

**`remove_role(input: RemoveRoleInput) -> ExternResult<Record>`**
- Removes a role assignment from an agent
- Validates: Only the assigner or system can remove roles
- Archive: Role assignment is archived for audit purposes
- Returns: Updated role assignment record

### 5. Audit and Notifications (`audit_and_notifications.rs`)

#### Audit Trail Functions

**`create_audit_log(input: CreateAuditLogInput) -> ExternResult<ActionHash>`**
- Creates an audit log entry for significant actions
- Types: Role changes, data access grants, validation events
- Storage: Private entry for security and privacy
- Returns: ActionHash of the audit log entry

**`get_audit_logs(filter: AuditLogFilter) -> ExternResult<Vec<Record>>`**
- Retrieves audit logs based on filter criteria
- Filters: By agent, action type, date range
- Privacy: Only accessible by the audit owner
- Used by: Compliance and security monitoring

## Data Structures

### Person Entry
```rust
pub struct Person {
    pub name: String,
    pub avatar: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}
```

### Private Data Entry
```rust
pub struct PrivateData {
    pub legal_name: Option<String>,
    pub address: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub identification: Option<IdentificationDocuments>,
    pub created_at: Timestamp,
}
```

### Role Assignment
```rust
pub struct RoleAssignment {
    pub agent: AgentPubKey,
    pub role: Role,
    pub assigned_by: AgentPubKey,
    pub assigned_at: Timestamp,
    pub validated_by: Option<AgentPubKey>,
    pub validation_receipt: Option<ActionHash>,
}
```

### Data Access Request
```rust
pub struct DataAccessRequest {
    pub requester: AgentPubKey,
    pub target_agent: AgentPubKey,
    pub requested_fields: Vec<String>,
    pub purpose: String,
    pub expires_at: Timestamp,
    pub status: RequestStatus,
    pub created_at: Timestamp,
}
```

### Data Access Grant
```rust
pub struct DataAccessGrant {
    pub granter: AgentPubKey,
    pub grantee: AgentPubKey,
    pub accessible_fields: Vec<String>,
    pub expires_at: Timestamp,
    pub conditions: Option<String>,
    pub created_at: Timestamp,
}
```

## Error Handling

### PersonError Enum
```rust
pub enum PersonError {
    PersonAlreadyExists,
    PersonNotFound(String),
    PrivateDataNotFound,
    NotAuthorized,
    InvalidInput(String),
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InsufficientCapability(String),
}
```

## Security Features

### Capability-Based Access Control
- Functions require appropriate capability tokens
- Role-based access to sensitive operations
- Cross-zome capability validation

### Privacy Protection
- Private data stored as Holochain private entries
- Selective disclosure through access grants
- Audit trail of all data access

### Validation System
- Role assignments require validation for specialized roles
- Cross-zome validation for critical operations
- Validation receipts for audit purposes

## Usage Examples

### Creating a Person with Private Data
```rust
// Create public person profile
let person_input = CreatePersonInput {
    name: "Alice".to_string(),
    avatar: Some("https://example.com/avatar.jpg".to_string()),
};
let person_hash = create_person(person_input)?;

// Create private data
let private_data_input = CreatePrivateDataInput {
    legal_name: Some("Alice Smith".to_string()),
    email: Some("alice@example.com".to_string()),
    // ... other private fields
};
let private_data_hash = create_private_data(private_data_input)?;
```

### Sharing Private Data
```rust
// Grant access to specific fields
let grant_input = GrantPrivateDataAccessInput {
    target_agent: bob_pub_key,
    accessible_fields: vec!["email".to_string(), "legal_name".to_string()],
    expires_at: sys_time()? + Duration::from_secs(7 * 24 * 60 * 60), // 7 days
    conditions: Some("For verification purposes only".to_string()),
};
let grant_hash = grant_private_data_access(grant_input)?;

// Bob can now access the granted data
let private_data = get_granted_private_data(grant_hash)?;
```

### Role Assignment with Validation
```rust
// Assign specialized role (requires validation)
let role_input = AssignRoleInput {
    target_agent: carol_pub_key,
    role: Role::Transport,
    notes: Some("Experienced in logistics".to_string()),
};
let role_hash = assign_role(role_input)?;

// Existing role holder validates
let validation_input = ValidateRoleAssignmentInput {
    role_assignment_hash: role_hash,
    approved: true,
    notes: Some("Verified transport capabilities".to_string()),
};
let validation_receipt = validate_role_assignment(validation_input)?;
```

## Integration Points

### With Resource Zome
- Role validation for resource operations
- Private data access for resource validation

### With Governance Zome
- PPR generation for role validation activities
- Validation receipts for role assignments

### Cross-Zome Functions
- `validate_agent_identity()` - Uses private data for validation
- `check_role_requirements()` - Validates agent roles across zomes

## Testing

The Person zome has comprehensive test coverage:
- Unit tests for all core functions
- Integration tests for cross-zome interactions
- Scenario tests for complete workflows
- Privacy and security tests

## Known Limitations

1. **Performance**: No optimization for large-scale private data sharing
2. **Revocation**: Immediate revocation but may have cache delays
3. **Field Validation**: Basic validation, could be enhanced
4. **Notification System**: Basic implementation, could be more sophisticated

## Future Enhancements

1. **Advanced Access Control**: Time-based and conditional access grants
2. **Data Encryption**: End-to-end encryption for sensitive data
3. **Notification System**: Real-time notifications for requests and grants
4. **Compliance Tools**: Enhanced audit and reporting features