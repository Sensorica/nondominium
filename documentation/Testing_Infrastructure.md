# Testing Infrastructure for Nondominium hApp

## Overview

The Nondominium hApp employs a comprehensive, multi-layered testing strategy designed specifically for Holochain applications. This testing infrastructure ensures robust validation of distributed functionality, proper DHT synchronization, and real-world usage patterns while providing clear debugging pathways for development.

## Testing Philosophy

Our testing approach follows **Holochain community best practices** with emphasis on:

- **Progressive Complexity**: Start with basic connectivity, build to complex scenarios
- **DHT-Aware Testing**: Accounts for distributed timing and synchronization requirements
- **Multi-Agent Focus**: Validates true peer-to-peer interactions
- **Real-World Scenarios**: Tests actual governance and community workflows
- **Privacy Validation**: Ensures proper private entry storage and access control boundaries (see https://developer.holochain.org/build/entries/)

## Test Architecture

### Layered Testing Approach

```
📊 Test Layers (Bottom-up approach)
├── 🔧 Foundation Tests     - Basic connectivity & function calls
├── 🧩 Unit Tests          - Individual zome functionality 
├── 🔗 Integration Tests   - Cross-zome & multi-agent interactions
├── 🎭 Scenario Tests      - Real-world usage patterns
└── ⚡ Performance Tests   - Scalability & timing validation (planned)
```

### Technology Stack

- **Framework**: [Vitest](https://vitest.dev/) - Fast, modern test runner
- **Holochain Testing**: [@holochain/tryorama](https://github.com/holochain/tryorama) - Official Holochain testing framework
- **Language**: TypeScript with full type safety
- **Assertion Library**: Built-in Vitest expect API
- **Environment**: Nix development shell for consistent Holochain binaries

## Test Structure

### Directory Layout

```
tests/
├── src/nondominium/nondominium/
│   ├── common.ts                    # Test utilities & data factories
│   ├── foundation-tests.test.ts     # 🔧 Basic connectivity tests
│   ├── integration-tests.test.ts    # 🔗 Multi-agent interactions
│   ├── scenario-tests.test.ts       # 🎭 Real-world scenarios
│   └── TEST_STRATEGY.md            # Detailed test documentation
├── package.json                     # Test dependencies & scripts
├── README.md                       # Quick start guide
├── tsconfig.json                   # TypeScript configuration
└── vitest.config.ts               # Test framework configuration
```

## Test Categories

### 🔧 Foundation Tests

**Purpose**: Validate basic zome connectivity and entry creation
**Scope**: Single agent operations, individual function calls
**File**: `foundation-tests.test.ts`

**Test Coverage**:
- Basic Connectivity Test - Verify zome function calls work
- Person Creation Test - Validate profile creation functionality
- Person Profile Retrieval Test - Test profile retrieval and validation
- Private Data Storage Test - Verify private entry storage
- Get All Agents Test - Validate community discovery functionality
- Error Handling Test - Test failure scenarios and edge cases

**Key Features**:
- Immediate feedback on API compatibility issues
- Basic entry validation
- Error boundary testing
- Foundation for more complex tests

**Current Status**: ✅ **API Fixed** - All compilation errors resolved, ready for environment testing

### 🔗 Integration Tests

**Purpose**: Validate multi-agent interactions and DHT synchronization
**Scope**: Multiple agents, cross-zome functionality, distributed operations
**File**: `integration-tests.test.ts`

**Test Coverage**:
- Two Agents Create Profiles - Basic multi-agent interaction
- Role Assignment Cross-Agent - Governance functionality across agents
- Community Discovery Test - Multi-perspective community visibility
- DHT Consistency Test - Distributed hash table synchronization validation

**Key Features**:
- Multi-conductor setup
- DHT timing validation
- Cross-agent visibility testing
- Distributed state consistency

**Current Status**: ✅ **API Fixed** - All compilation errors resolved, ready for environment testing

### 🎭 Scenario Tests

**Purpose**: Simulate complete real-world usage patterns and workflows
**Scope**: End-to-end user journeys, complex governance scenarios
**File**: `scenario-tests.test.ts`

**Test Scenarios**:

#### 1. New Community Member Onboarding
- Public profile creation
- Private identity data storage
- Role assignment by community steward
- Community discovery and integration
- Privacy boundary verification

#### 2. Community Governance Evolution
- Community founder establishment
- Progressive member onboarding
- Role hierarchy development
- Governance delegation testing
- Distributed authority validation

#### 3. Privacy and Trust Verification
- Sensitive data protection
- Access level differentiation
- Trust boundary enforcement
- Community visibility controls

**Key Features**:
- Complete user journey testing
- Real governance workflow simulation
- Privacy and security validation
- Community dynamics testing

**Current Status**: 🔲 **Not Implemented** - Planned for future development

## Test Utilities & Infrastructure

### Data Factories (`common.ts`)

Standardized test data creation:

```typescript
// Person profile data
createTestPerson() → Standard person profile
createTestPersonVariation(suffix) → Unique profiles for multi-agent tests

// Identity and security data  
createTestPrivateData() → Sample private identity data
createTestRole() → Standard role assignment data
```

### Validation Helpers

Comprehensive response validation:

```typescript
validatePersonCreation() → Complete person entry validation
validatePrivateDataCreation() → Private data validation  
validateAgentProfile() → Profile retrieval validation
```

### Multi-Agent Management

Tools for complex distributed scenarios:

```typescript
createMultipleAgents() → Setup multiple test agents
waitForDHTSync() → DHT synchronization delays
expectError() → Error testing helper
```

### Test Execution Management

Standardized test lifecycle:

```typescript
logTestStart(testName) → Consistent test initialization
logTestEnd(testName, success) → Test completion tracking
```

### Bundle Management

App bundle source configuration:

```typescript
getAppBundleSource() → Returns correct AppBundleSource for Tryorama
```

## Running Tests

### Prerequisites

1. **Build hApp bundle**:
   ```bash
   cd workdir
   hc app pack .
   ```

2. **Install dependencies**:
   ```bash
   cd tests
   npm install
   ```

3. **Environment Setup**: Tests require Holochain binaries available in PATH

### Test Execution Commands

```bash
# Complete test suite (requires nix environment)
nix develop --command npm test

# Specific test categories (requires nix environment)
nix develop --command npm run test:foundation     # Basic connectivity validation
nix develop --command npm run test:integration    # Multi-agent interaction testing
nix develop --command npm run test:scenarios      # Real-world usage scenarios

# Development workflows
npm run test:watch          # Watch mode for development
npm run test:debug          # Verbose debugging output
npm run test:coverage       # Coverage analysis
```

### Environment Requirements

**Critical**: Tests must run inside the Nix development environment to access required Holochain binaries:

- `kitsune2-bootstrap-srv` - Holochain networking service
- `hc` - Holochain CLI tool
- Other Holochain runtime dependencies

**Without Nix Environment**: Tests will fail with "Failed to spawn kitsune2-bootstrap-srv" and "spawn hc ENOENT" errors.

### Debug Mode

For detailed troubleshooting:

```bash
DEBUG=true nix develop --command npm run test:debug
```

## Current Test Coverage

### Phase 1 Foundation Layer

| Component | Foundation | Integration | Scenarios | Status |
|-----------|------------|-------------|-----------|--------|
| **Person Management** | ✅ Complete | ✅ Complete | 🔲 Planned | Ready |
| **Identity Storage** | ✅ Complete | 🔲 Planned | 🔲 Planned | Ready |
| **Role Assignment** | 🔲 Planned | ✅ Complete | 🔲 Planned | Ready |
| **Community Discovery** | ✅ Complete | ✅ Complete | 🔲 Planned | Ready |
| **Privacy Boundaries** | ✅ Basic | 🔲 Planned | 🔲 Planned | Ready |
| **DHT Consistency** | ⚠️ Basic | ✅ Complete | 🔲 Planned | Ready |

### API Compatibility Status

| Component | HDK 0.5.3 | Tryorama 0.18.x | Status |
|-----------|-----------|-----------------|--------|
| **Foundation Tests** | ✅ Compatible | ✅ Compatible | Ready |
| **Integration Tests** | ✅ Compatible | ✅ Compatible | Ready |
| **Bundle Loading** | ✅ Compatible | ✅ Compatible | Ready |
| **Environment Setup** | ✅ Compatible | ✅ Compatible | Ready |

### Recent Fixes Applied

1. **API Compatibility**: Updated all tests for HDK 0.5.3 and Tryorama 0.18.x
2. **Bundle Paths**: Fixed hApp bundle path to use correct capitalization (`Nondominium.happ`)
3. **Type Definitions**: Added proper TypeScript interfaces for all zome outputs
4. **Player Configuration**: Removed unsupported `agentName` property from player setup
5. **Environment Integration**: Documented Nix environment requirements

## Development Workflow Integration

### Test-Driven Development

1. **Foundation First**: Start with basic connectivity tests
2. **Build Integration**: Add multi-agent interaction tests  
3. **Validate Scenarios**: Create real-world usage tests
4. **Iterate & Debug**: Use layered approach to isolate issues

### Debugging Strategy

The layered approach enables systematic debugging:

1. **Foundation Failure** → API compatibility or basic functionality issue
2. **Integration Failure** → DHT timing or multi-agent logic issue
3. **Scenario Failure** → Business logic or user workflow issue

### Environment Debugging

Common issues and solutions:

1. **Missing Binaries**: Run tests inside `nix develop` environment
2. **Bundle Not Found**: Verify `workdir/Nondominium.happ` exists
3. **API Errors**: Check HDK version compatibility
4. **Timeout Issues**: Increase DHT sync delays for complex operations

### Continuous Integration

Tests are designed for CI environments with:
- Deterministic test data and timing
- Proper cleanup between test runs
- Clear pass/fail indicators
- Detailed logging for failure diagnosis

## Best Practices

### DHT Synchronization

Always account for distributed timing:
```typescript
await waitForDHTSync(2000); // Basic operations
await waitForDHTSync(5000); // Complex multi-agent operations
```

### Multi-Agent Testing

Use consistent agent setup patterns:
```typescript
const [alice, bob] = await scenario.addPlayersWithApps([
  { appBundleSource: getAppBundleSource() },
  { appBundleSource: getAppBundleSource() }
]);
```

### Validation Consistency

Use provided validation helpers for consistency:
```typescript
validatePersonCreation(result, input, agentPubKey);
```

### Error Testing

Include negative test cases:
```typescript
await expectError(async () => {
  await cell.callZome({ /* invalid operation */ });
}, "Expected error pattern");
```

### Environment Management

Always run tests in the correct environment:
```bash
# Correct way
nix develop --command npm run test:foundation

# Incorrect way (will fail)
npm run test:foundation
```

## Future Enhancements

### Performance Testing

Planned additions include:
- Load testing with multiple agents
- DHT performance validation
- Scalability benchmarks
- Timing consistency verification

### Advanced Scenarios

Future scenario tests will cover:
- Complex governance workflows
- Resource allocation patterns
- Economic transaction flows
- Community conflict resolution

### Integration Expansion

Extended integration testing for:
- Cross-zome data dependencies
- Complex linking patterns
- Advanced validation workflows
- Multi-DNA interactions

### Resource and Governance Tests

Planned test coverage for:
- Resource specification and management
- Economic resource validation
- Governance rule enforcement
- Validation framework testing

## Conclusion

This testing infrastructure provides a robust foundation for ensuring the reliability and functionality of the Nondominium hApp. The layered approach enables systematic development and debugging while the scenario-based testing validates real-world usage patterns.

**Current Status**: Foundation and Integration tests are API-compatible and ready for environment testing. The infrastructure is designed to scale with the application's complexity, providing clear pathways for adding new test coverage as additional features are implemented.

**Next Steps**: 
1. Complete environment testing to verify all tests pass in Nix environment
2. Implement Resource and Governance zome tests
3. Add comprehensive scenario tests for real-world workflows
4. Expand integration testing for cross-zome interactions

---

*For detailed technical documentation, see `/tests/src/nondominium/nondominium/TEST_STRATEGY.md`*
*For quick start instructions, see `/tests/README.md`* 