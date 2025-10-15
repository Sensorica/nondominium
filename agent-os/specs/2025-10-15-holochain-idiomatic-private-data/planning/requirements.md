# Requirements: Holochain-Idiomatic Private Data

## User Stories

As a **network participant**, I want my personal data to be completely private by default so that only I can access it without explicit permission.

As a **custodian transferring resources**, I want to grant temporary access to my contact information to other agents so they can reach me for resource-related matters.

As a **governance validator**, I want to access agents' private data through their explicit permission so I can validate their identity for role promotions and dispute resolution.

As a **service provider** (transport/repair/storage), I want to request access to clients' location and contact information so I can provide timely and effective services.

As a **dispute resolution participant**, I want to access past custodians' private data through granted permissions so I can help resolve conflicts when resources become unavailable.

## Core Requirements

### Functional Requirements

#### 1. Holochain Native Implementation
- Replace current DataAccessGrant + SharedPrivateData system with Holochain's native CapGrant + CapClaim system
- Use `EntryVisibility::Private` for all PrivatePersonData entries
- Implement author-based capabilities where agents explicitly allow others to access personal data
- Leverage Holochain's built-in `create_cap_grant()` and `create_cap_claim()` functions
- Use native DHT querying instead of complex link traversals

#### 2. Capability Token System
- Implement time-limited access grants for private data sharing
- Support field-level access control (specific fields only)
- Enable context-based access (custodian transfer, governance validation, service provision)
- Support automatic grant creation for governance workflows
- Enable grant revocation and expiration management

#### 3. Governance Integration
- Maintain governance integration for agent promotion validation workflows
- Support dispute resolution through past custodian private data access
- Enable PPR (Private Participation Receipt) system with capability-based access
- Support validation workflows requiring private data verification
- Integrate with economic event validation and role assignment

#### 4. Data Privacy and Access Control
- Make data completely private (only visible to author, shared via capabilities)
- Implement selective field disclosure based on granted permissions
- Support context-aware access control (different permissions for different contexts)
- Maintain audit trail of all access grants and claims
- Enable automatic cleanup of expired grants and claims

### Non-Functional Requirements

#### 1. Security Requirements
- All private data must use Holochain's private entry visibility
- Access control enforced through capability tokens, not manual checks
- Cryptographic validation of all capability grants and claims
- Protection against unauthorized access through proper capability validation

#### 2. Performance Requirements
- Efficient DHT querying using native Holochain patterns
- Minimize complex link traversals and redundant validation logic
- Fast grant creation and claim validation (<200ms response time)
- Efficient cleanup of expired capabilities

#### 3. Usability Requirements
- Simple API for agents to grant and request access
- Clear status indicators for pending, active, and expired grants
- Intuitive context-based permission management
- Easy revocation and modification of existing grants

#### 4. Reliability Requirements
- Graceful handling of capability expiration
- Robust error handling for invalid or revoked capabilities
- Consistent behavior across all DHT participants
- Proper cleanup of orphaned or expired entries

## Visual Design

### Current System Issues
- Complex manual grant system with custom entries
- Inefficient DHT querying with multiple link traversal patterns
- Redundant validation logic that should be in integrity zome
- Manual access control instead of using Holochain's capability system

### Target Architecture
- Native Holochain capability tokens (CapGrant/CapClaim)
- Private entry visibility for all sensitive data
- Streamlined DHT queries with native patterns
- Unified validation in integrity zome

## Reusable Components

### Existing Code to Leverage
- PrivatePersonData entry structure (with private visibility)
- Governance workflow integration points
- PPR system for reputation tracking
- Agent role management system
- Validation framework in integrity zome

### New Components Required
- Holochain-native capability grant/claim management
- Field-level access control using capability functions
- Context-based permission system
- Automated grant creation for governance workflows
- Native DHT query patterns for private data access

## Technical Approach

### Data Model Changes
- Maintain PrivatePersonData with EntryVisibility::Private
- Replace DataAccessGrant with native CapGrant entries
- Replace SharedPrivateData with dynamic access via CapClaim
- Implement context-based capability functions for different access scenarios
- Use capability tags for field-level access control

### API Design
- `create_private_data_grant(fields, context, duration, grantee)` -> CapGrant
- `claim_private_data_access(grant_hash, fields, context)` -> CapClaim
- `validate_private_data_access(claim_hash, context)` -> ValidationResult
- `revoke_private_data_grant(grant_hash)` -> RevocationResult
- `get_accessible_private_data(claim_hash)` -> PrivatePersonData

### Implementation Strategy
1. Create new capability-based private data module
2. Implement grant/claim functions using Holochain native patterns
3. Migrate existing validation logic to integrity zome
4. Update governance workflows to use new capability system
5. Implement cleanup and maintenance functions
6. Add comprehensive test coverage

## Out of Scope

### Features Not Being Built Now
- Advanced encryption beyond Holochain's private entry system
- Cross-network private data sharing
- Complex conditional access rules (beyond basic context and field control)
- Anonymous or pseudonymous private data sharing
- Private data backup and recovery systems

### Future Enhancements
- Automated grant renewal and extension
- Bulk grant operations for governance workflows
- Advanced audit and reporting features
- Integration with external identity verification systems
- Private data inheritance and delegation patterns

## Success Criteria

- **Complete Privacy**: All private data uses Holochain private entry visibility
- **Native Capabilities**: All access control uses Holochain's native CapGrant/CapClaim system
- **Performance Improvement**: Reduced DHT query complexity and faster access validation
- **Governance Integration**: Seamless integration with existing governance workflows
- **Developer Experience**: Simplified API for private data access management
- **Test Coverage**: Comprehensive test coverage for all new functionality
- **Migration Success**: Smooth migration from current system without data loss