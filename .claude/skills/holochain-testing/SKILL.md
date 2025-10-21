---
name: Holochain Testing
description: Interactive guidance for Holochain testing with exact command selection, 4-layer testing strategy, and project-specific patterns for nondominium
---

# Holochain Testing

## Instructions

This skill provides comprehensive interactive guidance for testing Holochain applications, focusing on the 4-layer testing strategy, exact command selection, and patterns specific to the nondominium ValueFlows implementation.

## Capabilities

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

### 🏗️ Test Generation & Templates

- **Foundation Test Generation**: Create tests for new zome functions automatically
- **Integration Test Templates**: Cross-zome interaction patterns (person ↔ resource ↔ governance)
- **Multi-Agent Scenarios**: Tryorama test scaffolding for complex workflows
- **PPR System Testing**: Private data sharing test patterns specific to your project

### 📊 Project-Specific Testing Patterns

- **Person Zome Testing**: Identity, roles, private data, capability validation
- **Resource Zome Testing**: EconomicResource lifecycle, governance rules, transfers
- **Governance Zome Testing**: Commitments, claims, economic events, PPR validation
- **ValueFlows Compliance**: Economic event testing and resource tracking validation

### 🔍 Testing Guidance & Quality

- **Test Coverage Analysis**: Ensure comprehensive test coverage across all zomes
- **Multi-Agent Test Design**: Proper agent setup with roles and permissions
- **Test Data Generation**: Realistic test data for ValueFlows scenarios
- **Debug Support**: Analyze test failures and suggest solutions

## How to Use

### 🤔 Interactive Testing Guidance

**Choose testing approach**:
"What type of test should I run for this new function?"

**Select exact command**:
"Which command runs only the person foundation tests?"

**Design multi-agent scenarios**:
"Help me create a test for resource approval with 3 agents"

**Debug test failures**:
"This integration test is failing, can you help me debug it?"

**Generate test coverage**:
"What test coverage do I have for the governance zome?"

### 🎯 Command Selection Interactive Mode

**Test Level Selection**:

```
🤔 "What do you want to test?"
├── Foundation tests → "Which zome?" → person/resource/governance
├── Integration tests → "Which interaction?" → person↔resource, resource↔governance
├── Scenario tests → "Which workflow?" → Resource lifecycle, PPR system
├── Performance tests → "Which component?" → PPR validation, multi-agent
└── All tests → Complete test suite execution
```

**Specific Command Generation**:

```
🤔 "Which tests to run?"
├── All tests → `bun run tests` (builds zomes + runs all)
├── Person foundation → `bun run tests person-foundation-tests.test.ts`
├── Resource integration → `bun run tests resource-integration-tests.test.ts`
├── Governance scenarios → `bun run tests ppr-scenarios.test.ts`
├── PPR system only → `bun run tests ppr-*.test.ts`
└── Single test → `bun run tests -- filename.test.ts --reporter=verbose`
```

**IMPORTANT**: Use test file names (not full paths) when running specific tests with `bun run tests`. The test runner will find the files by name.

### 🎯 Test Generation Patterns

**Foundation Test Generation**:
"Generate foundation test for create_person function"

"Create test for validate_ppr_request function"

"Generate test for resource creation with governance rules"

**Integration Test Generation**:
"Create integration test for person creating resource with embedded governance"

"Generate test for cross-zome communication between person and resource"

"Create test for PPR validation across person and governance zomes"

**Scenario Test Generation**:
"Generate scenario test for complete resource sharing workflow with PPR"

"Create multi-agent test for resource approval with admin, owner, and requester"

"Generate test for economic event lifecycle with multiple participants"

## Examples

### Command Selection

````
User: "I want to run just the foundation tests for the person zome"

Skill: Here's the exact command:

```bash
bun run tests person-foundation-tests.test.ts
````

This will:

- Build all zomes to WASM
- Run only the person foundation tests
- Use the 4-minute timeout for complex scenarios
- Output detailed test results

Would you also like to run the person integration tests?

```

