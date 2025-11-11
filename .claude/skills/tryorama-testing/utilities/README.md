# Tryorama Testing Utilities

This directory contains testing utilities, helpers, and patterns for the nondominium Holochain application testing with Tryorama.

## Directory Structure

```
utilities/
├── README.md                    # This file
├── common.ts                    # Common testing patterns and helpers
├── agents.ts                    # Agent management and setup utilities
├── fixtures.ts                  # Test data generators and fixtures
├── validation.ts                # Validation helpers for complex data structures
├── performance.ts               # Performance testing utilities
├── scenarios/                   # Predefined test scenarios
│   ├── ppr-scenarios.ts         # PPR system test scenarios
│   ├── multi-agent.ts           # Multi-agent interaction patterns
│   └── stress-testing.ts        # Stress testing utilities
└── benchmarks/                  # Performance benchmarks and metrics
    ├── ppr-benchmarks.ts        # PPR system performance benchmarks
    └── cross-zome.ts            # Cross-zome performance testing
```

## Core Testing Utilities

### Common Testing Patterns

**Agent Setup and Management**:
```typescript
export async function setupAgents(count: number): Promise<AgentCell[]> {
  const conductor = await Conductor.singleton();
  const agents: AgentCell[] = [];

  for (let i = 0; i < count; i++) {
    const agentPubKey = await generateAgentPubKey();
    const cell = await conductor.createCell({
      app_bundle: APP_BUNDLE,
      agent_key: agentPubKey,
    });

    agents.push({
      agent: agentPubKey,
      cell,
      name: `Agent${i + 1}`
    });
  }

  return agents;
}
```

**Test Data Generation**:
```typescript
export function generateTestData<T>(type: string, overrides?: Partial<T>): T {
  switch (type) {
    case 'person':
      return generatePersonInput(overrides) as T;
    case 'resource':
      return generateResourceInput(overrides) as T;
    case 'ppr':
      return generatePPRInput(overrides) as T;
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }
}
```

### Validation Helpers

**Bi-directional Receipt Validation**:
```typescript
export function validateBiDirectionalReceipts(
  receipts: ParticipationReceipt[],
  expectedComplement: string
): boolean {
  const claimTypes = receipts.map(r => r.claim_type);

  // Check for complementary claim pairs
  const complementPairs = {
    'ResourceContribution': 'ResourceReception',
    'ServiceProvision': 'ServiceReception',
    'CustodyTransfer': 'CustodyAcceptance'
  };

  const expectedComplement = complementPairs[expectedComplement];
  return claimTypes.includes(expectedComplement);
}
```

**Performance Validation**:
```typescript
export function validatePerformanceMetrics(
  metrics: PerformanceMetrics,
  benchmarks: PerformanceBenchmarks
): ValidationResult {
  const issues: string[] = [];

  if (metrics.quality < benchmarks.minQuality) {
    issues.push(`Quality below threshold: ${metrics.quality} < ${benchmarks.minQuality}`);
  }

  if (metrics.timeliness < benchmarks.minTimeliness) {
    issues.push(`Timeliness below threshold: ${metrics.timeliness} < ${benchmarks.minTimeliness}`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
```

## Usage Guidelines

### Test Development Workflow

1. **Plan Test Structure**: Use the 4-layer testing strategy (Foundation, Integration, Scenarios, Performance)
2. **Generate Test Data**: Use fixtures.ts for consistent test data generation
3. **Set Up Agents**: Use agents.ts for multi-agent test scenarios
4. **Execute Tests**: Use common.ts patterns for test execution
5. **Validate Results**: Use validation.ts for comprehensive result validation
6. **Measure Performance**: Use performance.ts for benchmark testing

### Multi-Agent Testing

For complex multi-agent scenarios, use the predefined scenarios in `scenarios/multi-agent.ts`:

```typescript
import { MULTI_AGENT_SCENARIOS } from '../scenarios/multi-agent';

test('complex multi-agent resource exchange', async () => {
  const scenario = MULTI_AGENT_SCENARIOS.find(s => s.name === 'Triangle Resource Exchange');
  await executeMultiAgentScenario(scenario);
});
```

### Performance Testing

Use the benchmark utilities in `benchmarks/` for performance validation:

```typescript
import { PPR_BENCHMARKS } from '../benchmarks/ppr-benchmarks';

test('PPR issuance meets performance targets', async () => {
  const result = await measurePPRIssuancePerformance(testData);

  assert(result.duration < PPR_BENCHMARKS.BI_DIRECTIONAL_RECEIPT_CREATION);
});
```

## Integration with DNA Development

This testing skill works in conjunction with the DNA development skill:

1. **DNA Development**: Use `dna-dev` skill to create and modify Holochain zomes
2. **Testing**: Use this `tryorama-testing` skill to validate DNA functionality
3. **Iteration**: Cycle between development and testing for rapid iteration

## Debugging Tips

1. **Use warn! macros in Rust**: Add `warn!` statements in zome code for debugging
2. **Enable detailed logging**: Use `--verbose` flag for detailed test output
3. **Test isolation**: Use `.only()` to focus on specific tests during development
4. **Performance profiling**: Use the built-in profiler for performance investigation
5. **Error validation**: Always test both success and failure cases

## Best Practices

1. **Consistent Test Data**: Use fixtures for reproducible test scenarios
2. **Comprehensive Validation**: Validate all aspects of complex data structures
3. **Performance Monitoring**: Include performance benchmarks in critical path testing
4. **Multi-Agent Testing**: Test real-world collaboration scenarios
5. **Error Testing**: Validate error handling and edge cases
6. **Test Isolation**: Ensure tests don't depend on each other's state