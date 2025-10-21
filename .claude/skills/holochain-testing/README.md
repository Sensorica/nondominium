# Holochain Testing Skill for nondominium

## Overview

This skill provides interactive guidance for Holochain testing with exact command selection and 4-layer testing strategy, specifically tailored for the nondominium ValueFlows-compliant resource sharing application.

## Key Features

### 🧪 4-Layer Testing Strategy
- **Foundation Tests**: Basic zome function calls and connectivity validation
- **Integration Tests**: Cross-zome interactions and multi-agent scenarios
- **Scenario Tests**: Complete user journeys and end-to-end workflows
- **Performance Tests**: Load testing and PPR system optimization

### 🎯 Exact Command Selection
- **Test Command Precision**: Choose the right command for specific testing needs
- **File-Specific Testing**: Run individual test files or test patterns
- **Multi-Agent Configuration**: Configure custom agent setups for testing
- **Environment Mode Testing**: Development vs test vs production mode testing

### 📊 Project-Specific Testing
- **Person Zome Testing**: Identity, roles, private data, capability validation
- **Resource Zome Testing**: EconomicResource lifecycle, governance rules, transfers
- **Governance Zome Testing**: Commitments, claims, economic events, PPR validation
- **ValueFlows Testing**: Economic event testing and resource tracking validation

### 🔍 Testing Guidance & Quality
- **Test Coverage Analysis**: Ensure comprehensive test coverage across all zomes
- **Multi-Agent Test Design**: Proper agent setup with roles and permissions
- **Test Data Generation**: Realistic test data for ValueFlows scenarios
- **Debug Support**: Analyze test failures and suggest solutions

## How to Use

### Command Selection Examples

Ask Claude questions like:

- "What command runs just the person foundation tests?"
- "Which test should I run for PPR system validation?"
- "Generate a test for create_person function"
- "Help me debug this failing integration test"
- "What test coverage do I have for the governance zome?"

### Interactive Testing Guidance

**Foundation Testing**:
```
User: "I need to test a new function in the person zome"

Skill: I'll help you create comprehensive foundation tests:

1. **Test Structure**: Foundation test for individual zome functions
2. **Test Cases**: Success scenarios, error handling, edge cases
3. **Test Data**: Sample data following your project patterns
4. **Command**: Exact bun run tests command to execute

Would you like me to generate the complete test file?
```

**Integration Testing**:
```
User: "I want to test person-resource cross-zome interaction"

Skill: I'll design integration tests for cross-zome scenarios:

1. **Agent Setup**: Configure 2+ agents with appropriate roles
2. **Test Flow**: Person creates resource → resource validation → access control
3. **Validation**: Cross-zome data consistency and permissions
4. **Command**: Specific integration test command

Should I generate the complete integration test?
```

**Scenario Testing**:
```
User: "Create test for complete resource sharing workflow with PPR"

Skill: I'll create a comprehensive scenario test:

1. **Multi-Agent Setup**: Resource owner, admin, requester agents
2. **Workflow Steps**: Request → approval → grant → access verification
3. **PPR System**: Complete private data sharing workflow
4. **Complex Scenario**: Real-world user journey with validation

This will be a complete multi-agent scenario test. Ready to proceed?
```

## Test Commands Reference

### Complete Test Suite
```bash
# Run all tests (builds zomes + runs all test files)
bun run tests

# Run tests with verbose output
bun run tests --reporter=verbose
```

### Individual Zome Testing

#### Person Zome Tests
```bash
# Foundation tests
bun run tests tests/src/nondominium/person/person-foundation-tests.test.ts

# Integration tests
bun run tests tests/src/nondominium/person/person-integration-tests.test.ts

# Scenario tests
bun run tests tests/src/nondominium/person/person-scenario-tests.test.ts

# Private data sharing tests (PPR)
bun run tests tests/src/nondominium/person/person-private-data-sharing.test.ts
```

#### Resource Zome Tests
```bash
# Foundation tests
bun run tests tests/src/nondominium/resource/resource-foundation-tests.test.ts

# Integration tests
bun run tests tests/src/nondominium/resource/resource-integration-tests.test.ts

# Scenario tests
bun run tests tests/src/nondominium/resource/resource-scenario-tests.test.ts

# Update tests
bun run tests tests/src/nondominium/resource/resource-update-test.test.ts
```

#### Governance Zome Tests
```bash
# Foundation tests
bun run tests tests/src/nondominium/governance/governance-foundation-tests.test.ts

# PPR System tests (all)
bun run tests tests/src/nondominium/governance/ppr-system/ppr-*.test.ts

# Specific PPR tests
bun run tests tests/src/nondominium/governance/ppr-system/ppr-foundation.test.ts
bun run tests tests/src/nondominium/governance/ppr-system/ppr-integration.test.ts
bun run tests tests/src/nondominium/governance/ppr-system/ppr-scenarios.test.ts
```

### Testing by Category

