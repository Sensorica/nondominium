# Test Commands Reference for nondominium Project

**IMPORTANT**: All test commands should use test file names (not full paths). The test runner automatically locates files by name pattern.

## Complete Test Suite

```bash
# Run all tests (builds zomes + runs all test files)
bun run tests

# Alternative: Run tests with verbose output
bun run tests --reporter=verbose
```

## Individual Zome Testing

### Person Zome Tests

```bash
# Foundation tests (basic person functions)
bun run tests person-foundation-tests.test.ts

# Integration tests (cross-zome person interactions)
bun run tests person-integration-tests.test.ts

# Scenario tests (complete person workflows)
bun run tests person-scenario-tests.test.ts

# Private data sharing tests
bun run tests person-private-data-sharing.test.ts
```

### Resource Zome Tests

```bash
# Foundation tests (basic resource functions)
bun run tests resource-foundation-tests.test.ts

# Integration tests (cross-zome resource interactions)
bun run tests resource-integration-tests.test.ts

# Scenario tests (complete resource workflows)
bun run tests resource-scenario-tests.test.ts

# Update tests (resource modification and governance)
bun run tests resource-update-tests.test.ts
```

### Governance Zome Tests

```bash
# Foundation tests (basic governance functions)
bun run tests governance-foundation-tests.test.ts

# PPR System Tests (all PPR-related functionality)
bun run tests ppr-foundation.test.ts
bun run tests ppr-integration.test.ts
bun run tests ppr-scenarios.test.ts
bun run tests ppr-debug.test.ts
bun run tests ppr-cryptography.test.ts

# All PPR system tests (wildcard pattern)
bun run tests ppr-*.test.ts
```

## Testing by Category

### Foundation Tests (All Zomes)

```bash
# Run all foundation tests across all zomes
bun run tests *-foundation-tests.test.ts

# Individual zome foundation tests
bun run tests person-foundation-tests.test.ts
bun run tests resource-foundation-tests.test.ts
bun run tests governance-foundation-tests.test.ts
```

### Integration Tests (Cross-Zome)

```bash
# Run all integration tests
bun run tests *-integration-tests.test.ts

# Individual integration tests
bun run tests person-integration-tests.test.ts
bun run tests resource-integration-tests.test.ts
```

### Scenario Tests (End-to-End)

```bash
# Run all scenario tests
bun run tests *-scenario-tests.test.ts

# Individual scenario tests
bun run tests person-scenario-tests.test.ts
bun run tests resource-scenario-tests.test.ts
bun run tests ppr-scenarios.test.ts
```

## Debug and Development Testing

### Running Specific Tests

```bash
# Run a single test file
bun run tests person-foundation-tests.test.ts

# Run tests with specific pattern
bun run tests -- --grep "createPerson"

# Run tests with coverage
bun run tests --coverage

# Run tests in watch mode (for development)
bun run tests --watch
```

### Debug Testing

```bash
# Run debug tests (helpful for development)
bun run tests debug-test.test.ts
bun run tests debug-update-test.test.ts
bun run tests debug-links-test.test.ts

# Run PPR debug tests
bun run tests ppr-debug.test.ts
```

### Test Configuration

```bash
# Check test configuration
cd tests && bun run check

# Run tests with different timeout settings
bun run tests --timeout=300000  # 5 minutes instead of default 4 minutes

# Run tests with custom reporter
bun run tests --reporter=dot
bun run tests --reporter=spec
```

## Performance and Load Testing

```bash
# For future implementation when performance testing is added
# bun run tests tests/src/nondominium/performance/load
# bun run tests tests/src/nondominium/performance/stress
```

## Test Environment Setup

### Prerequisites

```bash
# Ensure you're in Nix environment (required for zome compilation)
nix develop

# Install dependencies
bun install

# Build zomes first (if not using automatic build)
bun run build:zomes
```

### Environment Variables

```bash
# Set test environment (optional)
export NODE_ENV=test
export VITE_APP_ENV=test

# Run tests with environment variables
NODE_ENV=test bun run tests
```

## Test Output and Reporting

### Standard Output

```bash
# Default: Concise output
bun run tests

# Verbose output with detailed information
bun run tests --reporter=verbose

# JSON output for CI/CD integration
bun run tests --reporter=json
```

### Coverage Reports

```bash
# Generate coverage report
bun run tests --coverage

# Coverage with specific reporter
bun run tests --coverage --reporter=text
bun run tests --coverage --reporter=html

# Coverage for specific files
bun run tests --coverage --src
```

## Troubleshooting Common Test Issues

### Port Conflicts

```bash
# Kill processes on common test ports
lsof -ti:8888 | xargs kill -9
lsof -ti:4444 | xargs kill -9

# Or use different ports
UI_PORT=8889 bun run tests
```

### Build Issues

```bash
# Clean build
rm -rf target/ workdir/
bun run build:zomes
bun run tests

# Check for compilation errors in specific zomes
cd dnas/nondominium/zomes/coordinator/zome_person
cargo check
```

### Test Timeouts

```bash
# Increase timeout for slow tests
bun run tests --timeout=600000  # 10 minutes

# Run specific test with increased timeout
bun run tests ppr-scenarios.test.ts --timeout=600000
```

## Test File Organization

```
tests/src/nondominium/
├── person/
│   ├── person-foundation      # Basic person functions
│   ├── person-integration     # Cross-zome person interactions
│   ├── person-scenario        # Complete person workflows
│   └── person-private-data-sharing  # PPR system tests
├── resource/
│   ├── resource-foundation    # Basic resource functions
│   ├── resource-integration   # Cross-zome resource interactions
│   ├── resource-scenario      # Complete resource workflows
│   └── resource-update-test         # Resource modification tests
├── governance/
│   ├── governance-foundation  # Basic governance functions
│   └── ppr-system/                          # PPR system tests
│       ├── ppr-foundation           # PPR basic functions
│       ├── ppr-integration          # PPR cross-zome tests
│       ├── ppr-scenarios            # PPR workflow tests
│       ├── ppr-debug                # PPR debugging tests
│       └── ppr-cryptography         # PPR cryptographic tests
├── misc/
│   └── misc                         # Miscellaneous tests
├── debug-*                          # Debugging test files
└── utils/                                   # Test utilities and helpers
    └── index.ts                             # Common test functions and setups
```

## Best Practices

1. **Always run tests in Nix environment** - Required for proper zome compilation
2. **Use appropriate test timeouts** - 4 minutes for complex scenarios
3. **Test in proper sequence** - Foundation → Integration → Scenario
4. **Allow DHT sync time** - Use `dhtSync()` between operations
5. **Clean up test data** - Proper test isolation and cleanup
6. **Validate all zome functions** - Comprehensive coverage testing
7. **Test error conditions** - Include negative test cases
8. **Document complex scenarios** - Clear test descriptions and comments
