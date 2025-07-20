# 🧪 Nondominium hApp Test Strategy

## Overview

This document outlines the comprehensive testing approach for the Nondominium Holochain application, designed to ensure reliability, scalability, and proper functioning across all components.

## Test Architecture

Our testing follows a **layered approach** based on Holochain community best practices:

```
📊 Test Layers (Bottom-up)
├── 🔧 Foundation Tests     - Basic connectivity & function calls
├── 🧩 Unit Tests          - Individual zome functionality 
├── 🔗 Integration Tests   - Cross-zome & multi-agent interactions
├── 🎭 Scenario Tests      - Real-world usage patterns
└── ⚡ Performance Tests   - Scalability & timing validation
```

## Test Files Structure

```
tests/src/nondominium/nondominium/
├── common.ts                    # Test utilities & helpers
├── foundation-tests.test.ts     # 🔧 Basic connectivity tests
├── integration-tests.test.ts    # 🔗 Multi-agent interactions
├── scenario-tests.test.ts       # 🎭 Real-world scenarios
└── TEST_STRATEGY.md            # This documentation
```

## Test Categories

### 🔧 Foundation Tests (`foundation-tests.test.ts`)

**Purpose**: Verify basic zome connectivity and entry creation
**Scope**: Single agent, individual function calls
**Critical for**: Initial debugging and API compatibility

**Tests Include**:
- ✅ Basic Connectivity Test
- ✅ Person Creation Test  
- ✅ Person Profile Retrieval Test
- ✅ Encrypted Data Storage Test
- ✅ Get All Agents Test
- ✅ Error Handling Test

### 🔗 Integration Tests (`integration-tests.test.ts`)

**Purpose**: Verify multi-agent interactions and cross-zome functionality
**Scope**: Multiple agents, DHT synchronization, discovery
**Critical for**: Ensuring distributed functionality works

**Tests Include**:
- ✅ Two Agents Create Profiles
- ✅ Role Assignment Cross-Agent
- ✅ Community Discovery Test
- ✅ DHT Consistency Test

### 🎭 Scenario Tests (`scenario-tests.test.ts`)

**Purpose**: Simulate real-world usage patterns and workflows
**Scope**: Complete user journeys, complex interactions
**Critical for**: Validating user experience and business logic

**Scenarios Include**:
- ✅ New Community Member Onboarding
- ✅ Community Governance Evolution
- ✅ Privacy and Trust Verification

## Test Utilities (`common.ts`)

### Data Factories
- `createTestPerson()` - Standard person profile data
- `createTestPersonVariation(suffix)` - Unique person profiles for multi-agent tests
- `createTestEncryptedData()` - Sample encrypted identity data
- `createTestRole()` - Standard role assignment data

### Validation Helpers
- `validatePersonCreation()` - Comprehensive person entry validation
- `validateEncryptedDataCreation()` - Encrypted data validation
- `validateAgentProfile()` - Profile retrieval validation

### Test Management
- `logTestStart(testName)` - Standardized test logging
- `logTestEnd(testName, success)` - Test completion logging
- `waitForDHTSync(ms)` - DHT synchronization delays
- `expectError()` - Error testing helper

### Multi-Agent Helpers
- `createMultipleAgents()` - Setup multiple test agents
- DHT consistency validation utilities

## Running Tests

### Prerequisites

1. **Build the hApp bundle**:
   ```bash
   cd /home/messeru/Nondominium
   nix develop
   hc app pack workdir
   ```

2. **Install test dependencies**:
   ```bash
   cd tests
   npm install
   ```

### Running Test Suites

```bash
cd tests

# Run all tests
npm test

# Run specific test files
npx vitest foundation-tests.test.ts
npx vitest integration-tests.test.ts  
npx vitest scenario-tests.test.ts

# Run tests in watch mode (for development)
npx vitest --watch

# Run tests with verbose output
npx vitest --reporter=verbose
```

### Debug Mode

For detailed debugging information:

