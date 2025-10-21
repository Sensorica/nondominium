# Nondominium Test Suite

Comprehensive testing framework for the nondominium Holochain application, organized following domain-driven patterns for maximum maintainability and coverage.

## 🏗️ **Test Architecture Overview**

The test suite follows a **4-layer hierarchical structure** optimized for the 3-zome architecture:

### **Layer 1: Foundation Tests**
- **Purpose**: Basic zome function connectivity and core operations
- **Scope**: Individual zome functions, data structure validation, basic CRUD operations
- **Pattern**: `*/foundation-tests.test.ts`

### **Layer 2: Integration Tests** 
- **Purpose**: Cross-zome interactions and multi-agent scenarios
- **Scope**: Inter-zome communication, data consistency, role-based access validation
- **Pattern**: `*/integration-tests.test.ts`

### **Layer 3: Scenario Tests**
- **Purpose**: Complete user workflows and business logic validation
- **Scope**: End-to-end user journeys, complex multi-step processes
- **Pattern**: `*/scenario-tests.test.ts`

### **Layer 4: Specialized Tests**
- **Purpose**: Domain-specific advanced testing (performance, security, edge cases)
- **Scope**: Load testing, stress testing, specialized validation patterns
- **Pattern**: `*/[specialized]/[test-type].test.ts`

## 📁 **Directory Structure**

```
tests/src/nondominium/
├── person/                           # Agent identity & role management
│   ├── common.ts                     # Shared person test utilities
│   ├── foundation-tests.test.ts      # Basic person operations
│   ├── integration-tests.test.ts     # Cross-zome person interactions
│   ├── scenario-tests.test.ts        # Complete person workflows
│   ├── private-data-sharing.test.ts  # Privacy-specific testing
│   └── role-management/              # Advanced role testing
│       ├── common.ts                 # Role management utilities
│       ├── capability-validation.test.ts
│       ├── role-assignment.test.ts
│       └── access-control.test.ts
├── resource/                         # Resource lifecycle management  
│   ├── common.ts                     # Shared resource test utilities
│   ├── foundation-tests.test.ts      # Basic resource operations
│   ├── integration-tests.test.ts     # Cross-zome resource interactions
│   ├── scenario-tests.test.ts        # Complete resource workflows
│   └── lifecycle/                    # Advanced resource testing
│       ├── common.ts                 # Resource lifecycle utilities
│       ├── resource-creation.test.ts
│       ├── resource-transfers.test.ts
│       └── resource-governance.test.ts
├── governance/                       # Governance & PPR system
│   ├── common.ts                     # Shared governance utilities
│   ├── foundation-tests.test.ts      # Basic governance operations
│   ├── integration-tests.test.ts     # Cross-zome governance interactions
│   ├── scenario-tests.test.ts        # Complete governance workflows
│   └── ppr-system/                   # **🎯 PPR System Testing**
│       ├── common.ts                 # PPR-specific utilities
│       ├── ppr-foundation.test.ts    # ✅ PPR basic operations
│       ├── ppr-integration.test.ts   # ✅ PPR cross-zome integration
│       ├── ppr-scenarios.test.ts     # 🆕 Complete PPR workflows
│       ├── reputation-derivation.test.ts
│       ├── economic-events.test.ts
│       └── performance/              # 🆕 PPR Performance Testing
│           ├── common.ts             # Performance testing utilities
│           ├── load-testing.test.ts  # High-volume PPR operations
│           └── scalability.test.ts   # Multi-agent scalability
└── utils.ts                          # Global test utilities
```

## 🎯 **PPR System Testing Framework**

The **Private Participation Receipts (PPR) system** has dedicated comprehensive testing coverage:

### **Core PPR Tests**
- **`ppr-foundation.test.ts`** ✅ - Basic PPR functionality (505 lines)
- **`ppr-integration.test.ts`** ✅ - Cross-zome PPR integration (516 lines)  
- **`ppr-scenarios.test.ts`** 🆕 - Complete PPR user workflows
- **`reputation-derivation.test.ts`** 🆕 - Reputation calculation and aggregation
- **`economic-events.test.ts`** 🆕 - PPR integration with economic events

### **PPR Performance Testing**
- **`performance/load-testing.test.ts`** 🆕 - High-volume receipt processing
- **`performance/scalability.test.ts`** 🆕 - Multi-agent concurrent operations

### **PPR Test Scenarios**
- ✅ **Basic Resource Contribution** - Standard bi-directional receipt generation
- ✅ **Service Exchange** - Bilateral service transactions with quality metrics
- ✅ **Knowledge Sharing Session** - Community learning and teaching interactions
- ✅ **Governance Participation** - Decision-making and consensus building
- ✅ **Multi-Agent Network Interactions** - Complex community workflows

## 🚀 **Test Commands**

