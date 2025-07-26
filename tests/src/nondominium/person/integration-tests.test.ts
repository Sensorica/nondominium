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
} from "./common.ts";
import { runScenarioWithTwoAgents } from "../utils.ts";

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
        bob.agentPubKey
      );
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        alice.agentPubKey
      );

      assert.ok(aliceViewOfBob.person);
      assert.equal(aliceViewOfBob.person!.name, "Bob");
      assert.isNull(aliceViewOfBob.private_data);

      assert.ok(bobViewOfLynn.person);
      assert.equal(bobViewOfLynn.person!.name, "Lynn");
      assert.isNull(bobViewOfLynn.private_data);
    }
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
        bob.agentPubKey
      );
      assert.ok(aliceViewOfBob.person);
      assert.isNull(aliceViewOfBob.private_data);

      // Bob cannot see Lynn's private data
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        alice.agentPubKey
      );
      assert.ok(bobViewOfLynn.person);
      assert.isNull(bobViewOfLynn.private_data);
    }
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
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
            description: "Community steward assigned by Lynn",
          },
          bob.agentPubKey
        )
      );

      // Bob assigns coordinator role to Lynn
      await assignRole(
        bob.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.RESOURCE_COORDINATOR,
            description: "Resource coordinator assigned by Bob",
          },
          alice.agentPubKey
        )
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify role assignments from both perspectives
      const bobRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey
      );
      const bobRolesFromBob = await getPersonRoles(
        bob.cells[0],
        bob.agentPubKey
      );

      assert.equal(bobRolesFromLynn.roles.length, 1);
      assert.equal(bobRolesFromBob.roles.length, 1);
      assert.equal(
        bobRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD
      );
      assert.equal(
        bobRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD
      );

      const aliceRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        alice.agentPubKey
      );
      const aliceRolesFromBob = await getPersonRoles(
        bob.cells[0],
        alice.agentPubKey
      );

      assert.equal(aliceRolesFromLynn.roles.length, 1);
      assert.equal(aliceRolesFromBob.roles.length, 1);
      assert.equal(
        aliceRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR
      );
      assert.equal(
        aliceRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR
      );

      // Verify capability checking from both agents
      const bobHasStewardFromLynn = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD
      );
      const bobHasStewardFromBob = await hasRoleCapability(
        bob.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD
      );

      assert.isTrue(bobHasStewardFromLynn);
      assert.isTrue(bobHasStewardFromBob);

      const aliceHasCoordinatorFromLynn = await hasRoleCapability(
        alice.cells[0],
        alice.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR
      );
      const aliceHasCoordinatorFromBob = await hasRoleCapability(
        bob.cells[0],
        alice.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR
      );

      assert.isTrue(aliceHasCoordinatorFromLynn);
      assert.isTrue(aliceHasCoordinatorFromBob);
    }
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
        alice.agentPubKey
      );
      let aliceCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        alice.agentPubKey
      );
      let bobCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey
      );
      let bobCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        bob.agentPubKey
      );

      assert.equal(aliceCapFromLynn, CAPABILITY_LEVELS.MEMBER);
      assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.MEMBER);
      assert.equal(bobCapFromLynn, CAPABILITY_LEVELS.MEMBER);
      assert.equal(bobCapFromBob, CAPABILITY_LEVELS.MEMBER);

      // Lynn assigns stewardship role to Bob
      await assignRole(
        alice.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
          },
          bob.agentPubKey
        )
      );

      // Bob assigns governance role to Lynn
      await assignRole(
        bob.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.FOUNDER,
          },
          alice.agentPubKey
        )
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify capability levels are consistent across agents
      aliceCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        alice.agentPubKey
      );
      aliceCapFromBob = await getCapabilityLevel(
        bob.cells[0],
        alice.agentPubKey
      );
      bobCapFromLynn = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey
      );
      bobCapFromBob = await getCapabilityLevel(bob.cells[0], bob.agentPubKey);

      assert.equal(aliceCapFromLynn, CAPABILITY_LEVELS.GOVERNANCE);
      assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.GOVERNANCE);
      assert.equal(bobCapFromLynn, CAPABILITY_LEVELS.STEWARDSHIP);
      assert.equal(bobCapFromBob, CAPABILITY_LEVELS.STEWARDSHIP);
    }
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
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
            description: "Community steward role",
          },
          bob.agentPubKey
        )
      );

      await assignRole(
        alice.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.RESOURCE_COORDINATOR,
            description: "Resource coordinator role",
          },
          bob.agentPubKey
        )
      );

      await assignRole(
        alice.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.ADVOCATE,
            description: "Community advocate role",
          },
          bob.agentPubKey
        )
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify Bob has all assigned roles
      const bobRoles = await getPersonRoles(alice.cells[0], bob.agentPubKey);
      assert.equal(bobRoles.roles.length, 3);

      const roleNames = bobRoles.roles.map((role) => role.role_name).sort();
      assert.deepEqual(roleNames, [
        TEST_ROLES.ADVOCATE,
        TEST_ROLES.RESOURCE_COORDINATOR,
        TEST_ROLES.RESOURCE_STEWARD,
      ]);

      // Verify Bob has all capabilities
      const hasSteward = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD
      );
      const hasCoordinator = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR
      );
      const hasAdvocate = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.ADVOCATE
      );
      const hasFounder = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.FOUNDER
      );

      assert.isTrue(hasSteward);
      assert.isTrue(hasCoordinator);
      assert.isTrue(hasAdvocate);
      assert.isFalse(hasFounder);

      // Verify capability level is coordination (highest of the assigned roles)
      const capabilityLevel = await getCapabilityLevel(
        alice.cells[0],
        bob.agentPubKey
      );
      assert.equal(capabilityLevel, CAPABILITY_LEVELS.COORDINATION);
    }
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
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
          },
          bob.agentPubKey
        )
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Both agents should see the role assignment
      const bobRolesFromLynn = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey
      );
      const bobRolesFromBob = await getPersonRoles(
        bob.cells[0],
        bob.agentPubKey
      );

      assert.equal(bobRolesFromLynn.roles.length, 1);
      assert.equal(bobRolesFromBob.roles.length, 1);
      assert.equal(
        bobRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD
      );
      assert.equal(
        bobRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD
      );
    }
  );
}, 240000);

