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
  validatePersonData,
  validatePrivateData,
  validateRoleData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common.js";
import {
  decodeRecord,
  runScenarioWithTwoAgents,
  createValidMockImage,
} from "../utils.js";

test(
  "create and retrieve Person",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Lynn creates a person
        const personInput = samplePerson({ name: "Lynn" });
        const result = await createPerson(alice.cells[0], personInput);
        
        assert.ok(result);
        assert.ok(result.person_hash);
        assert.ok(result.person);
        
        // Validate person data
        assert.isTrue(validatePersonData(personInput, result.person));
        assert.equal(result.person.agent_pub_key.toString(), alice.agentPubKey.toString());
        assert.ok(result.person.created_at);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn can get her own profile
        const aliceProfile = await getMyProfile(alice.cells[0]);
        assert.ok(aliceProfile.person);
        assert.equal(aliceProfile.person!.name, "Lynn");
        assert.isUndefined(aliceProfile.private_data); // No private data stored yet

        // Bob can get Lynn's public profile
        const bobViewOfLynn = await getAgentProfile(bob.cells[0], alice.agentPubKey);
        assert.ok(bobViewOfLynn.person);
        assert.equal(bobViewOfLynn.person!.name, "Lynn");
        assert.isUndefined(bobViewOfLynn.private_data); // Bob can't see Lynn's private data
      }
    );
  },
  240000
);

test(
  "store and retrieve private data",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Lynn creates a person first
        const personInput = samplePerson({ name: "Lynn" });
        await createPerson(alice.cells[0], personInput);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn stores private data
        const privateDataInput = samplePrivateData({
          legal_name: "Lynn Smith",
          email: "alice@example.com",
          address: "123 Main St, Anytown, AT 12345",
        });

        const result = await storePrivateData(alice.cells[0], privateDataInput);
        
        assert.ok(result);
        assert.ok(result.private_data_hash);
        assert.ok(result.private_data);
        
        // Validate private data
        assert.isTrue(validatePrivateData(privateDataInput, result.private_data));
        assert.ok(result.private_data.created_at);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn can see her own private data
        const aliceProfile = await getMyProfile(alice.cells[0]);
        assert.ok(aliceProfile.person);
        assert.ok(aliceProfile.private_data);
        assert.equal(aliceProfile.private_data!.legal_name, "Lynn Smith");
        assert.equal(aliceProfile.private_data!.email, "alice@example.com");

        // Bob cannot see Lynn's private data
        const bobViewOfLynn = await getAgentProfile(bob.cells[0], alice.agentPubKey);
        assert.ok(bobViewOfLynn.person);
        assert.isUndefined(bobViewOfLynn.private_data);
      }
    );
  },
  240000
);

test(
  "get all agents discovery",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Initially no agents
        let allAgents = await getAllAgents(alice.cells[0]);
        assert.equal(allAgents.agents.length, 0);

        // Lynn creates a person
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now one agent visible
        allAgents = await getAllAgents(bob.cells[0]);
        assert.equal(allAgents.agents.length, 1);
        assert.equal(allAgents.agents[0].name, "Lynn");

        // Bob creates a person
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now two agents visible
        allAgents = await getAllAgents(alice.cells[0]);
        assert.equal(allAgents.agents.length, 2);
        
        const names = allAgents.agents.map(agent => agent.name).sort();
        assert.deepEqual(names, ["Lynn", "Bob"]);
      }
    );
  },
  240000
);

test(
  "assign and retrieve agent roles",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Create persons for both agents
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Lynn assigns a role to Bob
        const roleInput = sampleRole({
          role_name: TEST_ROLES.STEWARD,
          description: "Community steward role",
        }, bob.agentPubKey);

        const result = await assignRole(alice.cells[0], roleInput);
        
        assert.ok(result);
        assert.ok(result.role_hash);
        assert.ok(result.role);
        
        // Validate role data
        assert.isTrue(validateRoleData(roleInput, result.role));
        assert.equal(result.role.assigned_by.toString(), alice.agentPubKey.toString());
        assert.ok(result.role.assigned_at);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Get Bob's roles
        const bobRoles = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        assert.equal(bobRoles.roles.length, 1);
        assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.STEWARD);
        assert.equal(bobRoles.roles[0].assigned_to.toString(), bob.agentPubKey.toString());

        // Lynn initially has no roles
        const aliceRoles = await getAgentRoles(bob.cells[0], alice.agentPubKey);
        assert.equal(aliceRoles.roles.length, 0);
      }
    );
  },
  240000
);

test(
  "role capability checking",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Create persons
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Initially Bob has no capabilities
        let hasCapability = await hasRoleCapability(
          alice.cells[0], 
          bob.agentPubKey, 
          TEST_ROLES.STEWARD
        );
        assert.isFalse(hasCapability);

        // Assign steward role to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
        }, bob.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now Bob has steward capability
        hasCapability = await hasRoleCapability(
          alice.cells[0], 
          bob.agentPubKey, 
          TEST_ROLES.STEWARD
        );
        assert.isTrue(hasCapability);

        // But Bob doesn't have coordinator capability
        hasCapability = await hasRoleCapability(
          alice.cells[0], 
          bob.agentPubKey, 
          TEST_ROLES.COORDINATOR
        );
        assert.isFalse(hasCapability);
      }
    );
  },
  240000
);

test(
  "agent capability levels",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Create persons
        await createPerson(alice.cells[0], samplePerson({ name: "Lynn" }));
        await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Initially Bob has simple capability level
        let capabilityLevel = await getAgentCapabilityLevel(alice.cells[0], bob.agentPubKey);
        assert.equal(capabilityLevel, CAPABILITY_LEVELS.SIMPLE);

        // Assign accountable role to Bob
        await assignRole(alice.cells[0], sampleRole({
          role_name: TEST_ROLES.STEWARD,
        }, bob.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now Bob has accountable capability level
        capabilityLevel = await getAgentCapabilityLevel(alice.cells[0], bob.agentPubKey);
        assert.equal(capabilityLevel, CAPABILITY_LEVELS.ACCOUNTABLE);

        // Assign primary role to Lynn
        await assignRole(bob.cells[0], sampleRole({
          role_name: TEST_ROLES.PRIMARY,
        }, alice.agentPubKey));

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Now Lynn has primary accountable capability level
        capabilityLevel = await getAgentCapabilityLevel(bob.cells[0], alice.agentPubKey);
        assert.equal(capabilityLevel, CAPABILITY_LEVELS.PRIMARY);
      }
    );
  },
  240000
);

test(
  "error handling - missing person profile",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Try to get profile for agent without person record
        const profile = await getAgentProfile(alice.cells[0], bob.agentPubKey);
        
        // Should return empty profile
        assert.isUndefined(profile.person);
        assert.isUndefined(profile.private_data);

        // Try to get roles for agent without person record
        const roles = await getAgentRoles(alice.cells[0], bob.agentPubKey);
        
        // Should return empty roles array
        assert.equal(roles.roles.length, 0);
      }
    );
  },
  240000
);