### Test Generation
```

User: "Generate a foundation test for the create_person function"

Skill: I'll create a complete foundation test following nondominium patterns:

[Generates complete TypeScript test file with proper tryorama setup, agent configuration, and validation]

Should I also generate the corresponding integration test that tests person creation with role assignment?

```

### Multi-Agent Scenario Design
```

User: "I need a test for resource approval with 3 agents"

Skill: I'll help you design a 3-agent test scenario:

1. **Agent Setup**:
   - Agent 1: Resource owner (can create resources)
   - Agent 2: Admin (can approve transfers)
   - Agent 3: Requester (wants access to resource)

2. **Test Flow**:
   - Agent 1 creates resource with governance rules
   - Agent 3 requests access to resource
   - Agent 2 approves the request
   - Validate PPR system works correctly

Would you like me to generate the complete test file with this scenario?

```

### Test Debugging
```

User: "My integration test is failing with 'Agent not found' error"

Skill: Let me help debug this:

1. **Check Agent Setup**: Ensure all agents are properly initialized
2. **Verify Agent Ordering**: Make sure agents are created in the right order
3. **Check CapGrants**: Verify capabilities are properly granted
4. **Validate DHT Sync**: Ensure agents have time to sync

Can you show me the exact error message and the test code?

````

## Templates

- **foundation_test_template.ts**: Foundation test structure for individual zome functions
- **integration_test_template.ts**: Cross-zome interaction test patterns
- **scenario_test_template.ts**: Multi-agent workflow test templates
- **ppr_test_template.ts**: PPR system-specific test patterns
- **valueflows_test_template.ts**: ValueFlows compliance testing patterns

## Best Practices

### Foundation Testing
1. **Test each zome function individually**
2. **Validate error handling and edge cases**
3. **Test data validation and integrity**
4. **Verify basic agent operations**
5. **Use proper timeout settings (4 minutes for complex scenarios)**

### Atomic Test Development (.only Method)
**CRITICAL**: Use `.only()` extensively during test development to run tests atomically and focus on one test at a time:

```typescript
// Run only this specific test
test.only("create_person with valid data", async () => {
  // Development focused on this single test
});

// Run only this test suite
describe.only("Person CRUD operations", () => {
  // Focus on this specific test group
});
````

**Why Atomic Testing Matters**:

- **Isolation**: Debug one test without interference from others
- **Speed**: Skip other tests during development (saves significant time)
- **Focus**: Concentrate on specific functionality being developed
- **Debugging**: Isolate failing tests quickly
- **Iteration**: Fast feedback loops during development

**Atomic Development Workflow**:

1. **Add `.only()` to the test you're developing**
2. **Run the test file** - only the marked test will execute
3. **Iterate quickly** until the test passes\*\*
4. **Remove `.only()`** before committing
5. **Repeat for each test**

**Example**:

```typescript
// During development - focus on single test
test.only("create person with role assignment", async () => {
  await runScenarioWithTwoAgents(async (scenario, agent1, agent2) => {
    const personHash = await createPerson(agent1, personInput);
    await assignPersonRole(agent1, agent1.agentPubKey, "admin");

    const profile = await getMyProfile(agent1);
    assert.equal(profile.role, "admin");
  });
});

// Remove .only() before commit
test("create person with role assignment", async () => {
  // Same test, now runs with all others
});
```

### Integration Testing

1. **Test cross-zome communication patterns**
2. **Validate data flow between zomes**
3. **Test capability-based access control**
4. **Verify agent interactions and permissions**
5. **Test error propagation across zome boundaries**

### Scenario Testing

1. **Design realistic user workflows**
2. **Test complete end-to-end processes**
3. **Include proper agent role assignments**
4. **Validate business logic and invariants**
5. **Test both success and failure scenarios**

### Multi-Agent Testing

1. **Properly initialize all agents**
2. **Allow time for DHT synchronization**
3. **Test agent-specific capabilities and permissions**
4. **Validate concurrent operations**
5. **Test resource sharing and access control**