```bash
# All foundation tests across all zomes
bun run tests tests/src/nondominium/**/*-foundation-tests.test.ts

# All integration tests
bun run tests tests/src/nondominium/**/*-integration-tests.test.ts

# All scenario tests
bun run tests tests/src/nondominium/**/*-scenario-tests.test.ts

# All PPR system tests
bun run tests tests/src/nondominium/governance/ppr-system/ppr-*.test.ts
```

## Test Templates

### Available Templates

1. **foundation_test_template.ts**: Foundation test structure for individual zome functions
2. **integration_test_template.ts**: Cross-zome interaction test patterns
3. **scenario_test_template.ts**: Multi-agent workflow test templates
4. **test_commands_reference.md**: Comprehensive command reference

### Template Usage

Templates provide ready-to-use test patterns:

```typescript
// From foundation_test_template.ts
test("create and retrieve Person", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Test implementation using your project patterns
      const personHash = await createPerson(agent1, personInput);
      assert.ok(personHash);

      const profile = await getMyProfile(agent1);
      assert.ok(profile);
      // ... more test logic
    }
  );
});
```

## Testing Strategy

### Foundation Testing

**Purpose**: Test individual zome functions in isolation

**What to Test**:
- Basic CRUD operations (create, get, update, delete)
- Data validation and error handling
- Input validation and edge cases
- Agent permissions and capabilities

**Example Test Pattern**:
```typescript
test("create_person with valid data", async () => {
  // Test successful person creation
});

test("create_person with invalid data", async () => {
  // Test error handling for invalid input
});

test("get_my_profile returns correct data", async () => {
  // Test data retrieval and accuracy
});
```

### Integration Testing

**Purpose**: Test cross-zome interactions and data flow

**What to Test**:
- Cross-zome communication (person ↔ resource ↔ governance)
- Data consistency across zomes
- Permission validation across zomes
- Error propagation between zomes

**Example Test Pattern**:
```typescript
test("person creates resource with governance", async () => {
  // Step 1: Person creates resource with embedded governance
  // Step 2: Verify governance rules are properly applied
  // Step 3: Test cross-zome data consistency
});
```

### Scenario Testing

**Purpose**: Test complete user journeys and workflows

**What to Test**:
- End-to-end user workflows
- Multi-agent collaboration scenarios
- Complex business processes
- Real-world usage patterns

**Example Test Pattern**:
```typescript
test("complete PPR workflow", async () => {
  // Setup: Create owner, admin, requester agents
  // Step 1: Owner creates resource with PPR-enabled governance
  // Step 2: Requester requests access via PPR
  // Step 3: Admin approves the PPR request
  // Step 4: Owner creates capability grant
  // Step 5: Verify requester can access resource
});
```

## Multi-Agent Testing

### Agent Configuration

**2-Agent Scenarios**:
```typescript
await runScenarioWithTwoAgents(
  async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
    // Basic two-agent interaction testing
  }
);
```

**3-Agent Scenarios**:
```typescript
await runScenarioWithThreeAgents(
  async (scenario: Scenario, owner: PlayerApp, admin: PlayerApp, requester: PlayerApp) => {
    // Complex three-agent workflow testing
  }
);
```

### Agent Role Setup

```typescript
// Setup agents with specific roles for testing
await createPerson(owner, { name: "Resource Owner", avatar_url: "" });
await assignPersonRole(owner, owner.agentPubKey, "admin");

await createPerson(requester, { name: "Resource Requester", avatar_url: "" });
await assignPersonRole(owner, requester.agentPubKey, "user");

await dhtSync([owner, requester]);
```

## PPR System Testing

### PPR Testing Strategy

The PPR (Private data, Purpose, Rights) system requires comprehensive testing:

1. **PPR Request Testing**: Test private data access requests
2. **Grant Validation Testing**: Test capability grant creation and validation
3. **Access Control Testing**: Test private data access with proper permissions
4. **Expiration Testing**: Test time-limited access and expiration handling
5. **Cryptographic Testing**: Test PPR cryptographic validation

### PPR Test Commands

```bash
# All PPR system tests
bun run tests tests/src/nondominium/governance/ppr-system/ppr-*.test.ts

# Specific PPR tests
bun run tests tests/src/nondominium/governance/ppr-system/ppr-foundation.test.ts      # Basic PPR functions
bun run tests tests/src/nondominium/governance/ppr-system/ppr-integration.test.ts     # Cross-zome PPR tests
bun run tests tests/src/nondominium/governance/ppr-system/ppr-scenarios.test.ts       # Complete PPR workflows
bun run tests tests/src/nondominium/governance/ppr-system/ppr-cryptography.test.ts    # PPR crypto validation
bun run tests tests/src/nondominium/governance/ppr-system/ppr-debug.test.ts            # PPR debugging tests
```

## Debugging Support

### Common Test Failures

**1. Agent Setup Issues**:
```bash
# Symptom: Tests fail with "Agent not found" or similar
# Solution: Ensure proper agent initialization and DHT sync
await dhtSync([agent1, agent2]);
```

**2. Cross-Zome Communication Issues**:
```bash
# Symptom: Integration tests fail with network errors
# Solution: Verify zome names and function signatures
# Check both zomes are in the same DNA
```

