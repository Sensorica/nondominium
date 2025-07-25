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
  setupBasicPersons,
  setupPersonsWithPrivateData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
  PersonTestContext,
} from "./common.js";
import {
  runScenarioWithTwoAgents,
  delay,
} from "../utils.js";

test(
  "multi-agent person discovery and interaction",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicPersons(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents can discover each other
        const allAgentsFromAlice = await getAllAgents(alice.cells[0]);
        const allAgentsFromBob = await getAllAgents(bob.cells[0]);

        assert.equal(allAgentsFromAlice.agents.length, 2);
        assert.equal(allAgentsFromBob.agents.length, 2);

        // Verify both can see each other's public profiles
        const aliceViewOfBob = await getAgentProfile(alice.cells[0], bob.agentPubKey);
        const bobViewOfAlice = await getAgentProfile(bob.cells[0], alice.agentPubKey);

        assert.ok(aliceViewOfBob.person);
        assert.equal(aliceViewOfBob.person!.name, "Bob");
        assert.isUndefined(aliceViewOfBob.private_data);

        assert.ok(bobViewOfAlice.person);
        assert.equal(bobViewOfAlice.person!.name, "Alice");
        assert.isUndefined(bobViewOfAlice.private_data);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "privacy boundaries - private data isolation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupPersonsWithPrivateData(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice can see her own private data
        const aliceProfile = await getMyProfile(alice.cells[0]);
        assert.ok(aliceProfile.person);
        assert.ok(aliceProfile.private_data);
        assert.equal(aliceProfile.private_data!.legal_name, "Alice Smith");
        assert.equal(aliceProfile.private_data!.email, "alice@example.com");

        // Bob can see his own private data
        const bobProfile = await getMyProfile(bob.cells[0]);
        assert.ok(bobProfile.person);
        assert.ok(bobProfile.private_data);
        assert.equal(bobProfile.private_data!.legal_name, "Bob Johnson");
        assert.equal(bobProfile.private_data!.email, "bob@example.com");

        // Alice cannot see Bob's private data
        const aliceViewOfBob = await getAgentProfile(alice.cells[0], bob.agentPubKey);
        assert.ok(aliceViewOfBob.person);
        assert.isUndefined(aliceViewOfBob.private_data);

        // Bob cannot see Alice's private data
        const bobViewOfAlice = await getAgentProfile(bob.cells[0], alice.agentPubKey);
        assert.ok(bobViewOfAlice.person);
        assert.isUndefined(bobViewOfAlice.private_data);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "cross-agent role assignment and validation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicPersons(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice assigns steward role to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
          description: "Community steward assigned by Alice",
        }, bob.agentPubKey));

        // Bob assigns coordinator role to Alice
        await assignRole(bob.cells[0], sampleRole({
          role_name: TEST_ROLES.COORDINATOR,
          description: "Resource coordinator assigned by Bob",
        }, alice.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify role assignments from both perspectives
        const bobRolesFromAlice = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        const bobRolesFromBob = await getAgentRoles(bob.cells[0], bob.agentPubKey);

        assert.equal(bobRolesFromAlice.roles.length, 1);
        assert.equal(bobRolesFromBob.roles.length, 1);
        assert.equal(bobRolesFromAlice.roles[0].role_name, TEST_ROLES.STEWARD);
        assert.equal(bobRolesFromBob.roles[0].role_name, TEST_ROLES.STEWARD);

        const aliceRolesFromAlice = await getAgentRoles(alice.cells[0], alice.agentPubKey);
        const aliceRolesFromBob = await getAgentRoles(bob.cells[0], alice.agentPubKey);

        assert.equal(aliceRolesFromAlice.roles.length, 1);
        assert.equal(aliceRolesFromBob.roles.length, 1);
        assert.equal(aliceRolesFromAlice.roles[0].role_name, TEST_ROLES.COORDINATOR);
        assert.equal(aliceRolesFromBob.roles[0].role_name, TEST_ROLES.COORDINATOR);

        // Verify capability checking from both agents
        const bobHasStewardFromAlice = await hasRoleCapability(
          alice.cells[0], bob.agentPubKey, TEST_ROLES.STEWARD
        );
        const bobHasStewardFromBob = await hasRoleCapability(
          bob.cells[0], bob.agentPubKey, TEST_ROLES.STEWARD
        );

        assert.isTrue(bobHasStewardFromAlice);
        assert.isTrue(bobHasStewardFromBob);

        const aliceHasCoordinatorFromAlice = await hasRoleCapability(
          alice.cells[0], alice.agentPubKey, TEST_ROLES.COORDINATOR
        );
        const aliceHasCoordinatorFromBob = await hasRoleCapability(
          bob.cells[0], alice.agentPubKey, TEST_ROLES.COORDINATOR
        );

        assert.isTrue(aliceHasCoordinatorFromAlice);
        assert.isTrue(aliceHasCoordinatorFromBob);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "capability level consistency across agents",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicPersons(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Initially both have simple capability level
        let aliceCapFromAlice = await getAgentCapabilityLevel(alice.cells[0], alice.agentPubKey);
        let aliceCapFromBob = await getAgentCapabilityLevel(bob.cells[0], alice.agentPubKey);
        let bobCapFromAlice = await getAgentCapabilityLevel(alice.cells[0], bob.agentPubKey);
        let bobCapFromBob = await getAgentCapabilityLevel(bob.cells[0], bob.agentPubKey);

        assert.equal(aliceCapFromAlice, CAPABILITY_LEVELS.SIMPLE);
        assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.SIMPLE);
        assert.equal(bobCapFromAlice, CAPABILITY_LEVELS.SIMPLE);
        assert.equal(bobCapFromBob, CAPABILITY_LEVELS.SIMPLE);

        // Alice assigns accountable role to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
        }, bob.agentPubKey));

        // Bob assigns primary role to Alice
        await assignRole(bob.cells[0], sampleRole({
          role_name: TEST_ROLES.PRIMARY,
        }, alice.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify capability levels are consistent across agents
        aliceCapFromAlice = await getAgentCapabilityLevel(alice.cells[0], alice.agentPubKey);
        aliceCapFromBob = await getAgentCapabilityLevel(bob.cells[0], alice.agentPubKey);
        bobCapFromAlice = await getAgentCapabilityLevel(alice.cells[0], bob.agentPubKey);
        bobCapFromBob = await getAgentCapabilityLevel(bob.cells[0], bob.agentPubKey);

        assert.equal(aliceCapFromAlice, CAPABILITY_LEVELS.PRIMARY);
        assert.equal(aliceCapFromBob, CAPABILITY_LEVELS.PRIMARY);
        assert.equal(bobCapFromAlice, CAPABILITY_LEVELS.ACCOUNTABLE);
        assert.equal(bobCapFromBob, CAPABILITY_LEVELS.ACCOUNTABLE);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "multiple role assignments and capability aggregation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        const context = await setupBasicPersons(alice, bob);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Alice assigns multiple roles to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
          description: "Community steward role",
        }, bob.agentPubKey));

        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.COORDINATOR,
          description: "Resource coordinator role",
        }, bob.agentPubKey));

        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.ADVOCATE,
          description: "Community advocate role",
        }, bob.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify Bob has all assigned roles
        const bobRoles = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        assert.equal(bobRoles.roles.length, 3);

        const roleNames = bobRoles.roles.map(role => role.role_name).sort();
        assert.deepEqual(roleNames, [
          TEST_ROLES.ADVOCATE,
          TEST_ROLES.COORDINATOR,
          TEST_ROLES.STEWARD
        ]);

        // Verify Bob has all capabilities
        const hasSteward = await hasRoleCapability(alice.cells[0], bob.agentPubKey, TEST_ROLES.STEWARD);
        const hasCoordinator = await hasRoleCapability(alice.cells[0], bob.agentPubKey, TEST_ROLES.COORDINATOR);
        const hasAdvocate = await hasRoleCapability(alice.cells[0], bob.agentPubKey, TEST_ROLES.ADVOCATE);
        const hasFounder = await hasRoleCapability(alice.cells[0], bob.agentPubKey, TEST_ROLES.FOUNDER);

        assert.isTrue(hasSteward);
        assert.isTrue(hasCoordinator);
        assert.isTrue(hasAdvocate);
        assert.isFalse(hasFounder);

        // Verify capability level is accountable (highest of the assigned roles)
        const capabilityLevel = await getAgentCapabilityLevel(alice.cells[0], bob.agentPubKey);
        assert.equal(capabilityLevel, CAPABILITY_LEVELS.ACCOUNTABLE);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "DHT synchronization and eventual consistency",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Alice creates person
        await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));

        // Bob creates person  
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        // Before DHT sync, agents might not see each other
        let allAgentsFromAlice = await getAllAgents(alice.cells[0]);
        // This might be 1 or 2 depending on DHT propagation timing
        assert.isAtLeast(allAgentsFromAlice.agents.length, 1);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // After DHT sync, both should see each other
        allAgentsFromAlice = await getAllAgents(alice.cells[0]);
        const allAgentsFromBob = await getAllAgents(bob.cells[0]);

        assert.equal(allAgentsFromAlice.agents.length, 2);
        assert.equal(allAgentsFromBob.agents.length, 2);

        // Alice assigns role to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
        }, bob.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Both agents should see the role assignment
        const bobRolesFromAlice = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        const bobRolesFromBob = await getAgentRoles(bob.cells[0], bob.agentPubKey);

        assert.equal(bobRolesFromAlice.roles.length, 1);
        assert.equal(bobRolesFromBob.roles.length, 1);
        assert.equal(bobRolesFromAlice.roles[0].role_name, TEST_ROLES.STEWARD);
        assert.equal(bobRolesFromBob.roles[0].role_name, TEST_ROLES.STEWARD);
      }
    );
  },
  { timeout: 240000 }
);

