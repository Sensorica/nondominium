import {
  ActionHash,
  AppBundleSource,
  fakeActionHash,
  fakeAgentPubKey,
  fakeDnaHash,
  fakeEntryHash,
  hashFrom32AndType,
  NewEntryAction,
  Record,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
} from "@holochain/client";
import { CallableCell } from "@holochain/tryorama";

// Test Data Factories
export const createTestPerson = () => ({
  name: "Alice Smith",
  avatar_url: "https://example.com/avatar.jpg",
});

export const createTestPersonVariation = (suffix: string) => ({
  name: `Test User ${suffix}`,
  avatar_url: `https://example.com/avatar-${suffix}.jpg`,
});

export const createTestEncryptedData = () => ({
  encrypted_data: new Array(32).fill(0).map(() => Math.floor(Math.random() * 256)),
  encryption_method: "XSalsa20Poly1305",
});

export const createTestResourceSpec = () => ({
  name: "Community Garden Plot",
  description: "A 4x4 meter plot in the community garden available for collective use",
  image_url: "https://example.com/garden-plot.jpg",
});

export const createTestGovernanceRule = () => ({
  rule_type: "access_requirement",
  rule_data: JSON.stringify({
    min_reputation: 10,
    max_concurrent_usage: 5,
    booking_advance_days: 7
  }),
  enforced_by: "steward",
});

export const createTestRole = () => ({
  role_name: "Community Steward",
  description: "Responsible for maintaining community resources and mediating conflicts",
});

// Test Assertions Helpers
export interface TestPersonOutput {
  person_hash: ActionHash;
  person: {
    agent_pub_key: AgentPubKey;
    name: string;
    avatar_url?: string;
    created_at: number;
  };
}

export interface TestEncryptedDataOutput {
  encrypted_data_hash: ActionHash;
  encrypted_data: {
    agent_pub_key: AgentPubKey;
    encrypted_data: number[];
    encryption_method: string;
    created_at: number;
  };
}

export interface TestAgentProfileOutput {
  person?: {
    agent_pub_key: AgentPubKey;
    name: string;
    avatar_url?: string;
    created_at: number;
  };
  encrypted_data: Array<{
    agent_pub_key: AgentPubKey;
    encrypted_data: number[];
    encryption_method: string;
    created_at: number;
  }>;
}

// Test Validation Helpers
export const validatePersonCreation = (result: TestPersonOutput, input: any, agentPubKey: AgentPubKey) => {
  console.log("Validating person creation:", result);

  // Validate basic structure
  if (!result.person_hash) {
    throw new Error("person_hash missing from response");
  }

  if (!result.person) {
    throw new Error("person data missing from response");
  }

  // Validate person data
  if (result.person.name !== input.name) {
    throw new Error(`Expected name '${input.name}', got '${result.person.name}'`);
  }

  if (result.person.avatar_url !== input.avatar_url) {
    throw new Error(`Expected avatar_url '${input.avatar_url}', got '${result.person.avatar_url}'`);
  }

  if (encodeHashToBase64(result.person.agent_pub_key) !== encodeHashToBase64(agentPubKey)) {
    throw new Error("Agent pub key mismatch");
  }

  // Validate timestamp (should be recent)
  const now = Date.now() * 1000; // Convert to microseconds
  const timeDiff = Math.abs(now - result.person.created_at);
  if (timeDiff > 60 * 1000 * 1000) { // 60 seconds in microseconds
    console.warn(`Timestamp seems old: ${timeDiff / 1000000} seconds difference`);
  }

  return true;
};

export const validateEncryptedDataCreation = (result: TestEncryptedDataOutput, input: any, agentPubKey: AgentPubKey) => {
  console.log("Validating encrypted data creation:", result);

  if (!result.encrypted_data_hash) {
    throw new Error("encrypted_data_hash missing from response");
  }

  if (!result.encrypted_data) {
    throw new Error("encrypted_data missing from response");
  }

  if (JSON.stringify(result.encrypted_data.encrypted_data) !== JSON.stringify(input.encrypted_data)) {
    throw new Error("Encrypted data content mismatch");
  }

  if (result.encrypted_data.encryption_method !== input.encryption_method) {
    throw new Error(`Expected encryption_method '${input.encryption_method}', got '${result.encrypted_data.encryption_method}'`);
  }

  return true;
};

export const validateAgentProfile = (result: TestAgentProfileOutput, expectedName?: string) => {
  console.log("Validating agent profile:", result);

  if (expectedName && (!result.person || result.person.name !== expectedName)) {
    throw new Error(`Expected person name '${expectedName}', got '${result.person?.name || 'undefined'}'`);
  }

  if (!Array.isArray(result.encrypted_data)) {
    throw new Error("encrypted_data should be an array");
  }

  return true;
};

// Test Scenario Helpers
export const waitForDHTSync = async (ms: number = 1000) => {
  console.log(`Waiting ${ms}ms for DHT sync...`);
  await new Promise(resolve => setTimeout(resolve, ms));
};

export const createMultipleAgents = async (cells: CallableCell[], count: number) => {
  const agents = [];
  for (let i = 0; i < Math.min(count, cells.length); i++) {
    agents.push({
      cell: cells[i],
      agentPubKey: cells[i].cell_id[1],
      name: `Agent_${i + 1}`,
    });
  }
  return agents;
};

// Error Testing Helpers
export const expectError = async (asyncFn: () => Promise<any>, expectedErrorPattern?: string) => {
  try {
    const result = await asyncFn();
    throw new Error(`Expected function to throw error, but it succeeded with: ${JSON.stringify(result)}`);
  } catch (error) {
    if (expectedErrorPattern && !error.message.includes(expectedErrorPattern)) {
      throw new Error(`Expected error containing '${expectedErrorPattern}', got: ${error.message}`);
    }
    console.log("Expected error caught:", error.message);
    return error;
  }
};

// Utility Functions
export const logTestStart = (testName: string) => {
  console.log(`\n🧪 Starting test: ${testName}`);
  console.log("=".repeat(50));
};

export const logTestEnd = (testName: string, success: boolean) => {
  const status = success ? "✅ PASSED" : "❌ FAILED";
  console.log(`${status}: ${testName}`);
  console.log("=".repeat(50));
};

// App Bundle Helper
export const getAppBundleSource = (): AppBundleSource => ({
  type: "path",
  value: "../workdir/Nondominium.happ",
});

export const defaultTimeout = 60000; // 60 seconds
