/**
 * Template for Holochain test suite
 * Copy this template and replace {{DOMAIN_NAME}} with your domain name
 * This template is tailored for nondominium ValueFlows testing
 *
 * IMPORTANT: Use .only() during development to run tests atomically:
 * test.only("your test name", async () => { ... });
 * describe.only("your test suite", () => { ... });
 */

import { assert, test, expect } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

// Import your test utilities and common functions
import {
  // Import your zome functions here
  // create{{DOMAIN_NAME}},
  // get{{DOMAIN_NAME}},
  // update{{DOMAIN_NAME}},
  // delete{{DOMAIN_NAME}},
  // ... other imports
} from "./common";

import { runScenarioWithTwoAgents, runScenarioWithThreeAgents } from "../utils";
import { {{DOMAIN_NAME}} } from "@nondominium/shared-types";

// Test constants
const TEST_TIMEOUT = 240000; // 4 minutes
const SAMPLE_AGENT = "uhCAk-{{domain_name.toLowerCase()}}_agent_test";
const SAMPLE_NAME = "Test {{DOMAIN_NAME}}";
const SAMPLE_DESCRIPTION = "Test {{DOMAIN_NAME}} description";

// Sample data generators
export const sample{{DOMAIN_NAME}} = (agent?: AgentPubKey) => ({
  name: SAMPLE_NAME,
  description: SAMPLE_DESCRIPTION,
  agent: agent || AgentPubKey::from_raw_36(SAMPLE_AGENT),
  metadata: {
    created_by_test: "true",
    test_timestamp: Date.now().toString(),
  },
});

export const sample{{DOMAIN_NAME}}Input = {
  name: SAMPLE_NAME,
  description: SAMPLE_DESCRIPTION,
  metadata: {
    created_by_test: "true",
    test_timestamp: Date.now().toString(),
  },
};

// Foundation Tests

// DEVELOPMENT TIP: Add .only() to focus on single test during development
// Example: test.only("create and retrieve {{DOMAIN_NAME}}", async () => {
// This will run only this test, skipping all others for faster iteration!

test("create and retrieve {{DOMAIN_NAME}}", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Agent 1 creates a {{DOMAIN_NAME}}
      const input = sample{{DOMAIN_NAME}}Input;
      const hash = await create{{DOMAIN_NAME}}(agent1, input);
      assert.ok(hash);

      // Retrieve the {{DOMAIN_NAME}}
      const retrieved = await get{{DOMAIN_NAME}}(agent1, hash);
      assert.ok(retrieved);
      assert.equal(retrieved.name, input.name);
      assert.equal(retrieved.description, input.description);

      // Agent 2 should not see private details (depending on your access model)
      // This behavior depends on your specific implementation
    }
  );
}, TEST_TIMEOUT);

test("validate {{DOMAIN_NAME}} data", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Test valid data
      const validInput = {
        name: "Valid {{DOMAIN_NAME}}",
        description: "This is a valid {{DOMAIN_NAME}}",
        metadata: { "key": "value" },
      };

      const hash = await create{{DOMAIN_NAME}}(agent1, validInput);
      assert.ok(hash);

      // Test invalid data (empty name)
      const invalidInput = {
        name: "",
        description: "Invalid {{DOMAIN_NAME}}",
        metadata: {},
      };

      try {
        await create{{DOMAIN_NAME}}(agent1, invalidInput);
        assert.fail("Should have thrown validation error");
      } catch (error) {
        assert.ok(error.message.includes("name") || error.message.includes("validation"));
      }
    }
  );
}, TEST_TIMEOUT);

