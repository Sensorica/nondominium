import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

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
  setupBasicPersons,
  setupPersonsWithPrivateData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
  PersonTestContext,
} from "./common";
import { runScenarioWithTwoAgents } from "../utils";

test("multi-agent person discovery and interaction", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicPersons(alice, bob);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Both agents can discover each other
      const allPersonsFromLynn = await getAllPersons(alice.cells[0]);
      const allPersonsFromBob = await getAllPersons(bob.cells[0]);

      assert.equal(allPersonsFromLynn.persons.length, 2);
      assert.equal(allPersonsFromBob.persons.length, 2);

      // Verify both can see each other's public profiles
      const aliceViewOfBob = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey,
      );
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        alice.agentPubKey,
      );

      assert.ok(aliceViewOfBob.person);
      assert.equal(aliceViewOfBob.person!.name, "Bob");
      assert.isUndefined(aliceViewOfBob.private_data);

      assert.ok(bobViewOfLynn.person);
      assert.equal(bobViewOfLynn.person!.name, "Lynn");
      assert.isUndefined(bobViewOfLynn.private_data);
    },
  );
}, 240000);

test("privacy boundaries - private data isolation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const context = await setupPersonsWithPrivateData(alice, bob);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Lynn can see her own private data
      const aliceProfile = await getMyProfile(alice.cells[0]);
      assert.ok(aliceProfile.person);
      assert.ok(aliceProfile.private_data);
      assert.equal(aliceProfile.private_data!.legal_name, "Lynn Smith");
      assert.equal(aliceProfile.private_data!.email, "lynn@example.com");

      // Bob can see his own private data
      const bobProfile = await getMyProfile(bob.cells[0]);
      assert.ok(bobProfile.person);
      assert.ok(bobProfile.private_data);
      assert.equal(bobProfile.private_data!.legal_name, "Bob Johnson");
      assert.equal(bobProfile.private_data!.email, "bob@example.com");

      // Lynn cannot see Bob's private data
      const aliceViewOfBob = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey,
      );
      assert.ok(aliceViewOfBob.person);
      assert.isUndefined(aliceViewOfBob.private_data);

      // Bob cannot see Lynn's private data
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        alice.agentPubKey,
      );
      assert.ok(bobViewOfLynn.person);
      assert.isUndefined(bobViewOfLynn.private_data);
    },
  );
}, 240000);

test("cross-agent role assignment and validation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicPersons(alice, bob);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Lynn assigns steward role to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
            description: "Community steward assigned by Lynn",
          },
        ),
      );

      // Bob assigns coordinator role to Lynn
      await assignRole(
        bob.cells[0],
        sampleRole(
          alice.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_COORDINATOR,
            description: "Resource coordinator assigned by Bob",
          },
        ),
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify role assignments from both perspectives
      const bobRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey,
      );
      const bobRolesFromBob = await getPersonRoles(
        bob.cells[0],
        bob.agentPubKey,
      );

      assert.equal(bobRolesFromLynn.roles.length, 1);
      assert.equal(bobRolesFromBob.roles.length, 1);
      assert.equal(
        bobRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      assert.equal(
        bobRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD,
      );

      const aliceRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        alice.agentPubKey,
      );
      const aliceRolesFromBob = await getPersonRoles(
        bob.cells[0],
        alice.agentPubKey,
      );

      assert.equal(aliceRolesFromLynn.roles.length, 1);
      assert.equal(aliceRolesFromBob.roles.length, 1);
      assert.equal(
        aliceRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      assert.equal(
        aliceRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      // Verify capability checking from both agents
      const bobHasStewardFromLynn = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      const bobHasStewardFromBob = await hasRoleCapability(
        bob.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );

      assert.isTrue(bobHasStewardFromLynn);
      assert.isTrue(bobHasStewardFromBob);

      const aliceHasCoordinatorFromLynn = await hasRoleCapability(
        alice.cells[0],
        alice.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      const aliceHasCoordinatorFromBob = await hasRoleCapability(
        bob.cells[0],
        alice.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      assert.isTrue(aliceHasCoordinatorFromLynn);
      assert.isTrue(aliceHasCoordinatorFromBob);
    },
  );
}, 240000);

