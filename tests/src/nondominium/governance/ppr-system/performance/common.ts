import { CallableCell } from "@holochain/tryorama";
import { ActionHash, Record as HolochainRecord, AgentPubKey } from "@holochain/client";

// Import PPR testing functions
import * as pprCommon from "../common";
export const issueParticipationReceipts = pprCommon.issueParticipationReceipts;
export const sampleParticipationClaim = pprCommon.sampleParticipationClaim;
export const generateBulkParticipationClaims = pprCommon.generateBulkParticipationClaims;
export const PPR_PERFORMANCE_BENCHMARKS = pprCommon.PPR_PERFORMANCE_BENCHMARKS;
export const PPRTestProfiler = pprCommon.PPRTestProfiler;
export const measureOperationTime = pprCommon.measureOperationTime;

// Performance-specific test scenarios
export interface PerformanceTestScenario {
  name: string;
  description: string;
  target_operations: number;
  concurrent_agents: number;
  max_execution_time: number; // ms
  success_threshold: number; // percentage
  memory_limit: number; // bytes
}

export const PERFORMANCE_TEST_SCENARIOS: PerformanceTestScenario[] = [
  {
    name: "Single Agent Receipt Issuance",
    description: "Test single agent issuing multiple receipts sequentially",
    target_operations: 50,
    concurrent_agents: 1,
    max_execution_time: 10000, // 10 seconds
    success_threshold: 95,
    memory_limit: 100 * 1024 * 1024, // 100MB
  },
  {
    name: "Concurrent Multi-Agent Operations",
    description: "Multiple agents issuing receipts simultaneously", 
    target_operations: 100,
    concurrent_agents: 5,
    max_execution_time: 15000, // 15 seconds
    success_threshold: 90,
    memory_limit: 200 * 1024 * 1024, // 200MB
  },
  {
    name: "High Volume Receipt Processing",
    description: "Stress test with large number of receipt operations",
    target_operations: 200,
    concurrent_agents: 3,
    max_execution_time: 30000, // 30 seconds
    success_threshold: 85,
    memory_limit: 300 * 1024 * 1024, // 300MB
  },
  {
    name: "Signature Validation Load Test", 
    description: "Heavy signature validation processing",
    target_operations: 100,
    concurrent_agents: 4,
    max_execution_time: 20000, // 20 seconds
    success_threshold: 92,
    memory_limit: 150 * 1024 * 1024, // 150MB
  },
];

// Performance metrics collection
export interface PPRPerformanceMetrics {
  scenario_name: string;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  total_execution_time: number; // ms
  average_operation_time: number; // ms
  operations_per_second: number;
  memory_usage_peak: number; // bytes
  memory_usage_average: number; // bytes
  success_rate: number; // percentage
  meets_benchmarks: boolean;
  bottlenecks_identified: string[];
}

// Advanced performance profiler for PPR operations
export class AdvancedPPRProfiler {
  private startTime: number = 0;
  private operationTimes: number[] = [];
  private memorySnapshots: number[] = [];
  private errorLog: any[] = [];
  private operationCount: number = 0;
  private scenario: PerformanceTestScenario;

  constructor(scenario: PerformanceTestScenario) {
    this.scenario = scenario;
  }

  start(): void {
    this.startTime = performance.now();
    this.recordMemorySnapshot();
  }

  recordOperation(duration: number, success: boolean, error?: any): void {
    this.operationTimes.push(duration);
    this.operationCount++;
    
    if (!success && error) {
      this.errorLog.push({ operation: this.operationCount, error, timestamp: Date.now() });
    }
    
    this.recordMemorySnapshot();
  }

  private recordMemorySnapshot(): void {
    const memory = (performance as any).memory;
    if (memory) {
      this.memorySnapshots.push(memory.usedJSHeapSize);
    }
  }