test("agent interaction without prior person creation", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Try to get profile for agent who hasn't created person record yet
      const bobProfileFromLynn = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey
      );
      assert.isNull(bobProfileFromLynn.person);
      assert.isNull(bobProfileFromLynn.private_data);

      // Try to assign role to agent without person record
      // This should still work as roles are independent of person records
      const roleResult = await assignRole(
        alice.cells[0],
        sampleRole(
          {
            role_name: TEST_ROLES.RESOURCE_STEWARD,
          },
          bob.agentPubKey
        )
      );

      assert.ok(roleResult);
      assert.ok(roleResult.signed_action);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Role should still be retrievable even without person record
      const bobRoles = await getPersonRoles(alice.cells[0], bob.agentPubKey);
      assert.equal(bobRoles.roles.length, 1);
      assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.RESOURCE_STEWARD);

      // Capability checking should work
      const hasCapability = await hasRoleCapability(
        alice.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD
      );
      assert.isTrue(hasCapability);

      // Now Bob creates person record
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Now Lynn should see Bob's person and his existing roles
      const bobProfileAfterCreation = await getPersonProfile(
        alice.cells[0],
        bob.agentPubKey
      );
      assert.ok(bobProfileAfterCreation.person);
      assert.equal(bobProfileAfterCreation.person!.name, "Bob");

      const bobRolesAfterCreation = await getPersonRoles(
        alice.cells[0],
        bob.agentPubKey
      );
      assert.equal(bobRolesAfterCreation.roles.length, 1);
    }
  );
}, 240000);
