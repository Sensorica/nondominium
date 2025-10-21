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
  assignPersonRole,
  getPersonRoles,
  hasRoleCapability,
  getCapabilityLevel,
  getMyPrivateData,
  validatePersonData,
  validatePrivateData,
  validateRoleData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common";
import { runScenarioWithTwoAgents } from "../utils";
import { Person } from "@nondominium/shared-types";

test("create and retrieve Person", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person
      const personInput = samplePerson({ name: "Lynn" });
      const result = await createPerson(lynn.cells[0], personInput);

      assert.ok(result);
      assert.ok(result.signed_action);

      // Extract and validate person data
      const person: Person = await lynn.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_latest_person",
        payload: result.signed_action.hashed.hash,
      });
      assert.isTrue(validatePersonData(personInput, person));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn can get her own profile
      const lynnProfile = await getMyProfile(lynn.cells[0]);
      assert.ok(lynnProfile.person);
      assert.equal(lynnProfile.person!.name, "Lynn");
      assert.isUndefined(lynnProfile.private_data); // No private data stored yet

      // Bob can get Lynn's public profile
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      assert.ok(bobViewOfLynn.person);
      assert.equal(bobViewOfLynn.person!.name, "Lynn");
      assert.isUndefined(bobViewOfLynn.private_data); // Bob can't see Lynn's private data
    },
  );
}, 240000);

test("store and retrieve private data", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      await createPerson(lynn.cells[0], personInput);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn stores private data
      const privateDataInput = samplePrivateData({
        legal_name: "Lynn Smith",
        email: "lynn@example.com",
        address: "123 Main St, Anytown, AT 12345",
      });

      const result = await storePrivateData(lynn.cells[0], privateDataInput);

      assert.ok(result);
      assert.ok(result.signed_action);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn can see her own private data
      const lynnProfile = await getMyProfile(lynn.cells[0]);
      assert.ok(lynnProfile.person);
      assert.ok(lynnProfile.private_data);
      assert.equal(lynnProfile.private_data!.legal_name, "Lynn Smith");
      assert.equal(lynnProfile.private_data!.email, "lynn@example.com");

      // Bob cannot see Lynn's private data
      const bobViewOfLynn = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      assert.ok(bobViewOfLynn.person);
      assert.isUndefined(bobViewOfLynn.private_data);
    },
  );
}, 240000);

test("get all agents discovery", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Initially no persons
      let allPersons = await getAllPersons(lynn.cells[0]);
      assert.equal(allPersons.persons.length, 0);

      // Lynn creates a person
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now one person visible
      allPersons = await getAllPersons(bob.cells[0]);
      assert.equal(allPersons.persons.length, 1);
      assert.equal(allPersons.persons[0].name, "Lynn");

      // Bob creates a person
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now two persons visible
      allPersons = await getAllPersons(lynn.cells[0]);
      assert.equal(allPersons.persons.length, 2);

      const names = allPersons.persons.map((person) => person.name).sort();
      assert.deepEqual(names, ["Bob", "Lynn"]);
    },
  );
}, 240000);

test("assign and retrieve agent roles", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Create persons for both agents
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Lynn assigns a role to Bob
      const roleInput = sampleRole(bob.agentPubKey, {
        role_name: TEST_ROLES.RESOURCE_STEWARD,
        description: "Community steward role",
      });

      const result = await assignPersonRole(lynn.cells[0], roleInput);

      assert.ok(result);
      assert.ok(result.signed_action);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Get Bob's roles
      const bobRoles = await getPersonRoles(lynn.cells[0], bob.agentPubKey);
      assert.equal(bobRoles.roles.length, 1);
      assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.RESOURCE_STEWARD);
      assert.equal(
        bobRoles.roles[0].assigned_to?.toString(),
        bob.agentPubKey.toString(),
      );

      // Lynn initially has no roles
      const lynnRoles = await getPersonRoles(bob.cells[0], lynn.agentPubKey);
      assert.equal(lynnRoles.roles.length, 0);
    },
  );
}, 240000);

test("role capability checking", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Create persons
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Initially Bob has no capabilities
      let hasCapability = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      assert.isFalse(hasCapability);

      // Assign steward role to Bob
      await assignPersonRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now Bob has steward capability
      hasCapability = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      assert.isTrue(hasCapability);

      // But Bob doesn't have coordinator capability
      hasCapability = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      assert.isFalse(hasCapability);
    },
  );
}, 240000);

test("agent capability levels", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Create persons
      await createPerson(lynn.cells[0], samplePerson({ name: "Lynn" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Initially Bob has member capability level
      let capabilityLevel = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.equal(capabilityLevel, CAPABILITY_LEVELS.MEMBER);

      // Assign coordination role to Bob (Accountable Agent maps to coordination level)
      await assignPersonRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_COORDINATOR,
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now Bob has coordination capability level
      capabilityLevel = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.equal(capabilityLevel, CAPABILITY_LEVELS.COORDINATION);

      // Assign founder role to Lynn
      await assignPersonRole(
        bob.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.FOUNDER,
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Now Lynn has governance capability level
      capabilityLevel = await getCapabilityLevel(
        bob.cells[0],
        lynn.agentPubKey,
      );
      assert.equal(capabilityLevel, CAPABILITY_LEVELS.GOVERNANCE);
    },
  );
}, 240000);

test("error handling - missing person profile", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Try to get profile for agent without person record
      const profile = await getPersonProfile(lynn.cells[0], bob.agentPubKey);

      // Should return empty profile
      assert.isNull(profile.person);
      assert.isUndefined(profile.private_data);

      // Try to get roles for agent without person record
      const roles = await getPersonRoles(lynn.cells[0], bob.agentPubKey);

      // Should return empty roles array
      assert.equal(roles.roles.length, 0);
    },
  );
}, 240000);
