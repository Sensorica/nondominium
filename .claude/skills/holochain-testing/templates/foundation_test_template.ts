//! Foundation Test Template
//! Reference example for basic zome function testing following nondominium patterns

import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  // Import your zome functions here
  createPerson,
  getMyProfile,
  getAllPersons,
  validatePersonData,
  // Add other imports as needed
} from "./common";

import { runScenarioWithTwoAgents } from "../utils";
import { Person } from "@nondominium/shared-types";

test("create and retrieve Person", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Agent 1 creates a person
      const personInput = {
        name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
      };

      const personHash = await createPerson(agent1, personInput);
      assert.ok(personHash);

      // Retrieve the person profile
      const profile = await getMyProfile(agent1);
      assert.ok(profile);
      assert.equal(profile.name, personInput.name);
      assert.equal(profile.avatar_url, personInput.avatar_url);

      // Agent 2 should not see Agent 1's private profile
      const agent2Profile = await getMyProfile(agent2);
      assert.ok(agent2Profile);
      assert.notEqual(agent2Profile.name, personInput.name);
    },
  );
});

test("validate person data", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Test valid person data
      const validPersonData = {
        name: "Jane Doe",
        avatar_url: "https://example.com/avatar2.jpg",
      };

      const validationResult = await validatePersonData(
        agent1,
        validPersonData,
      );
      assert.ok(validationResult);

      // Test invalid person data (empty name)
      const invalidPersonData = {
        name: "",
        avatar_url: "https://example.com/avatar3.jpg",
      };

      try {
        await validatePersonData(agent1, invalidPersonData);
        assert.fail("Should have thrown validation error");
      } catch (error) {
        assert.ok(error.message.includes("Name cannot be empty"));
      }

      // Test invalid avatar URL
      const invalidAvatarData = {
        name: "Invalid Avatar",
        avatar_url: "not-a-valid-url",
      };

      try {
        await validatePersonData(agent1, invalidAvatarData);
        assert.fail("Should have thrown validation error");
      } catch (error) {
        assert.ok(error.message.includes("Invalid avatar URL"));
      }
    },
  );
});

test("get all persons (public data only)", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Both agents create persons
      const person1Input = {
        name: "Alice",
        avatar_url: "https://example.com/alice.jpg",
      };

      const person2Input = {
        name: "Bob",
        avatar_url: "https://example.com/bob.jpg",
      };

      await createPerson(agent1, person1Input);
      await createPerson(agent2, person2Input);

      // Allow time for DHT sync
      await dhtSync([agent1, agent2]);

      // Both agents should see all public persons
      const allPersons1 = await getAllPersons(agent1);
      const allPersons2 = await getAllPersons(agent2);

      assert.equal(allPersons1.length, 2);
      assert.equal(allPersons2.length, 2);

      // Verify public data is visible
      const alice1 = allPersons1.find((p) => p.name === "Alice");
      const alice2 = allPersons2.find((p) => p.name === "Alice");
      assert.ok(alice1);
      assert.ok(alice2);
      assert.equal(alice1.name, alice2.name);
      assert.equal(alice1.avatar_url, alice2.avatar_url);
    },
  );
});

test("error handling for invalid operations", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Test creating duplicate person for same agent
      const personInput = {
        name: "Charlie",
        avatar_url: "https://example.com/charlie.jpg",
      };

      await createPerson(agent1, personInput);

      try {
        await createPerson(agent1, personInput);
        assert.fail("Should have thrown error for duplicate person");
      } catch (error) {
        assert.ok(error.message.includes("Person already exists"));
      }

      // Test getting non-existent person
      try {
        await getMyProfile(agent2); // Agent 2 hasn't created a person yet
        assert.fail("Should have thrown error for non-existent person");
      } catch (error) {
        assert.ok(error.message.includes("Person not found"));
      }
    },
  );
});

test("person data persistence", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, agent1: PlayerApp, agent2: PlayerApp) => {
      // Create person with complete data
      const personInput = {
        name: "David",
        avatar_url: "https://example.com/david.jpg",
      };

      const personHash = await createPerson(agent1, personInput);
      assert.ok(personHash);

      // Wait a moment to ensure persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Retrieve person multiple times to ensure consistency
      const profile1 = await getMyProfile(agent1);
      const profile2 = await getMyProfile(agent1);
      const profile3 = await getMyProfile(agent1);

      assert.ok(profile1);
      assert.ok(profile2);
      assert.ok(profile3);

      // Verify all retrievals return the same data
      assert.equal(profile1.name, profile2.name);
      assert.equal(profile2.name, profile3.name);
      assert.equal(profile1.avatar_url, profile2.avatar_url);
      assert.equal(profile2.avatar_url, profile3.avatar_url);
    },
  );
});