  finish(): PPRPerformanceMetrics {
    const totalTime = performance.now() - this.startTime;
    const successfulOps = this.operationTimes.length - this.errorLog.length;
    const failedOps = this.errorLog.length;
    
    const averageOpTime = this.operationTimes.length > 0 
      ? this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length
      : 0;
    
    const opsPerSecond = totalTime > 0 ? (successfulOps * 1000) / totalTime : 0;
    const successRate = (successfulOps / this.scenario.target_operations) * 100;
    
    const memoryPeak = Math.max(...this.memorySnapshots);
    const memoryAverage = this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length;
    
    const meetsBenchmarks = this.evaluateBenchmarks(totalTime, successRate, memoryPeak);
    const bottlenecks = this.identifyBottlenecks(totalTime, averageOpTime, memoryPeak, successRate);

    return {
      scenario_name: this.scenario.name,
      total_operations: this.operationCount,
      successful_operations: successfulOps,
      failed_operations: failedOps,
      total_execution_time: totalTime,
      average_operation_time: averageOpTime,
      operations_per_second: opsPerSecond,
      memory_usage_peak: memoryPeak,
      memory_usage_average: memoryAverage,
      success_rate: successRate,
      meets_benchmarks: meetsBenchmarks,
      bottlenecks_identified: bottlenecks,
    };
  }

  private evaluateBenchmarks(
    totalTime: number, 
    successRate: number, 
    memoryPeak: number
  ): boolean {
    return (
      totalTime <= this.scenario.max_execution_time &&
      successRate >= this.scenario.success_threshold &&
      memoryPeak <= this.scenario.memory_limit
    );
  }

  private identifyBottlenecks(
    totalTime: number,
    averageOpTime: number,
    memoryPeak: number,
    successRate: number
  ): string[] {
    const bottlenecks: string[] = [];

    if (totalTime > this.scenario.max_execution_time) {
      bottlenecks.push("execution_time_exceeded");
    }

    if (averageOpTime > PPR_PERFORMANCE_BENCHMARKS.BI_DIRECTIONAL_RECEIPT_CREATION) {
      bottlenecks.push("slow_receipt_creation");
    }

    if (memoryPeak > this.scenario.memory_limit) {
      bottlenecks.push("memory_usage_high");
    }

    if (successRate < this.scenario.success_threshold) {
      bottlenecks.push("operation_failure_rate_high");
    }

    if (this.errorLog.length > this.scenario.target_operations * 0.1) {
      bottlenecks.push("error_rate_excessive");
    }

    return bottlenecks;
  }

  getDetailedReport(): string {
    const metrics = this.finish();
    
    return `
Performance Test Report: ${metrics.scenario_name}
========================================
Total Operations: ${metrics.total_operations}
Successful: ${metrics.successful_operations} (${metrics.success_rate.toFixed(2)}%)
Failed: ${metrics.failed_operations}
Total Time: ${metrics.total_execution_time.toFixed(2)}ms
Average Operation Time: ${metrics.average_operation_time.toFixed(2)}ms
Operations/Second: ${metrics.operations_per_second.toFixed(2)}
Memory Peak: ${(metrics.memory_usage_peak / 1024 / 1024).toFixed(2)}MB
Memory Average: ${(metrics.memory_usage_average / 1024 / 1024).toFixed(2)}MB
Meets Benchmarks: ${metrics.meets_benchmarks ? 'YES' : 'NO'}
Bottlenecks: ${metrics.bottlenecks_identified.join(', ') || 'None'}

Error Summary:
${this.errorLog.length > 0 
  ? this.errorLog.map(e => `- Operation ${e.operation}: ${e.error}`).join('\n')
  : '- No errors recorded'
}
`;
  }
}

// Load testing helpers
export async function simulateHighVolumeReceiptIssuance(
  cells: CallableCell[],
  receiptCount: number,
  concurrencyLevel: number = 10
): Promise<PPRPerformanceMetrics[]> {
  const results: PPRPerformanceMetrics[] = [];
  
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const scenario: PerformanceTestScenario = {
      name: `Cell ${cellIndex + 1} Load Test`,
      description: `High volume receipt issuance for cell ${cellIndex + 1}`,
      target_operations: receiptCount,
      concurrent_agents: 1,
      max_execution_time: 30000,
      success_threshold: 90,
      memory_limit: 200 * 1024 * 1024,
    };

    const profiler = new AdvancedPPRProfiler(scenario);
    profiler.start();

    // Generate bulk claims
    const claims = generateBulkParticipationClaims(receiptCount, "ResourceContribution");
    
    // Process in batches
    for (let i = 0; i < claims.length; i += concurrencyLevel) {
      const batch = claims.slice(i, i + concurrencyLevel);
      const batchPromises = batch.map(async (claim) => {
        const startTime = performance.now();
        try {
          await issueParticipationReceipts(cells[cellIndex], claim);
          const duration = performance.now() - startTime;
          profiler.recordOperation(duration, true);
        } catch (error) {
          const duration = performance.now() - startTime;
          profiler.recordOperation(duration, false, error);
        }
      });
      
      await Promise.all(batchPromises);
    }

    results.push(profiler.finish());
  }
  
  return results;
}