test(
  "agent interaction without prior person creation",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Try to get profile for agent who hasn't created person record yet
        const bobProfileFromAlice = await getAgentProfile(alice.cells[0], bob.agentPubKey);
        assert.isUndefined(bobProfileFromAlice.person);
        assert.isUndefined(bobProfileFromAlice.private_data);

        // Try to assign role to agent without person record
        // This should still work as roles are independent of person records
        const roleResult = await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
        }, bob.agentPubKey));

        assert.ok(roleResult);
        assert.ok(roleResult.role_hash);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Role should still be retrievable even without person record
        const bobRoles = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        assert.equal(bobRoles.roles.length, 1);
        assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.STEWARD);

        // Capability checking should work
        const hasCapability = await hasRoleCapability(alice.cells[0], bob.agentPubKey, TEST_ROLES.STEWARD);
        assert.isTrue(hasCapability);

        // Now Bob creates person record
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now Alice should see Bob's person and his existing roles
        const bobProfileAfterCreation = await getAgentProfile(alice.cells[0], bob.agentPubKey);
        assert.ok(bobProfileAfterCreation.person);
        assert.equal(bobProfileAfterCreation.person!.name, "Bob");

        const bobRolesAfterCreation = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        assert.equal(bobRolesAfterCreation.roles.length, 1);
      }
    );
  },
  { timeout: 240000 }
);