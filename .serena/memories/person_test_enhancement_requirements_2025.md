# Person Test Enhancement Requirements - Action Item

## Background
Successfully implemented Person-Centric Link Strategy but need to review and enhance person tests to properly validate the new system capabilities.

## Current Test Status
**Passing Tests**: 7 integration tests working correctly
- Basic person discovery and interaction
- Privacy boundaries
- Role assignment and validation
- Capability level consistency
- DHT synchronization

**Missing Test Coverage**: Person-Centric specific capabilities

## Required Test Enhancements

### 1. Multi-Device Management Tests
**File**: `tests/src/nondominium/person/person-multi-device-tests.test.ts` (NEW)

**Test Cases Needed**:
```typescript
describe('Multi-Device Person Management', () => {
  test('should register multiple devices for same person');
  test('should retrieve all devices for a person');
  test('should update device activity tracking');
  test('should handle device session management');
  test('should maintain person identity across devices');
});
```

### 2. Person-Centric Role Access Tests
**File**: Enhance existing `person-integration-tests.test.ts`

**Additional Test Cases**:
```typescript
describe('Person-Centric Role Access', () => {
  test('should assign roles to person (not agent)');
  test('should validate roles work across all person devices');
  test('should maintain role consistency across devices');
  test('should handle person capability level evaluation');
});
```

### 3. Cross-Device Data Access Tests
**File**: Enhance existing `person-foundation-tests.test.ts`

**Additional Test Cases**:
```typescript
describe('Cross-Device Data Access', () => {
  test('should access private data from different devices');
  test('should maintain data consistency across devices');
  test('should validate device-based access policies');
  test('should test Person → Data access pattern');
});
```

### 4. AgentPersonRelationship Tests
**File**: `tests/src/nondominium/person/person-relationship-tests.test.ts` (NEW)

**Test Cases Needed**:
```typescript
describe('Agent-Person Relationship Management', () => {
  test('should create AgentPersonRelationship');
  test('should prevent duplicate relationships');
  test('should handle relationship lookup and resolution');
  test('should validate relationship integrity');
});
```

### 5. Device Security Policy Tests
**File**: `tests/src/nondominium/person/person-device-security-tests.test.ts` (NEW)

**Test Cases Needed**:
```typescript
describe('Device Security Policies', () => {
  test('should enforce device-based access control');
  test('should track device sessions for security');
  test('should handle device revocation and access removal');
  test('should validate device capability management');
});
```

### 6. Backward Compatibility Tests
**File**: Enhance existing tests

**Additional Test Cases**:
```typescript
describe('Backward Compatibility', () => {
  test('should maintain existing Agent-based access patterns');
  test('should support legacy Agent → Data access');
  test('should ensure smooth migration from Agent-centric');
  test('should validate cross-zome compatibility');
});
```

## Implementation Plan

### Phase 1: Foundation Tests
1. Create `person-multi-device-tests.test.ts`
2. Create `person-relationship-tests.test.ts`
3. Add basic device registration and management tests

### Phase 2: Cross-Device Validation
1. Create `person-device-security-tests.test.ts`
2. Enhance existing integration tests for Person-centric access
3. Add cross-device consistency tests

### Phase 3: Security and Compatibility
1. Add device security policy tests
2. Add backward compatibility validation
3. Add cross-zome integration tests

### Phase 4: Edge Cases
1. Error handling for invalid device operations
2. Network failure scenarios
3. Concurrent device access patterns

## Key Test Patterns to Validate

### Multi-Device Pattern
```typescript
// Register multiple devices for same person
const person1 = await alice.client.callZome({
  zome_name: "zome_person",
  fn_name: "create_person",
  payload: { name: "Alice Person", avatar_url: null, bio: null }
});

const device1 = await alice.client.callZome({
  zome_name: "zome_person", 
  fn_name: "register_device_for_person",
  payload: { device_type: "mobile", device_name: "Alice Phone", capabilities: ["camera", "gps"] }
});

const device2 = await bob.client.callZome({
  zome_name: "zome_person",
  fn_name: "register_device_for_person", 
  payload: { device_type: "desktop", device_name: "Alice Desktop", capabilities: ["file_access"] }
});

// Verify both devices access same person data
const alicePersonFromDevice1 = await alice.client.callZome({
  zome_name: "zome_person",
  fn_name: "get_agent_person",
  payload: alice.agentPubKey
});

const alicePersonFromDevice2 = await bob.client.callZome({
  zome_name: "zome_person", 
  fn_name: "get_agent_person",
  payload: bob.agentPubKey
});

// Should resolve to same person
expect(alicePersonFromDevice1).toEqual(alicePersonFromDevice2);
```

### Person-Centric Role Pattern
```typescript
// Assign role to person (works across all devices)
await alice.client.callZome({
  zome_name: "zome_person",
  fn_name: "assign_person_role",
  payload: {
    agent_pubkey: alice.agentPubKey,
    role_name: "Accountable Agent",
    description: "Validated accountable agent"
  }
});

// Verify role accessible from any device
const rolesFromDevice1 = await alice.client.callZome({
  zome_name: "zome_person",
  fn_name: "get_person_roles", 
  payload: alice.agentPubKey
});

const rolesFromDevice2 = await bob.client.callZome({
  zome_name: "zome_person",
  fn_name: "get_person_roles",
  payload: bob.agentPubKey  
});

// Should return same roles for the person
expect(rolesFromDevice1).toEqual(rolesFromDevice2);
```

## Success Criteria
- All new tests pass consistently
- Multi-device scenarios fully validated
- Person-centric access patterns confirmed working
- Backward compatibility maintained
- Cross-zome integration validated
- Device security policies tested

## Timeline Estimate
- **Phase 1**: 2-3 hours (foundation tests)
- **Phase 2**: 2-3 hours (cross-device validation)  
- **Phase 3**: 1-2 hours (security and compatibility)
- **Phase 4**: 1-2 hours (edge cases)
- **Total**: 6-10 hours of test development

## Tools and Patterns Needed
- Use existing test patterns from `person-integration-tests.test.ts`
- Follow Tryorama best practices for multi-agent scenarios
- Leverage existing test utilities from `src/nondominium/utils.ts`
- Use Vitest test patterns for consistency

This test enhancement is critical to validate the new Person-Centric architecture works correctly across all intended use cases.