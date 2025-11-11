/**
 * Core testing patterns and utilities for nondominium Holochain Tryorama testing
 */

import { CallableCell, AgentPubKey, ActionHash } from "@holochain/client";
import { assert } from "vitest";

// Common test interfaces
export interface AgentCell {
  agent: AgentPubKey;
  cell: CallableCell;
  name: string;
}

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<void>;
  validate: (results: any) => boolean;
  cleanup: () => Promise<void>;
}

export interface PerformanceMetrics {
  quality: number;
  timeliness: number;
  communication: number;
  overall_satisfaction: number;
  reliability: number;
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Agent setup utilities
 */
export async function setupAgents(count: number): Promise<AgentCell[]> {
  const agents: AgentCell[] = [];

  for (let i = 0; i < count; i++) {
    const agentPubKey = await generateAgentPubKey();
    const agentName = `TestAgent${i + 1}`;

    // Note: In actual implementation, you would create cells through conductor
    // This is a simplified version for documentation purposes
    agents.push({
      agent: agentPubKey,
      cell: null as any, // Would be actual CallableCell
      name: agentName
    });
  }

  return agents;
}

/**
 * Test data generators
 */
export function generatePerformanceMetrics(
  overrides?: Partial<PerformanceMetrics>
): PerformanceMetrics {
  return {
    quality: 0.8,
    timeliness: 0.8,
    communication: 0.8,
    overall_satisfaction: 0.8,
    reliability: 0.8,
    notes: "Test generated metrics",
    ...overrides
  };
}

/**
 * Common test patterns
 */
export async function testZomeFunction<T, R>(
  cell: CallableCell,
  zomeName: string,
  functionName: string,
  input: T,
  expectedFields?: (keyof R)[]
): Promise<R> {
  const result = await cell.callZome({
    zome_name: zomeName,
    fn_name: functionName,
    payload: input,
  });

  if (expectedFields) {
    for (const field of expectedFields) {
      assert.ok(result[field], `Missing expected field: ${String(field)}`);
    }
  }

  return result;
}

/**
 * Error testing pattern
 */
export async function expectError<T>(
  cell: CallableCell,
  zomeName: string,
  functionName: string,
  input: T,
  expectedErrorPattern?: string
): Promise<void> {
  try {
    await cell.callZome({
      zome_name: zomeName,
      fn_name: functionName,
      payload: input,
    });
    assert.fail("Expected function to throw an error");
  } catch (error) {
    if (expectedErrorPattern) {
      assert.ok(
        error.message.includes(expectedErrorPattern),
        `Error message doesn't contain expected pattern: ${expectedErrorPattern}`
      );
    }
  }
}

/**
 * Multi-agent testing utilities
 */
export async function executeMultiAgentScenario(
  agents: AgentCell[],
  scenario: (agents: AgentCell[]) => Promise<void>
): Promise<void> {
  // Setup phase
  for (const agent of agents) {
    // Additional setup if needed
  }

  // Execute scenario
  await scenario(agents);

  // Cleanup phase
  for (const agent of agents) {
    // Cleanup if needed
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceProfiler {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }
}

/**
 * Validation helpers
 */
export function validatePerformanceMetrics(
  metrics: PerformanceMetrics,
  minQuality: number = 0.7,
  minTimeliness: number = 0.7
): ValidationResult {
  const issues: string[] = [];

  if (metrics.quality < minQuality) {
    issues.push(`Quality ${metrics.quality} below minimum ${minQuality}`);
  }

  if (metrics.timeliness < minTimeliness) {
    issues.push(`Timeliness ${metrics.timeliness} below minimum ${minTimeliness}`);
  }

  if (metrics.reliability < 0.7) {
    issues.push(`Reliability ${metrics.reliability} below threshold`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Common test fixtures
 */
export const TEST_FIXTURES = {
  basicPerson: {
    name: "Test Person",
    nickname: "testuser",
    bio: "Test user for validation",
    user_type: "accountable",
    email: "test@example.com",
    time_zone: "UTC",
    location: "Test Location"
  },

  basicResource: {
    name: "Test Resource",
    current_state: "available",
    note: "Test resource description"
  },

  basicPPR: {
    claim_type: "ResourceCreation",
    performance_metrics: {
      quality: 0.8,
      timeliness: 0.8,
      communication: 0.7,
      overall_satisfaction: 0.7,
      reliability: 0.8,
      notes: "Basic PPR metrics"
    }
  }
};

/**
 * Helper function to generate test data with overrides
 */
export function createTestData<T>(
  baseFixture: T,
  overrides?: Partial<T>
): T {
  return {
    ...baseFixture,
    ...overrides
  };
}

/**
 * Utility for generating AgentPubKey (mock version for documentation)
 */
async function generateAgentPubKey(): Promise<AgentPubKey> {
  // In actual implementation, this would use Holochain's key generation
  return "mock_agent_pub_key" as AgentPubKey;
}