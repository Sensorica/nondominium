import { test, expect } from "vitest";
import { runScenario } from "@holochain/tryorama";

import {
  PERFORMANCE_TEST_SCENARIOS,
  AdvancedPPRProfiler,
  simulateHighVolumeReceiptIssuance,
  detectMemoryLeaks,
  testConcurrentOperations,
  PPR_PERFORMANCE_BENCHMARKS,
} from "./common";

test("PPR Performance: Single Agent Receipt Issuance Load Test", async () => {
  await runScenario(async (scenario) => {
    const { alice } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const testScenario = PERFORMANCE_TEST_SCENARIOS[0]; // Single Agent Receipt Issuance
    const profiler = new AdvancedPPRProfiler(testScenario);

    const performanceResults = await simulateHighVolumeReceiptIssuance(
      [alice.cells[0]],
      testScenario.target_operations,
      10 // concurrency level
    );

    expect(performanceResults).toHaveLength(1);
    const results = performanceResults[0];

    // Performance assertions
    expect(results.success_rate).toBeGreaterThanOrEqual(testScenario.success_threshold);
    expect(results.total_execution_time).toBeLessThanOrEqual(testScenario.max_execution_time);
    expect(results.memory_usage_peak).toBeLessThanOrEqual(testScenario.memory_limit);

    // Throughput assertions
    expect(results.operations_per_second).toBeGreaterThan(1); // At least 1 op/sec
    expect(results.average_operation_time).toBeLessThan(PPR_PERFORMANCE_BENCHMARKS.BI_DIRECTIONAL_RECEIPT_CREATION);

    // Quality assertions
    expect(results.meets_benchmarks).toBe(true);
    expect(results.failed_operations).toBeLessThan(testScenario.target_operations * 0.1); // Less than 10% failures

    console.log(`Single Agent Performance Results:
      Success Rate: ${results.success_rate.toFixed(2)}%
      Ops/Second: ${results.operations_per_second.toFixed(2)}
      Avg Op Time: ${results.average_operation_time.toFixed(2)}ms
      Memory Peak: ${(results.memory_usage_peak / 1024 / 1024).toFixed(2)}MB
      Bottlenecks: ${results.bottlenecks_identified.join(', ') || 'None'}`);
  });
});

test("PPR Performance: Concurrent Multi-Agent Operations Load Test", async () => {
  await runScenario(async (scenario) => {
    const players = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const testScenario = PERFORMANCE_TEST_SCENARIOS[1]; // Concurrent Multi-Agent Operations
    const cells = [players.alice.cells[0], players.bob.cells[0], players.charlie.cells[0], 
                   players.david?.cells[0], players.eve?.cells[0]].filter(Boolean);

    const operationsPerAgent = Math.floor(testScenario.target_operations / cells.length);
    const concurrentResults = await testConcurrentOperations(
      cells,
      operationsPerAgent,
      testScenario.concurrent_agents
    );

    // Performance assertions
    expect(concurrentResults.success_rate).toBeGreaterThanOrEqual(testScenario.success_threshold);
    expect(concurrentResults.execution_time).toBeLessThanOrEqual(testScenario.max_execution_time);
    expect(concurrentResults.total_operations).toBe(cells.length * operationsPerAgent);

    // Concurrency assertions  
    expect(concurrentResults.concurrent_agents).toBe(cells.length);
    expect(concurrentResults.conflicts_detected).toBeLessThan(concurrentResults.total_operations * 0.05); // Less than 5% conflicts

    // Efficiency assertions - concurrent should be faster than sequential
    const sequentialEstimate = operationsPerAgent * cells.length * PPR_PERFORMANCE_BENCHMARKS.BI_DIRECTIONAL_RECEIPT_CREATION;
    expect(concurrentResults.execution_time).toBeLessThan(sequentialEstimate);

    console.log(`Multi-Agent Concurrent Results:
      Total Operations: ${concurrentResults.total_operations}
      Success Rate: ${concurrentResults.success_rate.toFixed(2)}%
      Execution Time: ${concurrentResults.execution_time.toFixed(2)}ms
      Conflicts Detected: ${concurrentResults.conflicts_detected}
      Concurrent Agents: ${concurrentResults.concurrent_agents}`);
  });
});

