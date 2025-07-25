import { assert, expect, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { Record as HolochainRecord } from "@holochain/client";

import {
  samplePerson,
  samplePrivateData,
  sampleRole,
  createPerson,
  storePrivateData,
  getMyProfile,
  getAgentProfile,
  getAllAgents,
  assignRole,
  getAgentRoles,
  hasRoleCapability,
  getAgentCapabilityLevel,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./person/common.js";
import {
  runScenarioWithTwoAgents,
  delay,
  createValidMockImage,
} from "./utils.js";

// Debug test for development and troubleshooting
// Use this test to isolate and debug specific functionality
// Set DEBUG=true in environment for verbose logging

test(
  "debug - basic person creation and retrieval",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Testing basic person creation");

        // Create Alice's person
        console.log("Creating Alice's person...");
        const alicePersonInput = samplePerson({ name: "Alice Debug" });
        console.log("Alice input:", alicePersonInput);

        const aliceResult = await createPerson(
          alice.cells[0],
          alicePersonInput
        );
        console.log("Alice person result:", aliceResult);

        assert.ok(aliceResult);
        assert.ok(aliceResult.person_hash);
        assert.equal(aliceResult.person.name, "Alice Debug");

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Test profile retrieval
        console.log("Testing profile retrieval...");
        const aliceProfile = await getMyProfile(alice.cells[0]);
        console.log("Alice profile:", aliceProfile);

        assert.ok(aliceProfile.person);
        assert.equal(aliceProfile.person!.name, "Alice Debug");

        console.log("✅ DEBUG: Basic person creation working");
      }
    );
  },
  { timeout: 120000 }
);

test(
  "debug - private data storage and privacy",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Testing private data storage");

        // Setup persons
        await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice stores private data
        console.log("Storing Alice's private data...");
        const privateDataInput = samplePrivateData({
          legal_name: "Alice Test User",
          email: "alice.debug@test.com",
        });
        console.log("Private data input:", privateDataInput);

        const privateResult = await storePrivateData(
          alice.cells[0],
          privateDataInput
        );
        console.log("Private data result:", privateResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Test self-access
        console.log("Testing self-access to private data...");
        const aliceProfile = await getMyProfile(alice.cells[0]);
        console.log("Alice profile with private data:", aliceProfile);

        assert.ok(aliceProfile.private_data);
        assert.equal(aliceProfile.private_data!.legal_name, "Alice Test User");

        // Test privacy - Bob cannot see Alice's private data
        console.log("Testing privacy boundaries...");
        const bobViewOfAlice = await getAgentProfile(
          bob.cells[0],
          alice.agentPubKey
        );
        console.log("Bob's view of Alice:", bobViewOfAlice);

        assert.ok(bobViewOfAlice.person);
        assert.isUndefined(bobViewOfAlice.private_data);

        console.log("✅ DEBUG: Private data storage and privacy working");
      }
    );
  },
  { timeout: 120000 }
);

test(
  "debug - role assignment and capabilities",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Testing role assignment");

        // Setup persons
        await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice assigns steward role to Bob
        console.log("Assigning steward role to Bob...");
        const roleInput = sampleRole(
          {
            role_name: TEST_ROLES.STEWARD,
            description: "Debug steward role",
          },
          bob.agentPubKey
        );
        console.log("Role input:", roleInput);

        const roleResult = await assignRole(alice.cells[0], roleInput);
        console.log("Role assignment result:", roleResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Check Bob's roles
        console.log("Checking Bob's roles...");
        const bobRoles = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        console.log("Bob's roles:", bobRoles);

        assert.equal(bobRoles.roles.length, 1);
        assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.STEWARD);

        // Check capability
        console.log("Checking role capability...");
        const hasCapability = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.STEWARD
        );
        console.log("Bob has steward capability:", hasCapability);

        assert.isTrue(hasCapability);

        // Check capability level
        console.log("Checking capability level...");
        const capabilityLevel = await getAgentCapabilityLevel(
          alice.cells[0],
          bob.agentPubKey
        );
        console.log("Bob's capability level:", capabilityLevel);

        assert.equal(capabilityLevel, CAPABILITY_LEVELS.ACCOUNTABLE);

        console.log("✅ DEBUG: Role assignment and capabilities working");
      }
    );
  },
  { timeout: 120000 }
);