test("capability level consistency across agents", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicPersons(alice, bob);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Initially both have member capability level
      let aliceCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        alice.agentPubKey,
      );
      let aliceCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        alice.agentPubKey,
      );
      let bobCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey,
      );
      let bobCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        bob.agentPubKey,
      );

      assert.equal(aliceCapFromLynn, CAPABILITY_LEVELS.MEMBER);
      assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.MEMBER);
      assert.equal(bobCapFromLynn, CAPABILITY_LEVELS.MEMBER);
      assert.equal(bobCapFromBob, CAPABILITY_LEVELS.MEMBER);

      // Lynn assigns coordination role to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_COORDINATOR,
          },
        ),
      );

      // Bob assigns governance role to Lynn
      await assignRole(
        bob.cells[0],
        sampleRole(
          alice.agentPubKey,
          {
            role_name: TEST_ROLES.FOUNDER,
          },
        ),
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify capability levels are consistent across agents
      aliceCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        alice.agentPubKey,
      );
      aliceCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        alice.agentPubKey,
      );
      bobCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey,
      );
      bobCapFromBob = await getCapabilityLevel(bob.cells[0], bob.agentPubKey);

      assert.equal(aliceCapFromLynn, CAPABILITY_LEVELS.GOVERNANCE);
      assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.GOVERNANCE);
      assert.equal(bobCapFromLynn, CAPABILITY_LEVELS.COORDINATION);
      assert.equal(bobCapFromBob, CAPABILITY_LEVELS.COORDINATION);
    },
  );
}, 240000);

test("multiple role assignments and capability aggregation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const context = await setupBasicPersons(alice, bob);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Lynn assigns multiple roles to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
            description: "Community steward role",
          },
        ),
      );

      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_COORDINATOR,
            description: "Resource coordinator role",
          },
        ),
      );

      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.FOUNDER,
            description: "Founder role",
          },
        ),
      );

      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.SIMPLE,
            description: "Simple agent role",
          },
        ),
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify Bob has all assigned roles
      const bobRoles = await getPersonRoles(alice.cells[0], bob.agentPubKey);
      assert.equal(bobRoles.roles.length, 4);

      const roleNames = bobRoles.roles.map((role) => role.role_name).sort();
      assert.deepEqual(roleNames, [
        TEST_ROLES.RESOURCE_COORDINATOR, // "Accountable Agent"
        TEST_ROLES.FOUNDER,              // "Primary Accountable Agent"
        TEST_ROLES.SIMPLE,               // "Simple Agent"
        TEST_ROLES.RESOURCE_STEWARD,     // "Transport Agent"
      ].sort());

      // Verify Bob has all capabilities
      const hasSteward = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      const hasCoordinator = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      const hasSimple = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.SIMPLE,
      );
      const hasFounder = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.FOUNDER,
      );

      assert.isTrue(hasSteward);
      assert.isTrue(hasCoordinator);
      assert.isTrue(hasSimple);
      assert.isTrue(hasFounder); // Bob was assigned the Primary Accountable Agent role

      // Verify capability level is governance (highest of the assigned roles)
      const capabilityLevel = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey,
      );
      assert.equal(capabilityLevel, CAPABILITY_LEVELS.GOVERNANCE);
    },
  );
}, 240000);

test("DHT synchronization and eventual consistency", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Lynn creates person
      await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));

      // Bob creates person
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      // Before DHT sync, agents might not see each other
      let allPersonsFromLynn = await getAllPersons(alice.cells[0]);
      // This might be 1 or 2 depending on DHT propagation timing
      assert.isAtLeast(allPersonsFromLynn.persons.length, 1);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // After DHT sync, both should see each other
      allPersonsFromLynn = await getAllPersons(alice.cells[0]);
      const allPersonsFromBob = await getAllPersons(bob.cells[0]);

      assert.equal(allPersonsFromLynn.persons.length, 2);
      assert.equal(allPersonsFromBob.persons.length, 2);

      // Lynn assigns role to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
          },
        ),
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Both agents should see the role assignment
      const bobRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey,
      );
      const bobRolesFromBob = await getPersonRoles(
        bob.cells[0],
        bob.agentPubKey,
      );

      assert.equal(bobRolesFromLynn.roles.length, 1);
      assert.equal(bobRolesFromBob.roles.length, 1);
      assert.equal(
        bobRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      assert.equal(
        bobRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD,
      );
    },
  );
}, 240000);

test("agent interaction without prior person creation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Try to get profile for agent who hasn't created person record yet
      const bobProfileFromLynn = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey,
      );
      // Zome returns null/undefined when person doesn't exist
      assert.isNull(bobProfileFromLynn.person);
      assert.isUndefined(bobProfileFromLynn.private_data);

      // Verify that roles cannot be retrieved without person record
      const bobRolesBeforeCreation = await getPersonRoles(alice.cells[0], bob.agentPubKey);
      assert.equal(bobRolesBeforeCreation.roles.length, 0);

      // Now Bob creates person record
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Now Lynn should see Bob's person
      const bobProfileAfterCreation = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey,
      );
      assert.ok(bobProfileAfterCreation.person);
      assert.equal(bobProfileAfterCreation.person!.name, "Bob");

      // Now Lynn can assign a role to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          bob.agentPubKey,
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
          },
        ),
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Role should now be retrievable
      const bobRolesAfterAssignment = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey,
      );
      assert.equal(bobRolesAfterAssignment.roles.length, 1);
      assert.equal(bobRolesAfterAssignment.roles[0].role_name, TEST_ROLES.RESOURCE_STEWARD);
    },
  );
}, 240000);
