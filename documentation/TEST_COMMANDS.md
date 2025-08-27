# Test Commands Reference

Quick reference for running tests from the project root.

## 🚀 **Basic Test Commands**

All commands automatically build zomes and package the hApp before running tests.

```bash
# Run all tests
bun run test

# Watch mode for development
bun run test:watch

# Debug mode with verbose output
bun run test:debug

# Generate coverage reports
bun run test:coverage
```

## 🎯 **Layer-Specific Tests**

```bash
# Foundation tests (basic zome connectivity)
bun run test:foundation

# Integration tests (multi-agent interactions)
bun run test:integration

# Scenario tests (complete user workflows)
bun run test:scenarios
```

## 📂 **Domain-Specific Tests**

```bash
# Person management tests
bun run test:person

# Resource management tests
bun run test:resource

# Governance system tests
bun run test:governance
```

## 🎯 **PPR System Tests** (Private Participation Receipts)

```bash
# All PPR system tests
bun run test:ppr

# Basic PPR functionality
bun run test:ppr-foundation

# PPR cross-zome integration
bun run test:ppr-integration

# Complete PPR user workflows
bun run test:ppr-scenarios

# PPR performance and load testing
bun run test:ppr-performance
```

## 🔧 **Specialized Tests**

```bash
# Role management and access control
bun run test:roles

# Resource lifecycle management
bun run test:resources-lifecycle
```

## 🧹 **Linting & Code Quality**

```bash
# Check test code for linting issues
bun run lint:tests

# Auto-fix linting issues in test code
bun run lint:tests:fix
```

## 💡 **Tips**

- **All commands** include automatic build steps (zomes + hApp packaging)
- **Test files** follow the pattern: `foundation-tests.test.ts`, `integration-tests.test.ts`, `scenario-tests.test.ts`
- **Performance tests** have extended timeouts for complex multi-agent scenarios
- **Debug mode** provides detailed output for troubleshooting test failures

## 📊 **Test Structure**

```
tests/src/nondominium/
├── person/                    # test:person
├── resource/                  # test:resource
├── governance/                # test:governance
│   └── ppr-system/           # test:ppr
│       ├── ppr-foundation.test.ts      # test:ppr-foundation
│       ├── ppr-integration.test.ts     # test:ppr-integration
│       ├── ppr-scenarios.test.ts       # test:ppr-scenarios
│       └── performance/                # test:ppr-performance
└── utils.ts
```

## 🎯 **Recommended Testing Workflow**

1. **Development**: `bun run test:watch`
2. **Feature Testing**: `bun run test:ppr` (for PPR work)
3. **Pre-commit**: `bun run test:foundation && bun run lint:tests`
4. **Full Validation**: `bun run test && bun run test:coverage`

---

All commands run from the project root and handle the complete build → test cycle automatically! 🚀
