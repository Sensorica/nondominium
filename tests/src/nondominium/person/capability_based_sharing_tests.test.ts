import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { ActionHash, AgentPubKey } from "@holochain/client";

import { createPerson, storePrivateData } from "./common";
import { runScenarioWithTwoAgents, runScenarioWithThreeAgents } from "../utils";

test("capability-based private data sharing workflow", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create Alice's profile and private data
      await createPerson(alice.cells[0], {
        name: "Alice",
        avatar_url: undefined,
        bio: "Test user Alice",
      });

      await storePrivateData(alice.cells[0], {
        legal_name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        emergency_contact: "Emergency Contact",
        time_zone: "UTC",
        location: "Test City",
      });

      // Create Bob's profile
      await createPerson(bob.cells[0], {
        name: "Bob",
        avatar_url: undefined,
        bio: "Test user Bob",
      });

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Alice grants Bob access to her private data
      const grantResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "grant_private_data_access",
        payload: {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email", "phone"],
          context: "test_workflow",
          expires_in_days: 7,
        },
      });

      assert.ok(grantResult);
      assert.typeOf(grantResult.grant_hash, "string");
      assert.typeOf(grantResult.cap_secret, "string");
      assert.typeOf(grantResult.expires_at, "number");

      // Bob creates a capability claim using the secret
      const claimResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: grantResult.cap_secret,
          context: "test_workflow",
        },
      });

      assert.ok(claimResult);
      assert.typeOf(claimResult.claim_hash, "string");

      // Bob now attempts to access Alice's private data using the capability
      const privateDataResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email", "phone"],
        },
        cap_secret: claimResult.claim_hash,
      });

      assert.ok(privateDataResult);
      assert.typeOf(privateDataResult.email, "string");
      assert.typeOf(privateDataResult.phone, "string");
      assert.equal(privateDataResult.legal_name, undefined); // Never shared

      // Test that Bob cannot access fields not granted
      const unauthorizedResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email", "address"], // address not granted
        },
        cap_secret: claimResult.claim_hash,
      });

      // This should succeed but return null for ungranted fields
      assert.ok(unauthorizedResult);
      assert.typeOf(unauthorizedResult.email, "string");
      assert.equal(unauthorizedResult.address, undefined);
    },
  );
});

test("role-based capability grants", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create Alice's profile and private data
      await createPerson(alice.cells[0], {
        name: "Alice",
        avatar_url: undefined,
        bio: "Test user Alice",
      });

      await storePrivateData(alice.cells[0], {
        legal_name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        emergency_contact: "Emergency Contact",
        time_zone: "UTC",
        location: "Test City",
      });

      // Create Bob's profile
      await createPerson(bob.cells[0], {
        name: "Bob",
        avatar_url: undefined,
        bio: "Test user Bob",
      });

      // Alice grants Bob accountable agent role access
      const roleGrantResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "grant_role_based_private_data_access",
        payload: {
          agent: bob.agentPubKey,
          role: { role_name: "Accountable Agent" },
          context: "role_test",
        },
      });

      assert.ok(roleGrantResult);
      assert.typeOf(roleGrantResult.grant_hash, "string");

      // Bob creates claim and tests access
      const claimResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: roleGrantResult.cap_secret,
          context: "role_accountable_agent_role_test",
        },
      });

      const privateDataResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email"], // Accountable agent role should get email
        },
        cap_secret: claimResult.claim_hash,
      });

      assert.ok(privateDataResult);
      assert.typeOf(privateDataResult.email, "string");
    },
  );
});

test("transferable capability grants", async () => {
  await runScenarioWithThreeAgents(
    async (
      _scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Create profiles for all agents
      await createPerson(alice.cells[0], {
        name: "Alice",
        avatar_url: undefined,
        bio: "Test user Alice",
      });

      await storePrivateData(alice.cells[0], {
        legal_name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        emergency_contact: "Emergency Contact",
        time_zone: "UTC",
        location: "Test City",
      });

      await createPerson(bob.cells[0], {
        name: "Bob",
        avatar_url: undefined,
        bio: "Test user Bob",
      });

      await createPerson(carol.cells[0], {
        name: "Carol",
        avatar_url: undefined,
        bio: "Test user Carol",
      });

      // Alice creates a transferable capability
      const transferableResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_transferable_private_data_access",
        payload: {
          context: "guest_access",
          fields_allowed: ["email"],
          expires_in_days: 1, // Short duration for transferable
        },
      });

      assert.ok(transferableResult);

      // Alice shares the secret with Bob (in a real scenario, this would be done securely)
      const bobClaimResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: transferableResult.cap_secret,
          context: "transferable_guest_access",
        },
      });

      // Bob accesses the data
      const bobDataResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email"],
        },
        cap_secret: bobClaimResult.claim_hash,
      });

      assert.ok(bobDataResult);
      assert.typeOf(bobDataResult.email, "string");

      // Bob can now also share the capability with Carol
      const carolClaimResult = await carol.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: transferableResult.cap_secret,
          context: "transferable_guest_access",
        },
      });

      const carolDataResult = await carol.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email"],
        },
        cap_secret: carolClaimResult.claim_hash,
      });

      assert.ok(carolDataResult);
      assert.typeOf(carolDataResult.email, "string");
    },
  );
});