```bash
# Environment variable for extra logging
DEBUG=true npx vitest foundation-tests.test.ts

# Run single test with max detail
npx vitest --run foundation-tests.test.ts --reporter=verbose
```

## Test Development Guidelines

### 1. **Test Naming Convention**
- Use descriptive test names: `"🧪 Two Agents Create Profiles"`
- Include emoji indicators for test types
- Group related tests in `describe()` blocks

### 2. **Test Structure Pattern**
```typescript
test("🧪 Test Name", async () => {
  const testName = "Test Name";
  logTestStart(testName);
  
  try {
    await runScenario(async (scenario: Scenario) => {
      // Test implementation
    });
    
    logTestEnd(testName, true);
  } catch (error) {
    logTestEnd(testName, false);
    throw error;
  }
}, defaultTimeout);
```

### 3. **DHT Synchronization**
Always include appropriate wait times for DHT sync:
```typescript
await waitForDHTSync(2000); // 2 seconds for basic operations
await waitForDHTSync(5000); // 5 seconds for complex operations
```

### 4. **Validation Best Practices**
- Use validation helpers from `common.ts`
- Include both positive and negative test cases
- Verify all expected fields and data types
- Test boundary conditions and error cases

### 5. **Multi-Agent Test Patterns**
```typescript
const [alice, bob]: Player[] = await scenario.addPlayersWithApps([
  { bundle: { path: "../workdir/nondominium.happ" }, agentName: "alice" },
  { bundle: { path: "../workdir/nondominium.happ" }, agentName: "bob" }
]);
```

## Current Test Coverage

### Phase 1 Foundation Layer Coverage

| Component | Foundation Tests | Integration Tests | Scenario Tests |
|-----------|------------------|-------------------|----------------|
| **Person Management** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Identity Storage** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Role Assignment** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Community Discovery** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Privacy Boundaries** | ✅ Basic | ✅ Complete | ✅ Complete |
| **DHT Consistency** | ⚠️ Basic | ✅ Complete | ✅ Complete |

### To Be Added (Phase 2+)
- 🔲 Resource Management Tests
- 🔲 Governance Process Tests  
- 🔲 Economic Event Tests
- 🔲 Validation Framework Tests
- 🔲 Performance & Scalability Tests

## Debugging Test Issues

### Common Issues & Solutions

1. **"Bundle not found" errors**:
   ```bash
   cd workdir && hc app pack .
   ```

2. **DHT sync timing issues**:
   - Increase `waitForDHTSync()` delays
   - Check that all agents are creating entries successfully

3. **Hash conversion errors**:
   - Verify agent pub keys are being passed correctly
   - Check that entries are created before trying to retrieve them

4. **Validation failures**:
   - Log all response data for inspection
   - Verify expected vs actual data structures
   - Check that test data factories match zome expectations

### Useful Debug Commands
```bash
# Check hApp bundle structure
hc app unpack workdir/nondominium.happ

# Verify DNA compilation
cargo check --manifest-path dnas/nondominium/zomes/coordinator/nondominium/Cargo.toml

# Test individual zome functions
hc sandbox generate --run=8888 workdir/nondominium.happ
```

## Best Practices Summary

1. **🎯 Start with Foundation Tests**: Ensure basic connectivity before complex scenarios
2. **⏱️ Respect DHT Timing**: Always wait for synchronization in multi-agent tests  
3. **📝 Log Everything**: Use test logging helpers for better debugging
4. **🔄 Test Both Ways**: Verify operations work from multiple agent perspectives
5. **🛡️ Test Error Cases**: Include negative tests for robust validation
6. **📊 Validate Completely**: Use validation helpers to check all expected fields
7. **🔍 Debug Systematically**: Use layered approach to isolate issues

## Continuous Integration

Tests are designed to run in CI environments with:
- Consistent test data and timing
- Proper cleanup between test runs
- Clear pass/fail indicators
- Detailed logging for debugging failures

---

*This test strategy ensures robust validation of the Nondominium hApp across all critical functionality areas while providing clear debugging pathways for development.* 