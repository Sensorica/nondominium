# Testing Infrastructure for nondominium hApp

## Overview

The nondominium hApp employs a comprehensive, multi-layered testing strategy designed specifically for Holochain applications using Tryorama. This testing infrastructure ensures robust validation of distributed functionality, proper DHT synchronization, and real-world usage patterns while providing clear debugging pathways for development.

## Testing Philosophy

Our testing approach follows **Holochain community best practices** with emphasis on:

- **Progressive Complexity**: Start with basic connectivity, build to complex scenarios
- **DHT-Aware Testing**: Accounts for distributed timing and synchronization requirements
- **Multi-Agent Focus**: Validates true peer-to-peer interactions using Tryorama
- **Real-World Scenarios**: Tests actual governance and community workflows
- **Privacy Validation**: Ensures proper private entry storage and access control boundaries

## Test Architecture

### Layered Testing Approach

```
📊 Test Layers (Bottom-up approach)
├── 🔧 Foundation Tests     - Basic connectivity & function calls
├── 🧩 Unit Tests          - Individual zome functionality
├── 🔗 Integration Tests   - Cross-zome & multi-agent interactions
├── 🎭 Scenario Tests      - Real-world usage patterns
└── ⚡ Performance Tests   - Scalability & timing validation
```

### Technology Stack

