import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  createPerson,
  storePrivateData,
  grantPrivateDataAccess,
  createPrivateDataCapClaim,
  getPrivateDataWithCapability,
  grantRoleBasedPrivateDataAccess,
  createTransferablePrivateDataAccess,
  revokePrivateDataAccess,
  validateCapabilityGrant,
} from "./common";
import { runScenarioWithTwoAgents, runScenarioWithThreeAgents } from "../utils";
import type {
  GrantPrivateDataAccessOutput,
  CreatePrivateDataCapClaimOutput,
  TransferableCapabilityOutput,
  FilteredPrivateData,
} from "@nondominium/shared-types/src/person.types";

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
      const grantResult: GrantPrivateDataAccessOutput =
        await grantPrivateDataAccess(alice.cells[0], {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email", "phone"],
          context: "test_workflow",
          expires_in_days: 7,
        });

      assert.ok(grantResult);
      // grant_hash is a Buffer in the Holochain client
      assert.ok(Buffer.isBuffer(grantResult.grant_hash));
      // CapSecret is also a Buffer in the Holochain client
      assert.ok(Buffer.isBuffer(grantResult.cap_secret));
      assert.typeOf(grantResult.expires_at, "number");

      // Ensure DHT sync is complete after grant creation before creating claim
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob creates a capability claim using the secret
      const claimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(bob.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: grantResult.cap_secret,
          context: "test_workflow",
        });

      assert.ok(claimResult);
      // claim_hash is also a Buffer in the Holochain client
      assert.ok(Buffer.isBuffer(claimResult.claim_hash));

      // Ensure DHT sync is complete before attempting access
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob now attempts to access Alice's private data using the capability
      const privateDataResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email", "phone"],
          },
          claimResult.claim_hash,
        );

      assert.ok(privateDataResult);
      assert.typeOf(privateDataResult.email, "string");
      assert.typeOf(privateDataResult.phone, "string");
      assert.equal(privateDataResult.legal_name, undefined); // Never shared

      // Test that Bob cannot access fields not granted
      const unauthorizedResult = await getPrivateDataWithCapability(
        bob.cells[0],
        {
          requested_fields: ["email", "address"], // address not granted
        },
        claimResult.claim_hash,
      );

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
      const roleGrantResult: GrantPrivateDataAccessOutput =
        await grantRoleBasedPrivateDataAccess(alice.cells[0], {
          agent: bob.agentPubKey,
          role: { role_name: "Accountable Agent" },
          context: "role_test",
        });

      assert.ok(roleGrantResult);
      // grant_hash is a Buffer in the Holochain client
      assert.ok(Buffer.isBuffer(roleGrantResult.grant_hash));
      // CapSecret is also a Buffer in the Holochain client
      assert.ok(Buffer.isBuffer(roleGrantResult.cap_secret));

      // Ensure DHT sync is complete after grant creation before creating claim
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob creates claim and tests access
      const claimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(bob.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: roleGrantResult.cap_secret,
          context: "role_accountable_agent_role_test",
        });

      const privateDataResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email"], // Accountable agent role should get email
          },
          claimResult.claim_hash,
        );

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
      const transferableResult: TransferableCapabilityOutput =
        await createTransferablePrivateDataAccess(alice.cells[0], {
          context: "guest_access",
          fields_allowed: ["email"],
          expires_in_days: 1, // Short duration for transferable
        });

      assert.ok(transferableResult);

      // Ensure DHT sync is complete after creating transferable capability
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Alice shares the secret with Bob (in a real scenario, this would be done securely)
      const bobClaimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(bob.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: transferableResult.cap_secret,
          context: "transferable_guest_access",
        });

      // Bob accesses the data
      const bobDataResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email"],
          },
          bobClaimResult.claim_hash,
        );

      assert.ok(bobDataResult);
      assert.typeOf(bobDataResult.email, "string");

      // Bob can now also share the capability with Carol
      const carolClaimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(carol.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: transferableResult.cap_secret,
          context: "transferable_guest_access",
        });

      const carolDataResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          carol.cells[0],
          {
            requested_fields: ["email"],
          },
          carolClaimResult.claim_hash,
        );

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

      // Create a grant that expires very soon (for testing)
      const shortGrantResult: GrantPrivateDataAccessOutput =
        await grantPrivateDataAccess(alice.cells[0], {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email"],
          context: "short_test",
          expires_in_days: 1, // Very short duration for testing
        });

      // This should fail due to invalid duration
      assert.ok(shortGrantResult);

      // Ensure DHT sync is complete before validating
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Test grant validation
      const isValid: boolean = await validateCapabilityGrant(
        alice.cells[0],
        shortGrantResult.grant_hash,
      );

      // Grant should be invalid due to immediate expiration
      assert.equal(isValid, false);

      // Test revoking a grant
      const validGrantResult: GrantPrivateDataAccessOutput =
        await grantPrivateDataAccess(alice.cells[0], {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email"],
          context: "revoke_test",
          expires_in_days: 7,
        });

      // Revoke the grant
      await revokePrivateDataAccess(
        alice.cells[0],
        validGrantResult.grant_hash,
      );

      // Ensure DHT sync is complete after revocation
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob should no longer be able to access the data
      const claimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(bob.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: validGrantResult.cap_secret,
          context: "revoke_test",
        });

      // This should fail because the capability was revoked
      try {
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email"],
          },
          claimResult.claim_hash,
        );
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
      const grantResult: GrantPrivateDataAccessOutput =
        await grantPrivateDataAccess(alice.cells[0], {
          agent_to_grant: bob.agentPubKey,
          fields_allowed: ["email", "phone"],
          context: "field_test",
          expires_in_days: 7,
        });

      // Ensure DHT sync is complete after grant creation before creating claim
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      const claimResult: CreatePrivateDataCapClaimOutput =
        await createPrivateDataCapClaim(bob.cells[0], {
          grantor: alice.agentPubKey,
          cap_secret: grantResult.cap_secret,
          context: "field_test",
        });

      // Test accessing granted fields
      const grantedFieldsResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email", "phone"],
          },
          claimResult.claim_hash,
        );

      assert.ok(grantedFieldsResult);
      assert.typeOf(grantedFieldsResult.email, "string");
      assert.typeOf(grantedFieldsResult.phone, "string");

      // Test accessing ungranted fields
      const ungrantedFieldsResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email", "location"], // location not granted
          },
          claimResult.claim_hash,
        );

      assert.ok(ungrantedFieldsResult);
      assert.typeOf(ungrantedFieldsResult.email, "string");
      assert.equal(ungrantedFieldsResult.location, undefined);

      // Test accessing sensitive fields
      const sensitiveFieldsResult: FilteredPrivateData =
        await getPrivateDataWithCapability(
          bob.cells[0],
          {
            requested_fields: ["email", "legal_name"], // legal_name never shared
          },
          claimResult.claim_hash,
        );

      assert.ok(sensitiveFieldsResult);
      assert.typeOf(sensitiveFieldsResult.email, "string");
      assert.equal(sensitiveFieldsResult.legal_name, undefined); // Never shared
    },
  );
});