### **Basic Test Execution**
```bash
bun run test                          # Run all tests
bun run test:watch                    # Watch mode for development
bun run test:debug                    # Verbose output with debugging
bun run test:coverage                 # Generate coverage reports
```

### **Domain-Specific Tests**
```bash
bun run test:person                   # All person-related tests
bun run test:resource                 # All resource-related tests  
bun run test:governance               # All governance-related tests
```

### **Layer-Specific Tests**
```bash
bun run test:foundation               # Foundation tests across all domains
bun run test:integration              # Integration tests across all domains
bun run test:scenarios                # Scenario tests across all domains
```

### **PPR System Tests** 🎯
```bash
bun run test:ppr                      # All PPR system tests
bun run test:ppr-foundation           # Basic PPR functionality
bun run test:ppr-integration          # PPR cross-zome integration
bun run test:ppr-scenarios            # PPR complete workflows
bun run test:ppr-performance          # PPR performance and load testing
```

### **Specialized Tests**
```bash
bun run test:roles                    # Role management and access control
bun run test:resources-lifecycle      # Resource lifecycle management
```

## 🧪 **Test Patterns & Best Practices**

### **Common Test Utilities Pattern**
Each domain includes a `common.ts` file with:
- **Sample Data Generators**: `samplePerson()`, `sampleParticipationClaim()`
- **Zome Function Wrappers**: `createPerson()`, `issueParticipationReceipts()`
- **Validation Helpers**: `validatePersonData()`, `validateBiDirectionalReceipts()`
- **Test Context Setup**: `setupBasicPersons()`, `setupPPRTestScenario()`

### **Multi-Agent Test Scenarios**
Following the established pattern from requests-and-offers:
- **Lynn (Lynn)** - Primary test agent, usually the provider/initiator
- **Bob** - Secondary test agent, usually the receiver/participant  
- **Charlie** - Tertiary test agent for complex multi-party scenarios

### **Performance Testing Framework**
Advanced performance measurement for PPR system:
- **`PPRTestProfiler`** - Real-time performance monitoring
- **`AdvancedPPRProfiler`** - Comprehensive performance analysis
- **Memory leak detection** with iteration-based growth monitoring
- **Concurrent operation testing** with conflict detection

## 📊 **Test Coverage & Quality Metrics**

### **Current Status**
- ✅ **Person Management**: Complete coverage (foundation, integration, scenarios)
- ✅ **PPR Foundation**: Comprehensive coverage (1,021+ lines of tests)
- 🔄 **Resource Management**: Foundation tests (Phase 2)
- 🔄 **Governance Workflows**: Foundation tests (Phase 2)

### **Performance Benchmarks**
PPR system performance targets:
- **Receipt Issuance**: < 1000ms for bi-directional creation
- **Signature Validation**: < 200ms round-trip time  
- **Reputation Derivation**: < 1500ms aggregation time
- **Concurrent Operations**: 90%+ success rate with 5+ agents
- **Memory Efficiency**: < 20MB growth per 100 operations

### **Quality Gates**
All tests must pass:
1. **Functional Validation**: Core operations work correctly
2. **Integration Validation**: Cross-zome communication functions
3. **Performance Validation**: Operations meet benchmark requirements
4. **Security Validation**: Role-based access control enforced
5. **Data Integrity**: Consistent data across distributed nodes

## 🔧 **Configuration**

### **Vitest Configuration**
```typescript
export default defineConfig({
  test: {
    testTimeout: 60 * 1000 * 4, // 4 minutes for complex scenarios
    poolOptions: {
      forks: { singleFork: true }, // Holochain requires single fork
    },
  },
});
```

### **ESLint Configuration** (Modern Flat Config)
```javascript
// eslint.config.js - Modern ESLint flat config
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
```

### **Test Environment**
- **Framework**: Vitest 3.1.3 with Holochain tryorama 0.18.2
- **Timeout**: 4 minutes for complex multi-agent scenarios
- **Concurrency**: Single fork execution for DHT consistency
- **Agent Simulation**: Supports 2-5 distributed agents per test

## 🎯 **Next Steps: PPR Extensive Testing Phase**

With the reorganized structure in place, you're now ready for comprehensive PPR system testing:

### **Phase 2: Extensive Testing** (Current)
1. **Performance Testing**: Execute load tests and scalability analysis
2. **Security Testing**: Validate cryptographic signatures and access controls
3. **Edge Case Testing**: Test boundary conditions and error scenarios
4. **Integration Testing**: Verify PPR integration with resource/person systems

### **Phase 3: Production Readiness** (Future)
1. **End-to-End Testing**: Complete user journey validation
2. **Cross-Platform Testing**: Multi-environment compatibility
3. **Deployment Testing**: Holochain network deployment validation
4. **User Acceptance Testing**: Community member workflow testing

---

This test framework provides the foundation for thorough validation of the nondominium PPR system while maintaining excellent organization and maintainability patterns established in your requests-and-offers project. 