// Memory leak detection
export interface MemoryLeakTest {
  test_name: string;
  iterations: number;
  initial_memory: number;
  final_memory: number;
  peak_memory: number;
  memory_growth: number;
  leak_detected: boolean;
  growth_rate: number; // bytes per iteration
}

export async function detectMemoryLeaks(
  cell: CallableCell,
  iterations: number = 100
): Promise<MemoryLeakTest> {
  const testName = `Memory Leak Detection - ${iterations} iterations`;
  const memorySnapshots: number[] = [];
  
  // Initial memory snapshot
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  memorySnapshots.push(initialMemory);

  // Perform repeated operations
  for (let i = 0; i < iterations; i++) {
    const claim = sampleParticipationClaim("ResourceContribution", {
      description: `Memory test iteration ${i + 1}`,
    });
    
    await issueParticipationReceipts(cell, claim);
    
    // Record memory after every 10 operations
    if ((i + 1) % 10 === 0) {
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      memorySnapshots.push(currentMemory);
    }
  }

  // Final memory snapshot
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  memorySnapshots.push(finalMemory);

  // Analysis
  const memoryGrowth = finalMemory - initialMemory;
  const peakMemory = Math.max(...memorySnapshots);
  const growthRate = memoryGrowth / iterations;
  
  // Leak detection heuristics
  const significantGrowth = memoryGrowth > 10 * 1024 * 1024; // 10MB
  const consistentGrowth = memorySnapshots.slice(-5).every((mem, i, arr) => 
    i === 0 || mem >= arr[i - 1]
  );
  
  const leakDetected = significantGrowth && consistentGrowth;

  return {
    test_name: testName,
    iterations,
    initial_memory: initialMemory,
    final_memory: finalMemory,
    peak_memory: peakMemory,
    memory_growth: memoryGrowth,
    leak_detected: leakDetected,
    growth_rate: growthRate,
  };
}

// Concurrent operation testing
export async function testConcurrentOperations(
  cells: CallableCell[],
  operationsPerAgent: number,
  maxConcurrency: number = 5
): Promise<{
  total_operations: number;
  concurrent_agents: number;
  execution_time: number;
  success_rate: number;
  conflicts_detected: number;
}> {
  const startTime = performance.now();
  let totalOperations = 0;
  let successfulOperations = 0;
  let conflictsDetected = 0;

  // Create concurrent operations across all agents
  const agentPromises = cells.map(async (cell, agentIndex) => {
    const agentSuccesses: boolean[] = [];
    
    for (let i = 0; i < operationsPerAgent; i++) {
      try {
        const claim = sampleParticipationClaim("ServiceProvision", {
          description: `Concurrent test - Agent ${agentIndex + 1}, Op ${i + 1}`,
          resource_specification: `concurrent-resource-${agentIndex}-${i}`,
        });
        
        await issueParticipationReceipts(cell, claim);
        agentSuccesses.push(true);
        totalOperations++;
      } catch (error) {
        agentSuccesses.push(false);
        totalOperations++;
        
        // Check if error indicates a conflict
        if (error && (error as any).message?.includes("conflict")) {
          conflictsDetected++;
        }
      }
    }
    
    return agentSuccesses.filter(s => s).length;
  });

  const agentResults = await Promise.all(agentPromises);
  successfulOperations = agentResults.reduce((sum, count) => sum + count, 0);

  const executionTime = performance.now() - startTime;
  const successRate = (successfulOperations / totalOperations) * 100;

  return {
    total_operations: totalOperations,
    concurrent_agents: cells.length,
    execution_time: executionTime,
    success_rate: successRate,
    conflicts_detected: conflictsDetected,
  };
}