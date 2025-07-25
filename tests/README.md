# 🧪 nondominium hApp Tests

Comprehensive test suite for the nondominium Holochain application using Tryorama testing framework.

## Quick Start

### 1. Build the hApp Bundle
```bash
cd ../workdir
hc app pack .
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:foundation     # Basic connectivity tests
npm run test:integration    # Multi-agent interaction tests
npm run test:scenarios      # Real-world usage scenarios

# Development mode
npm run test:watch          # Watch mode for development
npm run test:debug          # Verbose debugging output
```

## Test Structure

- **🔧 Foundation Tests**: Basic zome function calls and entry creation
- **🔗 Integration Tests**: Multi-agent interactions and DHT synchronization
- **🎭 Scenario Tests**: Real-world usage patterns and complete user journeys

## Documentation

See [TEST_STRATEGY.md](src/nondominium/nondominium/TEST_STRATEGY.md) for comprehensive documentation.

## Test Coverage

Current implementation covers:
- ✅ Person profile management
- ✅ Identity storage and encryption
- ✅ Role assignment system
- ✅ Community discovery
- ✅ Privacy boundaries
- ✅ Multi-agent interactions

## Debugging

Use debug mode for detailed test output:
```bash
npm run test:debug
```

For test failures, check:
1. hApp bundle is built and accessible
2. DHT sync timing in multi-agent tests
3. Expected vs actual data structures
4. Agent pub key handling 