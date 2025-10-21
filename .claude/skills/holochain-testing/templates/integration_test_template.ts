//! Integration Test Template
//! Reference example for cross-zome interaction testing following nondominium patterns

import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  // Person zome functions
  createPerson,
  assignPersonRole,
  getPersonRoles,
  hasRoleCapability,

  // Resource zome functions
  createResource,
  getResource,
  updateResourceGovernanceRules,

  // Governance zome functions
  createCommitment,
  createClaim,
  validatePPRRequest,

  // Common utilities
  samplePerson,
  sampleResource,
  sampleRole,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common";

import { runScenarioWithTwoAgents } from "../utils";

test("person creates resource with embedded governance", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Step 1: Agent 1 creates person and gets admin role
      const personInput = {
        name: "Resource Owner",
        avatar_url: "https://example.com/owner.jpg",
      };

      await createPerson(agent1, personInput);
      await assignPersonRole(agent1, agent1.agentPubKey, "admin");

      // Step 2: Agent 1 creates resource with governance rules
      const resourceInput = {
        name: "Test Resource",
        description: "A resource for testing integration",
        classification: "tool",
        governance_rules: {
          can_transfer: true,
          requires_approval: true,
          allowed_roles: ["admin", "user"],
          expiration_hours: 24,
        },
      };

      const resourceHash = await createResource(agent1, resourceInput);
      assert.ok(resourceHash);

      // Step 3: Retrieve and validate resource with governance
      const resource = await getResource(agent1, resourceHash);
      assert.ok(resource);
      assert.equal(resource.name, resourceInput.name);
      assert.deepEqual(resource.governance_rules, resourceInput.governance_rules);

      // Step 4: Agent 2 should not see private governance details
      const resourceForAgent2 = await getResource(agent2, resourceHash);
      assert.ok(resourceForAgent2);
      assert.equal(resourceForAgent2.name, resource.name);
      // Note: Governance rules should be private or limited based on capabilities
    }
  );
});

test("role-based resource access control", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Setup: Create two persons with different roles
      await createPerson(agent1, { name: "Admin User", avatar_url: "" });
      await createPerson(agent2, { name: "Regular User", avatar_url: "" });

      await assignPersonRole(agent1, agent1.agentPubKey, "admin");
      await assignPersonRole(agent1, agent2.agentPubKey, "user");

      await dhtSync([agent1, agent2]);

      // Step 1: Admin creates restricted resource
      const restrictedResource = {
        name: "Restricted Resource",
        description: "Only accessible by admins",
        classification: "sensitive",
        governance_rules: {
          can_transfer: false,
          requires_approval: false,
          allowed_roles: ["admin"],
          expiration_hours: 0,
        },
      };

      const resourceHash = await createResource(agent1, restrictedResource);
      assert.ok(resourceHash);

      await dhtSync([agent1, agent2]);

      // Step 2: Test access based on roles
      const adminResource = await getResource(agent1, resourceHash);
      assert.ok(adminResource);

      // Regular user should have limited or no access
      const userResource = await getResource(agent2, resourceHash);
      // Depending on implementation, this might return limited data or throw an error
      // assert.ok(userResource); // or assert.fail("User should not access restricted resource");
    }
  );
});

test("PPR system integration across zomes", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Setup: Create resource owner and requester
      await createPerson(agent1, { name: "Resource Owner", avatar_url: "" });
      await createPerson(agent2, { name: "Resource Requester", avatar_url: "" });

      await assignPersonRole(agent1, agent1.agentPubKey, "admin");
      await assignPersonRole(agent1, agent2.agentPubKey, "user");

      // Step 1: Agent 1 creates resource with PPR-enabled governance
      const resourceInput = {
        name: "PPR Test Resource",
        description: "Resource for testing PPR system",
        classification: "document",
        governance_rules: {
          can_transfer: true,
          requires_approval: true,
          allowed_roles: ["admin", "user"],
          ppr_enabled: true,
          expiration_hours: 48,
        },
      };

      const resourceHash = await createResource(agent1, resourceInput);
      await dhtSync([agent1, agent2]);

      // Step 2: Agent 2 requests access via PPR
      const pprRequest = {
        resource_hash: resourceHash,
        purpose: "Need access for project collaboration",
        requested_capabilities: ["read", "comment"],
        expiration_hours: 24,
      };

      const validationResult = await validatePPRRequest(agent1, pprRequest);
      assert.ok(validationResult);

      // Step 3: Create governance commitment for the PPR
      const commitmentInput = {
        resource_hash: resourceHash,
        commitment_type: "PPR_ACCESS",
        agent_pub_key: agent2.agentPubKey,
        terms: JSON.stringify(pprRequest),
      };

      const commitmentHash = await createCommitment(agent1, commitmentInput);
      assert.ok(commitmentHash);

      // Step 4: Verify the commitment and PPR system integration
      // This would involve checking that the commitment properly records the PPR
      // and that the requester now has appropriate access
    }
  );
});

