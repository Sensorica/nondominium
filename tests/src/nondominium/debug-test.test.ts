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
  getPersonProfile,
  getAllPersons,
  assignRole,
  getPersonRoles,
  hasRoleCapability,
  getCapabilityLevel,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./person/common.ts";
import {
  runScenarioWithTwoAgents,
  delay,
  createValidMockImage,
} from "./utils.ts";

// Debug test for development and troubleshooting
// Use this test to isolate and debug specific functionality
// Set DEBUG=true in environment for verbose logging

test("debug - basic person creation and retrieval", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Testing basic person creation");

      // Create Lynn's person
      console.log("Creating Lynn's person...");
      const lynnPersonInput = samplePerson({ name: "Lynn Debug" });
      console.log("Lynn input:", lynnPersonInput);

      const lynnResult = await createPerson(lynn.cells[0], lynnPersonInput);
      console.log("Lynn person result:", lynnResult);

      assert.ok(lynnResult);
      assert.ok(lynnResult.signed_action);

      // Extract person data from the record
      const personData = lynnResult.entry.Present
        ? lynnResult.entry.Present.entry
        : lynnResult.entry;
      console.log("Person data extracted:", personData);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Test profile retrieval
      console.log("Testing profile retrieval...");
      const lynnProfile = await getMyProfile(lynn.cells[0]);
      console.log("Lynn profile:", lynnProfile);

      assert.ok(lynnProfile.person);
      assert.equal(lynnProfile.person!.name, "Lynn Debug");

      console.log("✅ DEBUG: Basic person creation working");
    },
  );
}, 120000);

test("debug - private data storage and privacy", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Testing private data storage");

      // Setup persons
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn stores private data
      console.log("Storing Lynn's private data...");
      const privateDataInput = samplePrivateData({
        legal_name: "Lynn Test User",
        email: "lynn.debug@test.com",
      });
      console.log("Private data input:", privateDataInput);

      const privateResult = await storePrivateData(
        lynn.cells[0],
        privateDataInput,
      );
      console.log("Private data result:", privateResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Test self-access
      console.log("Testing self-access to private data...");
      const lynnProfile = await getMyProfile(lynn.cells[0]);
      console.log("Lynn profile with private data:", lynnProfile);

      assert.ok(lynnProfile.private_data);
      assert.equal(lynnProfile.private_data!.legal_name, "Lynn Test User");

      // Test privacy - Bob cannot see Lynn's private data
      console.log("Testing privacy boundaries...");
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      console.log("Bob's view of Lynn:", bobViewOfLynn);

      assert.ok(bobViewOfLynn.person);
      assert.isNull(bobViewOfLynn.private_data);

      console.log("✅ DEBUG: Private data storage and privacy working");
    },
  );
}, 120000);

test("debug - role assignment and capabilities", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Testing role assignment");

      // Setup persons
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn assigns steward role to Bob
      console.log("Assigning steward role to Bob...");
      const roleInput = sampleRole(bob.agentPubKey, {
        role_name: TEST_ROLES.RESOURCE_STEWARD,
        description: "Debug steward role",
      });
      console.log("Role input:", roleInput);

      const roleResult = await assignRole(lynn.cells[0], roleInput);
      console.log("Role assignment result:", roleResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Check Bob's roles
      console.log("Checking Bob's roles...");
      const bobRoles = await getPersonRoles(lynn.cells[0], bob.agentPubKey);
      console.log("Bob's roles:", bobRoles);

      assert.equal(bobRoles.roles.length, 1);
      assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.RESOURCE_STEWARD);

      // Check capability
      console.log("Checking role capability...");
      const hasCapability = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      console.log("Bob has steward capability:", hasCapability);

      assert.isTrue(hasCapability);

      // Check capability level
      console.log("Checking capability level...");
      const capabilityLevel = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );
      console.log("Bob's capability level:", capabilityLevel);

      assert.equal(capabilityLevel, CAPABILITY_LEVELS.STEWARDSHIP);

      console.log("✅ DEBUG: Role assignment and capabilities working");
    },
  );
}, 120000);

test("debug - agent discovery", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Testing agent discovery");

      // Initially no agents
      console.log("Checking initial state...");
      let allAgents = await getAllPersons(lynn.cells[0]);
      console.log("Initial agents:", allAgents);
      assert.equal(allAgents.persons.length, 0);

      // Lynn creates person
      console.log("Lynn creates person...");
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Check discovery
      console.log("Checking after Lynn joins...");
      allAgents = await getAllPersons(bob.cells[0]);
      console.log("Agents after Lynn:", allAgents);
      assert.equal(allAgents.persons.length, 1);

      // Bob creates person
      console.log("Bob creates person...");
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Check full discovery
      console.log("Checking after both join...");
      allAgents = await getAllPersons(lynn.cells[0]);
      console.log("Final agents:", allAgents);
      assert.equal(allAgents.persons.length, 2);

      const names = allAgents.persons.map((person) => person.name).sort();
      console.log("Agent names:", names);
      assert.deepEqual(names, ["Lynn", "Bob"]);

      console.log("✅ DEBUG: Agent discovery working");
    },
  );
}, 120000);

test("debug - DHT synchronization timing", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Testing DHT synchronization timing");

      // Test without DHT sync first
      console.log("Creating Lynn's person without DHT sync...");
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));

      // Check immediate visibility
      console.log("Checking immediate visibility from Bob...");
      let allAgentsFromBob = await getAllPersons(bob.cells[0]);
      console.log("Agents visible to Bob immediately:", allAgentsFromBob);

      // Wait a bit
      console.log("Waiting 2 seconds...");
      await delay(2000);

      // Check again
      allAgentsFromBob = await getAllPersons(bob.cells[0]);
      console.log("Agents visible to Bob after 2s:", allAgentsFromBob);

      // Now do DHT sync
      console.log("Performing DHT sync...");
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Check after sync
      allAgentsFromBob = await getAllPersons(bob.cells[0]);
      console.log("Agents visible to Bob after DHT sync:", allAgentsFromBob);

      assert.equal(allAgentsFromBob.persons.length, 1);
      assert.equal(allAgentsFromBob.persons[0].name, "Lynn");

      console.log("✅ DEBUG: DHT synchronization timing analyzed");
    },
  );
}, 120000);

// Utility test for experimenting with specific scenarios
test("debug - sandbox for experimentation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      console.log("🐛 DEBUG: Sandbox test - add experimental code here");

      // This test is for experimenting with specific scenarios
      // Modify as needed for debugging purposes

      // Example: Test avatar URL handling
      console.log("Testing avatar URL...");
      const personWithAvatar = await createPerson(
        lynn.cells[0],
        samplePerson({
          name: "Avatar Test",
          avatar_url: "https://example.com/test-avatar.png",
        }),
      );

      console.log("Person with avatar:", personWithAvatar);
      assert.ok(personWithAvatar.person.avatar_url);
      assert.equal(
        personWithAvatar.person.avatar_url,
        "https://example.com/test-avatar.png",
      );

      // Example: Test role metadata
      console.log("Testing role metadata...");
      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
          description: "Test role with metadata",
        }),
      );

      const roles = await getPersonRoles(lynn.cells[0], lynn.agentPubKey);
      console.log("Role with metadata:", roles.roles[0]);

      assert.ok(roles.roles[0].validation_metadata);

      console.log("✅ DEBUG: Sandbox test completed");
    },
  );
}, 120000);