test("PPR Performance: High Volume Receipt Processing Stress Test", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob, charlie } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const testScenario = PERFORMANCE_TEST_SCENARIOS[2]; // High Volume Receipt Processing
    const cells = [alice.cells[0], bob.cells[0], charlie.cells[0]];

    const stressTestResults = await simulateHighVolumeReceiptIssuance(
      cells,
      Math.floor(testScenario.target_operations / cells.length),
      15 // Higher concurrency for stress test
    );

    // Aggregate results across all agents
    const totalOperations = stressTestResults.reduce((sum, r) => sum + r.total_operations, 0);
    const totalSuccessful = stressTestResults.reduce((sum, r) => sum + r.successful_operations, 0);
    const maxExecutionTime = Math.max(...stressTestResults.map(r => r.total_execution_time));
    const maxMemoryUsage = Math.max(...stressTestResults.map(r => r.memory_usage_peak));
    const overallSuccessRate = (totalSuccessful / totalOperations) * 100;

    // Stress test assertions (more lenient than normal load tests)
    expect(overallSuccessRate).toBeGreaterThanOrEqual(testScenario.success_threshold);
    expect(maxExecutionTime).toBeLessThanOrEqual(testScenario.max_execution_time);
    expect(maxMemoryUsage).toBeLessThanOrEqual(testScenario.memory_limit);

    // System stability assertions
    const allAgentsMeetBenchmarks = stressTestResults.every(r => r.success_rate >= testScenario.success_threshold - 5);
    expect(allAgentsMeetBenchmarks).toBe(true);

    // Performance degradation check
    const avgOpsPerSecond = stressTestResults.reduce((sum, r) => sum + r.operations_per_second, 0) / cells.length;
    expect(avgOpsPerSecond).toBeGreaterThan(0.5); // Minimum throughput under stress

    console.log(`High Volume Stress Test Results:
      Total Operations: ${totalOperations}
      Overall Success Rate: ${overallSuccessRate.toFixed(2)}%
      Max Execution Time: ${maxExecutionTime.toFixed(2)}ms
      Max Memory Usage: ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB
      Avg Ops/Second: ${avgOpsPerSecond.toFixed(2)}`);

    // Log individual agent performance
    stressTestResults.forEach((result, index) => {
      console.log(`Agent ${index + 1}: ${result.operations_per_second.toFixed(2)} ops/sec, ${result.success_rate.toFixed(2)}% success`);
    });
  });
});