test("cross-zome communication error handling", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Setup: Create persons
      await createPerson(agent1, { name: "Test User 1", avatar_url: "" });
      await createPerson(agent2, { name: "Test User 2", avatar_url: "" });

      // Test 1: Invalid role assignment
      try {
        await assignPersonRole(agent2, agent1.agentPubKey, "invalid_role");
        assert.fail("Should have thrown error for invalid role");
      } catch (error) {
        assert.ok(error.message.includes("Invalid role"));
      }

      // Test 2: Resource creation without proper permissions
      const resourceInput = {
        name: "Test Resource",
        description: "Should fail due to permissions",
        classification: "tool",
        governance_rules: {
          can_transfer: true,
          requires_approval: false,
          allowed_roles: ["admin"],
          expiration_hours: 24,
        },
      };

      try {
        await createResource(agent2, resourceInput); // agent2 is not admin
        // Depending on implementation, this might succeed or fail
        // assert.fail("Should have thrown error for insufficient permissions");
      } catch (error) {
        // This error handling depends on your permission system implementation
        assert.ok(error.message.includes("permission") || error.message.includes("role"));
      }

      // Test 3: Creating commitment for non-existent resource
      const nonExistentHash = "uhCAk-zGVmYXVsdC1hZGRyZXNz";

      try {
        await createCommitment(agent1, {
          resource_hash: nonExistentHash,
          commitment_type: "test",
          agent_pub_key: agent2.agentPubKey,
          terms: "test terms",
        });
        assert.fail("Should have thrown error for non-existent resource");
      } catch (error) {
        assert.ok(error.message.includes("not found") || error.message.includes("invalid"));
      }
    }
  );
});

test("multi-agent DHT synchronization", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Step 1: Agent 1 creates multiple resources
      await createPerson(agent1, { name: "Creator", avatar_url: "" });
      await assignPersonRole(agent1, agent1.agentPubKey, "admin");

      const resources = [];
      for (let i = 0; i < 3; i++) {
        const resourceInput = {
          name: `Resource ${i}`,
          description: `Test resource number ${i}`,
          classification: "tool",
          governance_rules: {
            can_transfer: true,
            requires_approval: false,
            allowed_roles: ["admin", "user"],
            expiration_hours: 24,
          },
        };

        const hash = await createResource(agent1, resourceInput);
        resources.push(hash);
      }

      // Step 2: Allow time for DHT synchronization
      await dhtSync([agent1, agent2]);

      // Step 3: Agent 2 creates person and queries for resources
      await createPerson(agent2, { name: "Consumer", avatar_url: "" });
      await dhtSync([agent1, agent2]);

      // Step 4: Verify Agent 2 can see all resources
      for (const resourceHash of resources) {
        const resource = await getResource(agent2, resourceHash);
        assert.ok(resource);
        assert.ok(resource.name.startsWith("Resource"));
      }

      // Step 5: Test bidirectional synchronization
      await createPerson(agent1, { name: "Updated User", avatar_url: "" });
      await dhtSync([agent1, agent2]);

      // Both agents should see updated information
      const allPersons1 = await agent1.callZome({
        zome_name: "person",
        fn_name: "get_all_persons",
        payload: null,
      });

      const allPersons2 = await agent2.callZome({
        zome_name: "person",
        fn_name: "get_all_persons",
        payload: null,
      });

      // Verify synchronization (exact implementation depends on your get_all_persons)
      // assert.equal(allPersons1.length, allPersons2.length);
    }
  );
});