test("update {{DOMAIN_NAME}}", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create original {{DOMAIN_NAME}}
      const originalInput = sample{{DOMAIN_NAME}}Input;
      const originalHash = await create{{DOMAIN_NAME}}(agent1, originalInput);
      assert.ok(originalHash);

      // Update the {{DOMAIN_NAME}}
      const updateInput = {
        name: "Updated {{DOMAIN_NAME}}",
        description: Some("Updated description"),
        metadata: Some({ "updated": "true" }),
        status: {{DOMAIN_NAME}}Status.Approved,
      };

      const updatedHash = await update{{DOMAIN_NAME}}(agent1, originalHash, updateInput);
      assert.ok(updatedHash);

      // Verify update
      const updated = await get{{DOMAIN_NAME}}(agent1, updatedHash);
      assert.ok(updated);
      assert.equal(updated.name, "Updated {{DOMAIN_NAME}}");
      assert.equal(updated.description, "Updated description");
      assert.equal(updated.status, {{DOMAIN_NAME}}Status.Approved);
    }
  );
}, TEST_TIMEOUT);

test("delete {{DOMAIN_NAME}}", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: Player1App, agent2: PlayerApp) => {
      // Create {{DOMAIN_NAME}}
      const input = sample{{DOMAIN_NAME}}Input;
      const hash = await create{{DOMAIN_NAME}}(agent1, input);
      assert.ok(hash);

      // Verify it exists
      const beforeDelete = await get{{DOMAIN_NAME}}(agent1, hash);
      assert.ok(beforeDelete);

      // Delete the {{DOMAIN_NAME}}
      await delete{{DOMAIN_NAME}}(agent1, hash);

      // Verify it's deleted
      const afterDelete = await get{{DOMAIN_NAME}}(agent1, hash);
      assert.equal(afterDelete, null);
    }
  );
}, TEST_TIMEOUT);

test("search {{DOMAIN_NAME}}s", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create multiple {{DOMAIN_NAME}} entries
      const entries = [
        { name: "First {{DOMAIN_NAME}}", description: "First entry" },
        { name: "Second {{DOMAIN_NAME}}", description: "Second entry" },
        { name: "Test {{DOMAIN_NAME}}", description: "Test entry" },
        { name: "Sample {{DOMAIN_NAME}}", description: "Sample entry" },
      ];

      const hashes = [];
      for (const entry of entries) {
        const input = {
          name: entry.name,
          description: entry.description,
          metadata: { test: "true" },
        };
        const hash = await create{{DOMAIN_NAME}}(agent1, input);
        hashes.push(hash);
      }

      await dhtSync([agent1, agent2]);

      // Search for entries
      const searchResults = await search{{DOMAIN_NAME}}s(agent1, {
        query: "Test",
        limit: 10,
        offset: 0,
      });

      assert.ok(searchResults.length >= 2); // Should find "Test {{DOMAIN_NAME}}" and "Sample {{DOMAIN_NAME}}"
      const hasTestEntry = searchResults.some(entry => entry.name.includes("Test"));
      assert.ok(hasTestEntry);
    }
  );
}, TEST_TIMEOUT);

test("get {{DOMAIN_NAME}}s by status", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create entries with different statuses
      const activeHash = await create{{DOMAIN_NAME}}(agent1, {
        name: "Active {{DOMAIN_NAME}}",
        description: "Active entry",
        metadata: {},
      });

      const approvedInput = {
        name: "Approved {{DOMAIN_NAME}}",
        description: "Approved entry",
        metadata: {},
        status: {{DOMAIN_NAME}}Status.Approved,
      };
      const approvedHash = await create{{DOMAIN_NAME}}(agent1, approvedInput);

      const archivedHash = await create{{DOMAIN_NAME}}(agent1, {
        name: "Archived {{DOMAIN_NAME}}",
        description: "Archived entry",
        metadata: {},
      });

      // Archive the entry
      await update{{DOMAIN_NAME}}(agent1, archivedHash, {
        status: {{DOMAIN_NAME}}Status.Archived,
      });

      await dhtSync([agent1, agent2]);

      // Test status filtering
      const activeEntries = await get{{DOMAIN_NAME}}sByStatus(agent1, {{DOMAIN_NAME}}Status.Active);
      const approvedEntries = await get{{DOMAIN_NAME}}sByStatus(agent1, {{DOMAIN_NAME}}Status.Approved);
      const archivedEntries = await get{{DOMAIN_NAME}}sByStatus(agent1, {{DOMAIN_NAME}}Status.Archived);

      assert.equal(activeEntries.length, 1);
      assert.equal(approvedEntries.length, 1);
      assert.equal(archivedEntries.length, 1);

      assert.equal(activeEntries[0].name, "Active {{DOMAIN_NAME}}");
      assert.equal(approvedEntries[0].name, "Approved {{DOMAIN_NAME}}");
      assert.equal(archivedEntries[0].name, "Archived {{DOMAIN_NAME}}");
    }
  );
}, TEST_TIMEOUT);