test("capability grant validation and expiration", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create Alice's profile and private data
      await createPerson(alice.cells[0], {
        name: "Alice",
        avatar_url: undefined,
        bio: "Test user Alice",
      });

      await storePrivateData(alice.cells[0], {
        legal_name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        emergency_contact: "Emergency Contact",
        time_zone: "UTC",
        location: "Test City",
      });

      // Create Bob's profile
      await createPerson(bob.cells[0], {
        name: "Bob",
        avatar_url: undefined,
        bio: "Test user Bob",
      });

      // Create a grant that expires immediately (for testing)
      const shortGrantResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "grant_private_data_access",
        payload: {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email"],
          context: "short_test",
          expires_in_days: 0, // Should be invalid
        },
      });

      // This should fail due to invalid duration
      assert.ok(shortGrantResult);

      // Test grant validation
      const isValid = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "validate_capability_grant",
        payload: shortGrantResult.grant_hash,
      });

      // Grant should be invalid due to immediate expiration
      assert.equal(isValid, false);

      // Test revoking a grant
      const validGrantResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "grant_private_data_access",
        payload: {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email"],
          context: "revoke_test",
          expires_in_days: 7,
        },
      });

      // Revoke the grant
      await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "revoke_private_data_access",
        payload: validGrantResult.grant_hash,
      });

      // Bob should no longer be able to access the data
      const claimResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: validGrantResult.cap_secret,
          context: "revoke_test",
        },
      });

      // This should fail because the capability was revoked
      try {
        await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "get_private_data_with_capability",
          payload: {
            requested_fields: ["email"],
          },
          cap_secret: claimResult.claim_hash,
        });
        assert.fail("Should have failed due to revoked capability");
      } catch (error: any) {
        assert.include(error.message, "Unauthorized");
      }
    },
  );
});

test("field access control", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Create Alice's profile and private data
      await createPerson(alice.cells[0], {
        name: "Alice",
        avatar_url: undefined,
        bio: "Test user Alice",
      });

      await storePrivateData(alice.cells[0], {
        legal_name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        emergency_contact: "Emergency Contact",
        time_zone: "UTC",
        location: "Test City",
      });

      // Create Bob's profile
      await createPerson(bob.cells[0], {
        name: "Bob",
        avatar_url: undefined,
        bio: "Test user Bob",
      });

      // Grant access to specific fields
      const grantResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "grant_private_data_access",
        payload: {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email", "phone"],
          context: "field_test",
          expires_in_days: 7,
        },
      });

      const claimResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "create_private_data_cap_claim",
        payload: {
          grantor: alice.agentPubKey,
          cap_secret: grantResult.cap_secret,
          context: "field_test",
        },
      });

      // Test accessing granted fields
      const grantedFieldsResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email", "phone"],
        },
        cap_secret: claimResult.claim_hash,
      });

      assert.ok(grantedFieldsResult);
      assert.typeOf(grantedFieldsResult.email, "string");
      assert.typeOf(grantedFieldsResult.phone, "string");

      // Test accessing ungranted fields
      const ungrantedFieldsResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email", "location"], // location not granted
        },
        cap_secret: claimResult.claim_hash,
      });

      assert.ok(ungrantedFieldsResult);
      assert.typeOf(ungrantedFieldsResult.email, "string");
      assert.equal(ungrantedFieldsResult.location, undefined);

      // Test accessing sensitive fields
      const sensitiveFieldsResult = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_with_capability",
        payload: {
          requested_fields: ["email", "legal_name"], // legal_name never shared
        },
        cap_secret: claimResult.claim_hash,
      });

      assert.ok(sensitiveFieldsResult);
      assert.typeOf(sensitiveFieldsResult.email, "string");
      assert.equal(sensitiveFieldsResult.legal_name, undefined); // Never shared
    },
  );
});