## Project Integration

This skill is specifically tailored for the nondominium project:

- Uses your existing test file structure and naming conventions
- Follows your 4-layer testing strategy exactly
- Incorporates your PPR (Private data, Purpose, Rights) system testing
- Respects your ValueFlows implementation patterns
- Aligns with your tryorama setup and agent configuration

## Test Execution Environment

The skill provides guidance for:

- **Nix Environment**: Ensure tests run in proper Nix shell
- **Build Requirements**: Automatic zome compilation before testing
- **Agent Configuration**: Custom agent setups for different scenarios
- **Timeout Management**: Proper timeout settings for complex scenarios
- **Output Analysis**: Understanding test results and error messages

## Examples

### Foundation Test Selection

````
User: "What command runs just the person foundation tests?"

Skill: For person foundation tests, use:
```bash
bun run tests person-foundation-tests.test.ts
````

For specific foundation tests:

- Person: `bun run tests person-foundation-tests.test.ts`
- Resource: `bun run tests resource-foundation-tests.test.ts`
- Governance: `bun run tests governance-foundation-tests.test.ts`

```

**IMPORTANT**: Always use test file names (not full paths) with `bun run tests`. The test runner automatically locates the files.

### PPR System Testing
```

User: "Which test should I run for PPR system validation?"

Skill: For comprehensive PPR testing:

```bash
# All PPR system tests
bun run tests ppr-*.test.ts

# Specific PPR tests
bun run tests ppr-foundation.test.ts      # Basic PPR functions
bun run tests ppr-integration.test.ts     # Cross-zome PPR tests
bun run tests ppr-scenarios.test.ts       # Complete PPR workflows
```

The PPR tests cover private data access requests, capability grants, and permission validation.

**IMPORTANT**: Use test file names (not full paths) with `bun run tests`. The test runner finds files by name pattern.

```

### Integration Test Debugging
```

User: "My integration test is failing with 'Network error', can you help debug?"

Skill: Common integration test issues and solutions:

1. **Agent Setup Issues**: Ensure proper agent initialization

   ```bash
   # Check: await dhtSync([agent1, agent2]);
   ```

2. **Cross-Zome Communication**: Verify zome names and function signatures

   ```bash
   # Check both zomes are in the same DNA
   ```

3. **Build Issues**: Clean build and ensure Nix environment
   ```bash
   nix develop --command bun run build:zomes
   ```

Can you share the specific error message and test code?

```

### Test Generation
```

User: "Generate a test for create_person function"

Skill: I'll create a comprehensive foundation test for create_person:

[Generates complete test file with proper patterns, including:

- Success scenario with valid data
- Error scenarios with invalid data
- Agent permission validation
- Proper multi-agent setup
- Exact test command for execution]

The test follows your project's patterns and includes comprehensive edge case coverage.

**IMPORTANT**: During development, add `.only()` to focus on individual tests:

```typescript
test.only("create_person function", async () => {
  // Develop this test in isolation
});
```

Remove `.only()` before committing to run all tests together.

```

### Atomic Test Development
```

User: "I'm developing a new test and it's taking forever to run all tests each time"

Skill: Use atomic test development with `.only()`:

**During Development**:

```typescript
// Add .only() to focus on single test
test.only("my new test", async () => {
  // Only this test runs - much faster iteration
});
```

**Benefits**:

- **Speed**: Skip all other tests (saves minutes per iteration)
- **Focus**: Concentrate on one piece of functionality
- **Debugging**: Isolate issues quickly
- **Iteration**: Fast feedback loops

**Workflow**:

1. Add `.only()` to test you're developing
2. Run test file - only marked test executes
3. Iterate quickly until passing
4. Remove `.only()` before commit

This is essential for productive Holochain test development!

```

## Limitations

- Assumes Tryorama testing framework setup
- Optimized for nondominium project structure
- Requires proper Nix development environment
- Focused on coordinator and integrity zome testing
- Assumes basic TypeScript and testing knowledge
```