// Integration Tests
test("{{DOMAIN_NAME}} cross-zome integration", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create {{DOMAIN_NAME}}
      const hash = await create{{DOMAIN_NAME}}(agent1, sample{{DOMAIN_NAME}}Input);
      assert.ok(hash);

      // Link to another entity (example: link to person or resource)
      const entityHash = ActionHash::from_raw_36("uhCAk-entity_hash_example");
      await link_{{DOMAIN_NAME}}_to_entity(hash, entityHash, Some("related_entity"));

      // Verify the link was created
      const relatedEntities = await get_{{DOMAIN_NAME}}_related_entities(hash);
      assert.ok(relatedEntities.length >= 1);
    }
  );
}, TEST_TIMEOUT);

test("{{DOMAIN_NAME}} update history", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create {{DOMAIN_NAME}}
      const originalHash = await create{{DOMAIN_NAME}}(agent1, sample{{DOMAIN_NAME}}Input);
      assert.ok(originalHash);

      // Update multiple times
      const firstUpdate = await update{{DOMAIN_NAME}}(agent1, originalHash, {
        name: "First Update",
        description: Some("First update description"),
        metadata: None,
        status: None,
      });

      const secondUpdate = await update{{DOMAIN_NAME}}(agent1, firstUpdate, {
        name: "Second Update",
        description: Some("Second update description"),
        metadata: Some({ version: "2.0" }),
        status: Some({{DOMAIN_NAME}}Status.Approved),
      });

      // Check update history
      const history = await get{{DOMAIN_NAME}}_update_history(secondUpdate);
      assert.ok(history.length >= 2);
    }
  );
}, TEST_TIMEOUT);

// Scenario Tests
test("complete {{DOMAIN_NAME}} lifecycle", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Step 1: Create {{DOMAIN_NAME}}
      const input = sample{{DOMAIN_NAME}}Input;
      const hash = await create{{DOMAIN_NAME}}(agent1, input);
      assert.ok(hash);

      // Step 2: Retrieve and validate
      let {{domain_name}} = await get{{DOMAIN_NAME}}(agent1, hash);
      assert.ok({{domain_name}});
      assert.equal({{domain_name}}.name, input.name);
      assert.equal({{domain_name}}.status, {{DOMAIN_NAME}}Status.Active);

      // Step 3: Update and approve
      const updateInput = {
        name: "Updated {{DOMAIN_NAME}}",
        description: Some("Updated description for lifecycle test"),
        metadata: Some({ lifecycle_stage: "updated" }),
        status: Some({{DOMAIN_NAME}}Status.Approved),
      };
      const updatedHash = await update{{DOMAIN_NAME}}(agent1, hash, updateInput);
      assert.ok(updatedHash);

      {{domain_name}} = await get{{DOMAIN_NAME}}(agent1, updatedHash);
      assert.equal({{domain_name}}.status, {{DOMAIN_NAME}}Status.Approved);

      // Step 4: Archive
      const archivedHash = await archive_{{DOMAIN_NAME}}(agent1, updatedHash);
      assert.ok(archivedHash);

      {{domain_name}} = await get{{DOMAIN_NAME}}(agent1, archivedHash);
      assert.equal({{domain_name}}.status, {{DOMAIN_NAME}}Status.Archived);

      // Step 5: Verify final state
      assert.ok({{domain_name}}.is_archived());
      assert!({{domain_name}}.is_active());
      assert!({{domain_name}}.is_approved());

      console.log("✅ Complete {{DOMAIN_NAME}} lifecycle test passed successfully!");
    }
  );
}, TEST_TIMEOUT);

