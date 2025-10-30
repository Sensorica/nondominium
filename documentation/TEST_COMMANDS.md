# Test Commands Reference

Quick reference for running tests from the project root.

## 🚀 **Basic Test Commands**

All commands automatically build zomes and package the hApp before running tests.

```bash
# Run all tests
bun tests

# Run tests with verbose output
bun tests --reporter=verbose

# Run tests in watch mode for development
bun tests --watch

# Generate coverage reports
bun tests --coverage
```

## 🎯 **Pattern-Based Test Selection**

The test system uses file name pattern matching to run specific test subsets:

```bash
# Run all person-related tests
bun tests person

# Run all resource-related tests
bun tests resource

# Run all governance-related tests
bun tests governance

# Run all PPR system tests
bun tests ppr
```

## 📂 **Layer-Specific Test Patterns**

```bash
# Run all foundation tests (basic connectivity)
bun tests foundation

# Run all integration tests (multi-agent interactions)
bun tests integration

# Run all scenario tests (complete user workflows)
bun tests scenario
```

## 🔧 **Specific Test Files**

```bash
# Run specific test files using partial name matching
bun tests person-foundation
bun tests person-integration
bun tests person-scenario
bun tests resource-foundation
bun tests resource-integration
bun tests resource-scenario
bun tests ppr-foundation
bun tests ppr-integration
bun tests ppr-scenarios
bun tests ppr-cryptography
bun tests ppr-debug
bun tests person-capability
bun tests governance-foundation
```

## 🎯 **Development Workflow Commands**

```bash
# Development with hot reload
bun tests --watch person

# Debug specific test with verbose output
bun tests --reporter=verbose ppr-foundation

# Run tests for a specific feature area
bun tests resource
bun tests governance
bun tests person
```

## 🧹 **Test Quality & Type Checking**

```bash
# Run tests with type checking
bun tests --typecheck

# Run type checking only (from tests directory)
cd tests && npm run check

# Run tests with coverage analysis
bun tests --coverage
```

## 💡 **Test Development Tips**

### Test Isolation During Development
Use `.only()` on specific test blocks to run single tests:

```typescript
describe.only('specific test suite', () => { ... })  // Run only this suite
it.only('specific test', async () => { ... })       // Run only this test
test.only('specific test', async () => { ... })       // Run only this test
```

### Rust Zome Debugging
Use the `warn!` macro in Rust zome functions to log debugging info:

```rust
warn!("Debug info: variable = {:?}", some_variable);
warn!("Checkpoint reached in function_name");
warn!("Processing entry: {}", entry_hash);
```

## 📊 **Test File Structure**

```
tests/src/nondominium/
├── person/                           # bun tests person
│   ├── person-foundation-tests.test.ts
│   ├── person-integration-tests.test.ts
│   ├── person-scenario-tests.test.ts
│   └── person-capability-based-sharing.test.ts
├── resource/                         # bun tests resource
│   ├── resource-foundation-tests.test.ts
│   ├── resource-integration-tests.test.ts
│   ├── resource-scenario-tests.test.ts
│   └── resource-update-test.test.ts
├── governance/                       # bun tests governance
│   ├── governance-foundation-tests.test.ts
│   └── ppr-system/                   # bun tests ppr
│       ├── ppr-foundation.test.ts
│       ├── ppr-integration.test.ts
│       ├── ppr-scenarios.test.ts
│       ├── ppr-cryptography.test.ts
│       └── ppr-debug.test.ts
└── misc/                             # bun tests misc
    └── misc.test.ts
```

## 🎯 **Recommended Testing Workflow**

1. **Feature Development**: `bun tests --watch <feature-area>`
2. **Specific Test Debugging**: `bun tests --reporter=verbose <specific-test>`
3. **Pre-commit Validation**: `bun tests foundation && bun tests --typecheck`
4. **Full Validation**: `bun tests && bun tests --coverage`

## 🔍 **Pattern Matching Rules**

The `bun tests` command uses Vitest's file filtering:
- **Prefix Matching**: `bun tests person` matches all files starting with "person-"
- **Partial Matching**: `bun tests foundation` matches all files containing "foundation"
- **Specific Files**: Use unique parts of filenames for precise selection
- **Multiple Patterns**: Chain multiple patterns for broader coverage

## ⚡ **Performance Tips**

- **Use Specific Patterns**: `bun tests person-foundation` is faster than `bun tests person`
- **Foundation First**: Run foundation tests before integration/scenario tests
- **Parallel Execution**: Tests run in parallel by default for maximum speed
- **Verbose Output**: Use `--reporter=verbose` for debugging but not for routine runs

---

All commands run from the project root and automatically handle the complete build → test cycle! 🚀

**Environment**: Requires Nix development environment (`nix develop`) for Holochain binaries.