- **Framework**: [Vitest](https://vitest.dev/) v3.2.4 - Fast, modern test runner
- **Holochain Testing**: [@holochain/tryorama](https://github.com/holochain/tryorama) v0.18.2 - Official Holochain testing framework
- **Language**: TypeScript with full type safety
- **Assertion Library**: Built-in Vitest expect API
- **Environment**: Nix development shell for consistent Holochain binaries
- **Build System**: Automatic WASM compilation and hApp packaging

## Test Structure

### Directory Layout

```
tests/
├── src/nondominium/
│   ├── person/                    # Person management tests
│   │   ├── person-foundation-tests.test.ts
│   │   ├── person-integration-tests.test.ts
│   │   ├── person-scenario-tests.test.ts
│   │   ├── person-capability-based-sharing.test.ts
│   │   └── common.ts
│   ├── resource/                  # Resource lifecycle tests
│   │   ├── resource-foundation-tests.test.ts
│   │   ├── resource-integration-tests.test.ts
│   │   ├── resource-scenario-tests.test.ts
│   │   ├── resource-update-test.test.ts
│   │   └── common.ts
│   ├── governance/                # Governance system tests
│   │   ├── governance-foundation-tests.test.ts
│   │   ├── ppr-system/           # PPR system tests
│   │   │   ├── ppr-foundation.test.ts
│   │   │   ├── ppr-integration.test.ts
│   │   │   ├── ppr-scenarios.test.ts
│   │   │   ├── ppr-cryptography.test.ts
│   │   │   ├── ppr-debug.test.ts
│   │   │   └── common.ts
│   │   └── common.ts
│   └── misc/                      # Miscellaneous tests
│       └── misc.test.ts
├── package.json                   # Test dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
└── vitest.config.ts              # Test framework configuration
```

## Test Command System

### Pattern-Based Test Execution

The testing system uses Vitest's file filtering capabilities with the `bun tests` command:

```bash
# Main test command (builds zomes, packages hApp, runs tests)
bun tests

# Pattern-based selection
bun tests person          # All files starting with "person-"
bun tests resource        # All files starting with "resource-"
bun tests governance      # All files starting with "governance-"
bun tests ppr             # All files starting with "ppr-"

# Layer-based selection
bun tests foundation      # All files containing "foundation"
bun tests integration     # All files containing "integration"
bun tests scenario        # All files containing "scenario"

# Specific test files
bun tests person-foundation
bun tests ppr-integration
bun tests resource-scenario
```

### Test Command Options

```bash
# Development workflows
bun tests --watch person                    # Hot reload during development
bun tests --reporter=verbose ppr-debug     # Detailed output for debugging
bun tests --coverage                       # Generate coverage reports
bun tests --typecheck                      # Run with TypeScript checking

# Quality assurance
bun tests foundation && bun tests --typecheck    # Pre-commit validation
bun tests && bun tests --coverage                 # Full validation
```

## Test Categories

### 🔧 Foundation Tests

**Purpose**: Validate basic zome connectivity and entry creation
**Scope**: Single agent operations, individual function calls
**Files**: `*-foundation-tests.test.ts`

**Test Coverage**:

- **Person Foundation**: Basic profile creation, private data storage, community discovery
- **Resource Foundation**: Resource specification creation, basic validation
- **Governance Foundation**: Basic governance operations, rule validation
- **PPR Foundation**: Private Participation Receipt creation and validation

**Key Features**:

- Immediate feedback on API compatibility issues
- Basic entry validation and error boundary testing
- Foundation for more complex multi-agent tests
- Single-conductor Tryorama scenarios

### 🔗 Integration Tests

**Purpose**: Validate multi-agent interactions and DHT synchronization
**Scope**: Multiple agents, cross-zome functionality, distributed operations
**Files**: `*-integration-tests.test.ts`

**Test Coverage**:

- **Person Integration**: Multi-agent discovery, cross-agent role assignment
- **Resource Integration**: Resource sharing between agents, access validation
- **PPR Integration**: Cross-agent PPR validation, cryptographic verification

**Key Features**:

- Multi-conductor Tryorama setup with 2+ agents
- DHT timing validation and synchronization delays
- Cross-agent visibility and access control testing
- Distributed state consistency validation

### 🎭 Scenario Tests

**Purpose**: Simulate complete real-world usage patterns and workflows
**Scope**: End-to-end user journeys, complex governance scenarios
**Files**: `*-scenario-tests.test.ts`

**Test Scenarios**:

#### 1. Complete Resource Sharing Workflow
- Resource creation and specification
- Capability-based access grants
- Multi-agent resource discovery
- Usage validation and governance

#### 2. PPR System End-to-End
- PPR creation for resource access
- Cryptographic validation chain
- Multi-step approval workflows
- Governance rule enforcement

#### 3. Community Onboarding Scenarios
- New member profile creation
- Role assignment and capability grants
- Resource access integration
- Privacy boundary verification

**Key Features**:

- Complete user journey testing
- Real governance workflow simulation
- Privacy and security validation
- Complex multi-step transaction flows

### Specialized Tests

**PPR Cryptography Tests**: Validation of cryptographic primitives and security
**PPR Debug Tests**: Development debugging and edge case validation
**Capability-Based Sharing**: Advanced access control scenarios
**Resource Update Tests**: Resource lifecycle and modification workflows

## Test Utilities & Infrastructure

### Data Factories (`common.ts`)

Standardized test data creation for each domain:

```typescript
// Person management
createTestPerson() → Standard person profile
createTestPersonVariation(suffix) → Unique profiles for multi-agent tests

// Resource management
createTestResource() → Sample resource specification
createTestResourceVariant() → Resource variations

// PPR system
createTestPPR() → Basic PPR structure
createTestValidationBlock() -> Cryptographic validation data
```

### Validation Helpers

Comprehensive response validation across domains:

```typescript
validatePersonCreation() → Complete person entry validation
validateResourceCreation() → Resource specification validation
validatePPRCreation() → PPR structure and cryptographic validation
validateAgentProfile() → Profile retrieval validation
```

### Multi-Agent Management

Tryorama-specific tools for complex distributed scenarios:

```typescript
createMultipleAgents(count) → Setup multiple test conductors
waitForDHTSync(delay) → DHT synchronization delays
setupTryoramaScenario() → Standard scenario initialization
cleanupTryorama(scenario) → Proper cleanup and shutdown
```

### Test Configuration

**Timeout Settings**: 4 minutes for complex multi-agent scenarios
**Concurrency**: Single fork execution for DHT consistency
**Agent Simulation**: Supports 2+ distributed agents per test
**Environment**: Requires Nix development shell

## Running Tests

### Prerequisites

1. **Nix Development Environment**: Required for Holochain binaries
   ```bash
   nix develop  # Enter reproducible environment (REQUIRED)
   ```

2. **Dependencies**: Automatically installed by test scripts
   ```bash
   bun install  # Install all dependencies
   ```

### Test Execution Commands

**From Project Root**:
```bash
# Build and run all tests
bun tests

# Pattern-based test selection
bun tests person          # Person-related tests
bun tests resource        # Resource-related tests
bun tests governance      # Governance-related tests
bun tests ppr             # PPR system tests

# Layer-based selection
bun tests foundation      # All foundation tests
bun tests integration     # All integration tests
bun tests scenario        # All scenario tests

# Specific test files
bun tests person-foundation
bun tests ppr-integration
bun tests resource-scenario
```

**Development Workflows**:
```bash
# Watch mode for development
bun tests --watch person

# Debug mode with verbose output
bun tests --reporter=verbose ppr-debug

# Coverage analysis
bun tests --coverage

# Type checking integration
bun tests --typecheck
```

### Environment Requirements

**Critical**: Tests must run inside the Nix development environment to access required Holochain binaries:

- `kitsune2-bootstrap-srv` - Holochain networking service
- `hc` - Holochain CLI tool
- Other Holochain runtime dependencies

**Without Nix Environment**: Tests will fail with "Failed to spawn kitsune2-bootstrap-srv" and "spawn hc ENOENT" errors.

### Test Development Features

**Test Isolation**: Use `.only()` for focused development:
```typescript
describe.only('specific test suite', () => { ... })
it.only('specific test', async () => { ... })
```

**Rust Debugging**: Use `warn!` macro in zome functions:
```rust
warn!("Debug info: variable = {:?}", some_variable);
warn!("Checkpoint reached in function_name");
```

## Current Test Coverage

### Phase 1 Foundation Layer ✅

| Domain                | Foundation | Integration | Scenarios | Specialized | Status |
| --------------------- | ---------- | ----------- | --------- | ----------- | ------ |
| **Person Management** | ✅ Complete| ✅ Complete | ✅ Complete| ✅ Capability| Ready  |
| **Resource Management**| ✅ Complete| ✅ Complete | ✅ Complete| ✅ Update    | Ready  |
| **Governance System** | ✅ Complete| 🔲 Planned  | 🔲 Planned| 🔲 Planned  | Ready  |
| **PPR System**        | ✅ Complete| ✅ Complete | ✅ Complete| ✅ Crypto/Debug| Ready |

### Test File Inventory

**Person Tests** (4 files):
- `person-foundation-tests.test.ts` - Basic connectivity and profile management
- `person-integration-tests.test.ts` - Multi-agent discovery and interaction
- `person-scenario-tests.test.ts` - Complete user workflows
- `person-capability-based-sharing.test.ts` - Advanced access control

**Resource Tests** (4 files):
- `resource-foundation-tests.test.ts` - Resource creation and validation
- `resource-integration-tests.test.ts` - Cross-agent resource sharing
- `resource-scenario-tests.test.ts` - Complete resource lifecycle workflows
- `resource-update-test.test.ts` - Resource modification and versioning

**Governance Tests** (1 file):
- `governance-foundation-tests.test.ts` - Basic governance operations

**PPR System Tests** (5 files):
- `ppr-foundation.test.ts` - Basic PPR creation and validation
- `ppr-integration.test.ts` - Cross-agent PPR workflows
- `ppr-scenarios.test.ts` - Complete PPR usage scenarios
- `ppr-cryptography.test.ts` - Cryptographic validation
- `ppr-debug.test.ts` - Development debugging

**Miscellaneous Tests** (1 file):
- `misc.test.ts` - Additional test scenarios

### Technology Stack Status

| Component             | Version | Status |
| --------------------- | ------- | ------ |
| **Vitest**            | 3.2.4   | ✅ Active |
| **Tryorama**          | 0.18.2  | ✅ Active |
| **Holochain Client**  | 0.19.0  | ✅ Active |
| **TypeScript**        | 5.6.3   | ✅ Active |
| **HDK**               | 0.5.3   | ✅ Active |
| **HDI**               | 0.6.3   | ✅ Active |

## Development Workflow Integration

### Test-Driven Development

1. **Foundation First**: Start with `bun tests foundation` for basic connectivity
2. **Build Integration**: Add multi-agent tests with `bun tests integration`
3. **Validate Scenarios**: Create real-world usage with `bun tests scenario`
4. **Iterate & Debug**: Use pattern matching for focused testing

### Debugging Strategy

The layered approach enables systematic debugging:

1. **Foundation Failure** → API compatibility or basic functionality issue
2. **Integration Failure** → DHT timing or multi-agent logic issue
3. **Scenario Failure** → Business logic or user workflow issue

### Environment Debugging

Common issues and solutions:

1. **Missing Binaries**: Run tests inside `nix develop` environment
2. **Bundle Not Found**: Verify automatic packaging creates `workdir/nondominium.happ`
3. **API Errors**: Check HDK version compatibility (0.5.3/0.6.3)
4. **Timeout Issues**: Tests have extended 4-minute timeouts for complex operations

### Continuous Integration

Tests are designed for CI environments with:
- Deterministic test data and timing
- Proper cleanup between test runs via Tryorama
- Clear pass/fail indicators
- Detailed logging for failure diagnosis
- Automatic build and packaging steps

## Best Practices

### Pattern-Based Test Selection

Use the file naming conventions for efficient testing:

```bash
# Efficient development workflow
bun tests person-foundation    # Fast: single test file
bun tests foundation          # Medium: multiple foundation tests
bun tests person              # Slower: all person tests
bun tests                     # Slowest: complete test suite
```

### Multi-Agent Testing with Tryorama

Use consistent Tryorama patterns:

```typescript
const [alice, bob] = await scenario.addPlayersWithApps([
  { appBundleSource: getAppBundleSource() },
  { appBundleSource: getAppBundleSource() },
]);

// Allow DHT synchronization
await waitForDHTSync(2000);
```

### DHT Synchronization

Always account for distributed timing in Tryorama tests:

```typescript
await waitForDHTSync(2000); // Basic operations
await waitForDHTSync(5000); // Complex multi-agent operations
```

### Validation Consistency

Use provided validation helpers for consistency across tests:

```typescript
validatePersonCreation(result, input, agentPubKey);
validatePPRCreation(pprResult, expectedData);
validateResourceCreation(resourceResult, specification);
```

### Error Testing

Include negative test cases with proper Tryorama error handling:

```typescript
await expect(async () => {
  await cell.callZome({
    zome_name: "person",
    fn_name: "create_person",
    payload: invalidData,
  });
}, "Expected error pattern");
```

### Environment Management

Always run tests in the correct environment:

```bash
# Correct way - includes Nix environment
nix develop --command bun tests person

# Incorrect way (will fail) - missing Holochain binaries
bun tests person
```

## Performance and Scalability

### Test Execution Performance

- **Parallel Execution**: Tests run in parallel by default for maximum speed
- **Smart Filtering**: Use specific patterns to reduce test execution time
- **Build Optimization**: Automatic incremental builds and WASM compilation
- **Memory Management**: Proper Tryorama cleanup prevents memory leaks

### Timeout Configuration

- **Standard Tests**: 5 minutes (Vitest default)
- **Complex Scenarios**: 4 minutes (custom configured)
- **Integration Tests**: Extended timeouts for DHT synchronization
- **Foundation Tests**: Standard timeouts for quick validation

## Future Enhancements

### Planned Test Coverage

- **Governance Integration**: Cross-zome governance workflows
- **Performance Testing**: Load testing with multiple agents
- **Security Testing**: Advanced cryptographic validation
- **Cross-DNA Testing**: Multi-application interaction scenarios

### Infrastructure Improvements

- **Enhanced Debugging**: Better Tryorama logging and error reporting
- **Mock Services**: External service mocking for complex scenarios
- **Test Data Management**: Improved test data factories and management
- **CI/CD Integration**: Enhanced continuous integration workflows

## Conclusion

This testing infrastructure provides a robust foundation for ensuring the reliability and functionality of the nondominium hApp using Tryorama. The pattern-based test execution system enables efficient development workflows while the comprehensive layered approach ensures thorough validation of distributed functionality.

**Current Status**: All foundation, integration, and scenario tests are actively maintained and passing with Tryorama 0.18.2 and Holochain HDK 0.5.3/0.6.3.

**Key Strengths**:
- Pattern-based test selection for efficient development
- Comprehensive Tryorama integration for realistic testing
- Proper DHT synchronization and multi-agent validation
- Full TypeScript support and type safety
- Robust build and packaging automation

**Next Steps**:
1. Expand governance test coverage for complex workflows
2. Add performance and load testing capabilities
3. Enhance debugging and error reporting features
4. Integrate additional security and cryptographic validation

---

_This infrastructure supports the complete development lifecycle from foundation testing to complex multi-agent scenario validation using the official Holochain testing framework._