test(
  "debug - agent discovery",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Testing agent discovery");

        // Initially no agents
        console.log("Checking initial state...");
        let allAgents = await getAllAgents(alice.cells[0]);
        console.log("Initial agents:", allAgents);
        assert.equal(allAgents.agents.length, 0);

        // Alice creates person
        console.log("Alice creates person...");
        await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Check discovery
        console.log("Checking after Alice joins...");
        allAgents = await getAllAgents(bob.cells[0]);
        console.log("Agents after Alice:", allAgents);
        assert.equal(allAgents.agents.length, 1);

        // Bob creates person
        console.log("Bob creates person...");
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Check full discovery
        console.log("Checking after both join...");
        allAgents = await getAllAgents(alice.cells[0]);
        console.log("Final agents:", allAgents);
        assert.equal(allAgents.agents.length, 2);

        const names = allAgents.agents.map((agent) => agent.name).sort();
        console.log("Agent names:", names);
        assert.deepEqual(names, ["Alice", "Bob"]);

        console.log("✅ DEBUG: Agent discovery working");
      }
    );
  },
  { timeout: 120000 }
);

test(
  "debug - DHT synchronization timing",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Testing DHT synchronization timing");

        // Test without DHT sync first
        console.log("Creating Alice's person without DHT sync...");
        await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));

        // Check immediate visibility
        console.log("Checking immediate visibility from Bob...");
        let allAgentsFromBob = await getAllAgents(bob.cells[0]);
        console.log("Agents visible to Bob immediately:", allAgentsFromBob);

        // Wait a bit
        console.log("Waiting 2 seconds...");
        await delay(2000);

        // Check again
        allAgentsFromBob = await getAllAgents(bob.cells[0]);
        console.log("Agents visible to Bob after 2s:", allAgentsFromBob);

        // Now do DHT sync
        console.log("Performing DHT sync...");
        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Check after sync
        allAgentsFromBob = await getAllAgents(bob.cells[0]);
        console.log("Agents visible to Bob after DHT sync:", allAgentsFromBob);

        assert.equal(allAgentsFromBob.agents.length, 1);
        assert.equal(allAgentsFromBob.agents[0].name, "Alice");

        console.log("✅ DEBUG: DHT synchronization timing analyzed");
      }
    );
  },
  { timeout: 120000 }
);

// Utility test for experimenting with specific scenarios
test(
  "debug - sandbox for experimentation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        console.log("🐛 DEBUG: Sandbox test - add experimental code here");

        // This test is for experimenting with specific scenarios
        // Modify as needed for debugging purposes

        // Example: Test avatar URL handling
        console.log("Testing avatar URL...");
        const personWithAvatar = await createPerson(
          alice.cells[0],
          samplePerson({
            name: "Avatar Test",
            avatar_url: "https://example.com/test-avatar.png",
          })
        );

        console.log("Person with avatar:", personWithAvatar);
        assert.ok(personWithAvatar.person.avatar_url);
        assert.equal(
          personWithAvatar.person.avatar_url,
          "https://example.com/test-avatar.png"
        );

        // Example: Test role metadata
        console.log("Testing role metadata...");
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.STEWARD,
              description: "Test role with metadata",
            },
            alice.agentPubKey
          )
        );

        const roles = await getAgentRoles(alice.cells[0], alice.agentPubKey);
        console.log("Role with metadata:", roles.roles[0]);

        assert.ok(roles.roles[0].validation_metadata);

        console.log("✅ DEBUG: Sandbox test completed");
      }
    );
  },
  { timeout: 120000 }
);