**3. Test Timeout Issues**:
```bash
# Symptom: Tests timeout after 4 minutes
# Solution: Increase timeout for complex scenarios
bun run tests tests/src/nondominium/governance/ppr-system/ppr-scenarios.test.ts --timeout=600000
```

**4. Build Issues**:
```bash
# Symptom: Tests fail to compile zomes
# Solution: Clean build and ensure Nix environment
nix develop --command bun run build:zomes
```

### Debug Questions

Ask Claude for help with:

- "This integration test is failing with 'Network error', can you help debug?"
- "My PPR test is timing out, what should I check?"
- "How do I test this specific cross-zome scenario?"
- "What test coverage am I missing for the governance zome?"

## Test Coverage Analysis

### Coverage Commands

```bash
# Generate coverage report
bun run tests --coverage

# Coverage for specific zome
bun run tests --coverage tests/src/nondominium/person/

# Coverage with specific reporter
bun run tests --coverage --reporter=html
```

### Coverage Analysis

Ask Claude for coverage analysis:

- "What test coverage do I have for the person zome?"
- "Which functions are not covered by tests?"
- "Generate tests for uncovered functions in resource zome"
- "Analyze my overall test coverage across all zomes"

## Best Practices

### Test Organization

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Test Isolation**: Each test should be independent
3. **Proper Cleanup**: Clean up test data after each test
4. **Realistic Data**: Use realistic test data following project patterns
5. **Error Testing**: Include negative test cases and error conditions

### Multi-Agent Testing

1. **Proper Initialization**: Always initialize agents before testing
2. **DHT Synchronization**: Allow time for DHT sync between operations
3. **Role Assignment**: Test different agent roles and permissions
4. **Concurrent Operations**: Test concurrent agent interactions
5. **Error Scenarios**: Test failure scenarios and recovery

### PPR Testing

1. **Complete Workflows**: Test entire PPR workflows from request to access
2. **Permission Validation**: Test access control and permission enforcement
3. **Time-Based Testing**: Test expiration and time-limited access
4. **Cryptographic Validation**: Test PPR cryptographic mechanisms
5. **Security Testing**: Test PPR security and privacy protections

## Integration with Holochain Development Skill

This skill works seamlessly with the Holochain Development Skill:

**Development → Testing Workflow**:
1. **Architecture Planning** (Holochain Development Skill)
2. **Implementation** (Holochain Development Skill)
3. **Test Generation** (Holochain Testing Skill)
4. **Test Execution** (Holochain Testing Skill)
5. **Debug Support** (Both skills)

Example:
```
User: "Implement ResourceProposal functionality with comprehensive tests"

Skill: I'll help you implement ResourceProposal with complete testing:

1. **Implementation** (Holochain Development Skill)
   - Integrity entry type design and validation
   - Coordinator functions with business logic
   - Cross-zome integration patterns

2. **Testing** (Holochain Testing Skill)
   - Foundation tests for CRUD operations
   - Integration tests for cross-zome scenarios
   - Scenario tests for complete workflows
   - Exact test commands for execution

Ready to proceed with both implementation and testing?
```

## Environment Requirements

### Prerequisites

```bash
# Ensure you're in Nix environment (required for zome compilation)
nix develop

# Install dependencies
bun install

# Build zomes before testing
bun run build:zomes
```

### Test Configuration

The skill provides guidance for:
- **Environment Setup**: Ensure proper Nix and toolchain configuration
- **Build Requirements**: Automatic zome compilation before testing
- **Agent Configuration**: Custom agent setups for different scenarios
- **Timeout Management**: Proper timeout settings for complex scenarios

## Performance Considerations

### Test Performance

1. **Parallel Execution**: Tests run in parallel where possible
2. **Timeout Optimization**: Use appropriate timeouts (4 minutes default)
3. **DHT Sync Optimization**: Minimize unnecessary DHT synchronization
4. **Test Isolation**: Ensure tests don't interfere with each other

### Resource Management

1. **Agent Cleanup**: Properly clean up agents after tests
2. **Data Cleanup**: Remove test data to prevent conflicts
3. **Memory Management**: Avoid memory leaks in long-running tests
4. **Network Optimization**: Minimize unnecessary network calls

## Future Enhancements

### Planned Additions

1. **Performance Testing**: Load testing templates for PPR system
2. **Security Testing**: Enhanced security and privacy testing patterns
3. **UI Integration**: Frontend testing integration patterns
4. **CI/CD Integration**: Automated testing pipeline templates
5. **Test Data Generation**: Advanced test data generation tools

### Custom Testing Patterns

Add your own testing patterns:

```bash
# Create custom test templates
mkdir .claude/skills/holochain-testing/templates/custom

# Add your project-specific test patterns
echo "Your custom test patterns" > templates/custom/your_tests.ts
```

---

This testing skill is designed to provide comprehensive testing guidance for your nondominium project, ensuring high-quality, reliable Holochain applications with proper validation of your ValueFlows and PPR system implementations.