// Performance Tests
test("{{DOMAIN_NAME}} query performance", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create multiple entries for performance testing
      const batchSize = 10;
      const hashes = [];

      const startTime = Date.now();

      for (let i = 0; i < batchSize; i++) {
        const input = {
          name: `Performance Test {{DOMAIN_NAME}} ${i}`,
          description: `Entry ${i} for performance testing`,
          metadata: { batch_index: i.toString() },
        };
        const hash = await create{{DOMAIN_NAME}}(agent1, input);
        hashes.push(hash);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${batchSize} entries in ${creationTime}ms`);

      // Test query performance
      const queryStartTime = Date.now();
      const allEntries = await get_all_{{domain_name}}s(agent1);
      const queryTime = Date.now() - queryStartTime;

      console.log(`Queried ${allEntries.length} entries in ${queryTime}ms`);

      // Performance assertions
      assert.ok(creationTime < 10000, "Creation should complete within 10 seconds");
      assert.ok(queryTime < 5000, "Query should complete within 5 seconds");
      assert.equal(allEntries.length, batchSize);
    }
  );
}, TEST_TIMEOUT);

// Error Handling Tests
test("{{DOMAIN_NAME}} error handling", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Test invalid hash
      const invalidHash = ActionHash::from_raw_36("uhCAk-invalid_hash");
      const invalidResult = await get{{DOMAIN_NAME}}(agent1, invalidHash);
      assert.equal(invalidResult, null);

      // Test updating non-existent entry
      const nonExistentHash = ActionHash::from_raw_36("uhCAk-non_existent");

      try {
        await update{{DOMAIN_NAME}}(agent1, nonExistentHash, {
          name: "Updated",
          description: Some("Updated"),
          metadata: None,
          status: None,
        });
        assert.fail("Should have thrown error for non-existent entry");
      } catch (error) {
        assert.ok(error.message.includes("not found") || error.message.includes("invalid"));
      }

      // Test deleting non-existent entry
      try {
        await delete{{DOMAIN_NAME}}(agent1, nonExistentHash);
        assert.fail("Should have thrown error for non-existent entry");
      } catch (error) {
        assert.ok(error.message.includes("not found") || error.message.includes("invalid"));
      }
    }
  );
}, TEST_TIMEOUT);

// Utility function tests
test("{{DOMAIN_NAME}} utility functions", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      const agent = agent1.agentPubKey;

      // Test quick creation
      const quickHash = await create_{{DOMAIN_NAME}}_quick("Quick {{DOMAIN_NAME}}", agent);
      assert.ok(quickHash);

      const quickEntry = await get{{DOMAIN_NAME}}(agent1, quickHash);
      assert.ok(quickEntry);
      assert.equal(quickEntry.name, "Quick {{DOMAIN_NAME}}");

      // Test status updates
      const approvedHash = await approve_{{DOMAIN_NAME}}(quickHash);
      assert.ok(approvedHash);

      const approvedEntry = await get{{DOMAIN_NAME}}(agent1, approvedHash);
      assert.ok(approvedEntry.is_approved());

      // Test archive
      const archivedHash = await archive_{{DOMAIN_NAME}}(approvedHash);
      assert.ok(archivedHash);

      const archivedEntry = await get{{DOMAIN_NAME}}(agent1, archivedHash);
      assert.ok(archivedEntry.is_archived());
    }
  );
}, TEST_TIMEOUT);