test("PPR Performance: Memory Leak Detection Test", async () => {
  await runScenario(async (scenario) => {
    const { alice } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    // Run memory leak detection with moderate iteration count
    const memoryLeakTest = await detectMemoryLeaks(alice.cells[0], 100);

    // Memory leak assertions
    expect(memoryLeakTest.leak_detected).toBe(false);
    expect(memoryLeakTest.memory_growth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
    expect(memoryLeakTest.growth_rate).toBeLessThan(50 * 1024); // Less than 50KB per operation

    // Memory efficiency assertions
    const memoryGrowthPercentage = (memoryLeakTest.memory_growth / memoryLeakTest.initial_memory) * 100;
    expect(memoryGrowthPercentage).toBeLessThan(200); // Less than 200% growth

    console.log(`Memory Leak Test Results:
      Iterations: ${memoryLeakTest.iterations}
      Initial Memory: ${(memoryLeakTest.initial_memory / 1024 / 1024).toFixed(2)}MB
      Final Memory: ${(memoryLeakTest.final_memory / 1024 / 1024).toFixed(2)}MB
      Memory Growth: ${(memoryLeakTest.memory_growth / 1024 / 1024).toFixed(2)}MB
      Growth Rate: ${(memoryLeakTest.growth_rate / 1024).toFixed(2)}KB/op
      Leak Detected: ${memoryLeakTest.leak_detected}`);

    // Alert on concerning memory patterns
    if (memoryLeakTest.growth_rate > 10 * 1024) { // More than 10KB per operation
      console.warn(`⚠️  High memory growth rate detected: ${(memoryLeakTest.growth_rate / 1024).toFixed(2)}KB per operation`);
    }

    if (memoryGrowthPercentage > 100) {
      console.warn(`⚠️  Significant memory growth: ${memoryGrowthPercentage.toFixed(2)}% increase`);
    }
  });
});

test("PPR Performance: Signature Validation Load Test", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob, charlie, david } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
      { appBundleSource: { path: "./workdir/nondominium.happ" } },
    ]);

    await scenario.shareAllAgents();

    const testScenario = PERFORMANCE_TEST_SCENARIOS[3]; // Signature Validation Load Test
    const profiler = new AdvancedPPRProfiler(testScenario);
    profiler.start();

    const cells = [alice.cells[0], bob.cells[0], charlie.cells[0], david.cells[0]];
    const validationPromises: Promise<any>[] = [];
    let operationsCompleted = 0;

    // Create receipts and signatures for validation
    for (let i = 0; i < testScenario.target_operations; i++) {
      const cellIndex = i % cells.length;
      const signerIndex = (i + 1) % cells.length;
      
      const validationPromise = (async () => {
        const startTime = performance.now();
        try {
          // Create a receipt
          const claim = sampleParticipationClaim("ServiceProvision", {
            counterparty_agent: cells[signerIndex === cellIndex ? (signerIndex + 1) % cells.length : signerIndex].agentPubKey,
            description: `Signature validation test ${i + 1}`,
          });
          
          const receipts = await issueParticipationReceipts(cells[cellIndex], claim);
          expect(receipts).toHaveLength(2);

          // Sign the receipt
          const signatureResult = await signParticipationClaim(cells[signerIndex], {
            original_participation_hash: receipts[1].signed_action.hashed.hash,
            signature: {
              signature_data: new Uint8Array([i % 256, (i * 2) % 256, (i * 3) % 256]),
              signing_agent: cells[signerIndex].agentPubKey,
              timestamp: Date.now() * 1000,
              signature_method: "Ed25519",
              additional_context: new Map(),
            },
          });

          // Validate the signature
          const isValid = await validateParticipationClaimSignature(cells[cellIndex], {
            participation_claim_hash: receipts[1].signed_action.hashed.hash,
            signature_hash: signatureResult.signed_action.hashed.hash,
          });

          expect(isValid).toBe(true);

          const duration = performance.now() - startTime;
          profiler.recordOperation(duration, true);
          operationsCompleted++;
        } catch (error) {
          const duration = performance.now() - startTime;
          profiler.recordOperation(duration, false, error);
          operationsCompleted++;
        }
      })();

      validationPromises.push(validationPromise);

      // Process in batches to avoid overwhelming the system
      if (validationPromises.length >= 10 || i === testScenario.target_operations - 1) {
        await Promise.all(validationPromises);
        validationPromises.length = 0; // Clear the array
      }
    }

    const results = profiler.finish();

    // Performance assertions for signature validation
    expect(results.success_rate).toBeGreaterThanOrEqual(testScenario.success_threshold);
    expect(results.total_execution_time).toBeLessThanOrEqual(testScenario.max_execution_time);
    expect(results.average_operation_time).toBeLessThan(PPR_PERFORMANCE_BENCHMARKS.SIGNATURE_ROUND_TRIP);

    // Signature validation specific assertions
    expect(results.operations_per_second).toBeGreaterThan(2); // At least 2 full validation cycles per second
    expect(operationsCompleted).toBe(testScenario.target_operations);

    console.log(`Signature Validation Performance Results:
      Operations Completed: ${operationsCompleted}
      Success Rate: ${results.success_rate.toFixed(2)}%
      Total Time: ${results.total_execution_time.toFixed(2)}ms
      Avg Operation Time: ${results.average_operation_time.toFixed(2)}ms
      Validations/Second: ${results.operations_per_second.toFixed(2)}
      Memory Peak: ${(results.memory_usage_peak / 1024 / 1024).toFixed(2)}MB`);

    // Detailed performance report
    console.log(profiler.getDetailedReport());
  });
}, { timeout: 60000 }); // 60 second timeout for signature validation test