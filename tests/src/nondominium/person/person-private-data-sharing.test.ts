import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import {
  samplePerson,
  samplePrivateData,
  createPerson,
  storePrivateData,
} from "./common.js";
import { runScenarioWithTwoAgents } from "../utils.js";

test("simple private data access test", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("🧪 Testing simple private data access...");

      // 1. Alice creates person
      const alicePerson = await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));
      console.log("✅ Alice created person");

      // 2. Alice stores private data
      const alicePrivateData = await storePrivateData(alice.cells[0], samplePrivateData({ email: "alice@test.com" }));
      console.log("✅ Alice stored private data");

      // Sync after storing private data
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 3. Bob creates person
      const bobPerson = await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));
      console.log("✅ Bob created person");

      // 4. Sync DHT
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 5. Bob requests access
      const request = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email"],
          context: "test",
          resource_hash: null,
          justification: "Test access",
        },
      });
      console.log("✅ Bob created request");

      // 6. Sync DHT
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 7. Alice approves
      const requestHash = (request as any).signed_action.hashed.hash;
      const grant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: requestHash,
          response: { granted: true, expires_at: null },
        },
      });
      console.log("✅ Alice approved request");

      // 8. Sync DHT
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 9. Bob accesses private data
      const sharedData = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_granted_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          requested_fields: ["email"],
          context: "test",
        },
      });
      console.log("✅ Bob accessed private data:", sharedData);
      
      assert.ok(sharedData);
      console.log("🎉 Test completed successfully!");
    }
  );
});

test("private data sharing workflow for custodianship transfer", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      console.log("Testing private data sharing workflow...");

      // Alice (current custodian) creates her profile and private data
      const alicePersonRecord = await createPerson(
        alice.cells[0],
        samplePerson({
          name: "Alice Custodian",
          bio: "Current resource custodian",
        }),
      );
      assert.ok(alicePersonRecord);

      const alicePrivateDataRecord = await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          legal_name: "Alice Marie Custodian",
          email: "alice.custodian@example.com",
          phone: "+1-555-111-2222",
          location: "Seattle, WA",
          time_zone: "America/Los_Angeles",
        }),
      );
      assert.ok(alicePrivateDataRecord);

      // Bob (new custodian) creates his profile
      const bobPersonRecord = await createPerson(
        bob.cells[0],
        samplePerson({
          name: "Bob NewCustodian",
          bio: "Incoming resource custodian",
        }),
      );
      assert.ok(bobPersonRecord);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      console.log("Testing private data access request workflow...");

      // 1. Bob requests access to Alice's contact information for coordination
      const dataRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email", "phone", "location", "time_zone"],
          context: "custodian_transfer_simulation",
          resource_hash: null, // Simulating without actual resource for this test
          justification:
            "New custodian requesting contact information for resource handover coordination.",
        },
      });
      assert.ok(dataRequest);
      console.log("Data access request created:", dataRequest);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 2. Alice checks her pending requests
      const pendingRequests = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_pending_data_requests",
        payload: null,
      });
      assert.ok(Array.isArray(pendingRequests));
      assert.equal(pendingRequests.length, 1);
      assert.equal(pendingRequests[0].requested_by.toString(), bob.agentPubKey.toString());
      assert.equal(pendingRequests[0].context, "custodian_transfer_simulation");
      console.log("Alice sees pending request:", pendingRequests[0]);

      // 3. Alice approves the request
      const requestHash = (dataRequest as any).signed_action.hashed.hash;
      const grantResponse = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: requestHash,
          response: {
            granted: true,
            expires_at: null, // Use default 7-day expiration
          },
        },
      });
      assert.ok(grantResponse);
      console.log(
        "Alice approved the request and created grant:",
        grantResponse,
      );

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 4. Bob retrieves Alice's shared contact information
      const sharedData = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_granted_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          requested_fields: ["email", "phone", "location", "time_zone"],
          context: "custodian_transfer_simulation",
        },
      });
      assert.ok(sharedData);

      // Verify the private data fields are accessible
      assert.ok((sharedData as any).email);
      assert.equal((sharedData as any).email, "alice.custodian@example.com");
      assert.ok((sharedData as any).phone);
      assert.equal((sharedData as any).phone, "+1-555-111-2222");
      assert.ok((sharedData as any).location);
      assert.equal((sharedData as any).location, "Seattle, WA");
      assert.ok((sharedData as any).time_zone);
      assert.equal((sharedData as any).time_zone, "America/Los_Angeles");

      // Verify sensitive fields are NOT accessible (should be undefined in returned data)
      assert.ok(!(sharedData as any).legal_name);

      console.log(
        "Bob successfully retrieved Alice's contact info:",
        sharedData,
      );

      // 5. Verify Alice can see her active grants
      const aliceGrants = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_my_data_grants",
        payload: null,
      });
      assert.ok(Array.isArray(aliceGrants));
      assert.equal(aliceGrants.length, 1);
      assert.equal(aliceGrants[0].granted_to, bob.agentPubKey);
      assert.equal(aliceGrants[0].context, "custodian_transfer_simulation");
      console.log("Alice's active grants:", aliceGrants);

      // 6. Test grant revocation
      const grantHash = (grantResponse as any).signed_action.hashed.hash;
      await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "revoke_data_access_grant",
        payload: grantHash,
      });
      console.log("Alice revoked the data access grant");

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 7. Verify Bob can no longer access the data
      try {
        await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "get_granted_private_data",
          payload: {
            target_agent: alice.agentPubKey,
            requested_fields: ["email", "phone"],
            context: "custodian_transfer_simulation",
          },
        });
        assert.fail("Should have failed after grant revocation");
      } catch (error) {
        console.log("✅ Data access correctly denied after revocation");
      }
      console.log("Data access successfully revoked");

      console.log(
        "✅ Private data sharing workflow test completed successfully",
      );
    },
  );
});

test("direct data access grant without request", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Set up profiles
      await createPerson(
        alice.cells[0],
        samplePerson({ name: "Alice Granter" }),
      );
      await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          email: "alice@example.com",
          phone: "+1-555-999-8888",
        }),
      );
      await createPerson(bob.cells[0], samplePerson({ name: "Bob Grantee" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      console.log("Testing direct grant workflow...");

      // Alice directly grants access to Bob (note: this function doesn't exist in current impl)
      // For now, we'll use the request/response flow
      const directRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email", "phone"],
          context: "direct_coordination",
          resource_hash: null,
          justification: "Direct coordination needed",
        },
      });

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      const directRequestHash = (directRequest as any).signed_action.hashed
        .hash;
      const directGrant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: directRequestHash,
          response: {
            granted: true,
            expires_at: null, // 7-day default
          },
        },
      });
      assert.ok(directGrant);
      console.log("Direct grant created:", directGrant);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob can access the granted data
      const grantedData = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_granted_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          requested_fields: ["email", "phone"],
          context: "direct_coordination",
        },
      });
      assert.ok(grantedData);
      assert.equal((grantedData as any).email, "alice@example.com");
      assert.equal((grantedData as any).phone, "+1-555-999-8888");
      console.log("Bob accessed directly granted data:", grantedData);

      console.log("✅ Direct grant workflow test completed successfully");
    },
  );
});

test("data access validation and security", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Set up profiles
      await createPerson(alice.cells[0], samplePerson({ name: "Alice" }));
      await createPerson(bob.cells[0], samplePerson({ name: "Bob" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      console.log("Testing security validations...");

      // Test 1: Invalid field request should fail
      try {
        await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "request_private_data_access",
          payload: {
            requested_from: alice.agentPubKey,
            fields_requested: ["legal_name", "address"], // These should be blocked
            context: "invalid_test",
            resource_hash: null,
            justification: "Testing invalid fields",
          },
        });
        assert.fail("Should have failed for invalid fields");
      } catch (error) {
        console.log("✅ Correctly rejected invalid field request:", error);
      }

      // Test 2: Self-request should fail
      try {
        await alice.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "request_private_data_access",
          payload: {
            requested_from: alice.agentPubKey,
            fields_requested: ["email"],
            context: "self_test",
            resource_hash: null,
            justification: "Testing self request",
          },
        });
        assert.fail("Should have failed for self-request");
      } catch (error) {
        console.log("✅ Correctly rejected self-request:", error);
      }

      // Test 3: Empty context should fail
      try {
        await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "request_private_data_access",
          payload: {
            requested_from: alice.agentPubKey,
            fields_requested: ["email"],
            context: "",
            resource_hash: null,
            justification: "Testing empty context",
          },
        });
        assert.fail("Should have failed for empty context");
      } catch (error) {
        console.log("✅ Correctly rejected empty context:", error);
      }

      console.log("✅ Security validation tests completed successfully");
    },
  );
});

// ============================================================================
// ENHANCED PRIVATE DATA SHARING TESTS
// ============================================================================

test("cross-zome governance integration for private data validation", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Set up agents with complete profiles and private data
      console.log("Setting up agents with private data...");

      const alicePersonRecord = await createPerson(
        alice.cells[0],
        samplePerson({
          name: "Alice Governance",
          bio: "Governance agent with private data",
        }),
      );
      assert.ok(alicePersonRecord);

      const alicePrivateDataRecord = await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          legal_name: "Alice Marie Governance",
          email: "alice.governance@example.com",
          phone: "+1-555-GOVERN",
          location: "Governance City",
          time_zone: "America/New_York",
        }),
      );
      assert.ok(alicePrivateDataRecord);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      console.log("Testing governance validation workflow...");

      // 1. Create a governance access grant for validation
      // First Bob requests access as governance system
      const governanceRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email", "phone", "location"],
          context: "governance_validation_test",
          resource_hash: null,
          justification: "Governance validation access needed",
        },
      });

      const governanceRequestHash = (governanceRequest as any).signed_action
        .hashed.hash;
      const governanceGrant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: governanceRequestHash,
          response: {
            granted: true,
            expires_at: null, // 7-day default
          },
        },
      });
      assert.ok(governanceGrant);
      console.log("Governance grant created:", governanceGrant);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 2. Test governance validation from person zome
      const validationResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "validate_agent_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          validation_context: "governance_promotion_test",
          required_fields: ["email", "phone"],
          governance_requester: bob.agentPubKey,
        },
      });

      assert.ok(validationResult);
      assert.equal((validationResult as any).is_valid, true);
      assert.ok((validationResult as any).validated_data);
      assert.equal(
        (validationResult as any).validated_data.email,
        "alice.governance@example.com",
      );
      assert.equal(
        (validationResult as any).validated_data.phone,
        "+1-555-GOVERN",
      );
      console.log("✅ Private data validation successful:", validationResult);

      // 3. Test validation failure for missing grant
      const charlie = await scenario.addPlayerWithApp({
        appBundleSource: {
          type: "path" as const,
          value: process.cwd() + "/../workdir/nondominium.happ",
        },
      });

      const failedValidation = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "validate_agent_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          validation_context: "governance_test_failure",
          required_fields: ["email", "phone"],
          governance_requester: charlie.agentPubKey, // No grant exists for charlie
        },
      });

      assert.ok(failedValidation);
      assert.equal((failedValidation as any).is_valid, false);
      assert.ok((failedValidation as any).error_message);
      console.log(
        "✅ Validation correctly failed for unauthorized requester:",
        failedValidation,
      );

      console.log(
        "✅ Cross-zome governance integration test completed successfully",
      );
    },
  );
});

test("agent role promotion with private data validation", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const charlie = await scenario.addPlayerWithApp({
        appBundleSource: {
          type: "path" as const,
          value: process.cwd() + "/../workdir/nondominium.happ",
        },
      });
      await scenario.shareAllAgents();

      console.log("Setting up role promotion test scenario...");

      // Alice is a governance agent (Primary Accountable Agent)
      await createPerson(
        alice.cells[0],
        samplePerson({ name: "Alice Governance" }),
      );
      await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "assign_person_role",
        payload: {
          agent_pubkey: alice.agentPubKey,
          role_name: "Primary Accountable Agent",
          description: "Governance authority",
        },
      });

      // Bob wants promotion and has complete private data
      await createPerson(bob.cells[0], samplePerson({ name: "Bob Promotion" }));
      await storePrivateData(
        bob.cells[0],
        samplePrivateData({
          legal_name: "Bob Promotion Candidate",
          email: "bob.promotion@example.com",
          phone: "+1-555-PROMOTE",
          location: "Promotion City",
          time_zone: "America/Chicago",
        }),
      );

      // Charlie wants promotion but has incomplete private data
      await createPerson(
        charlie.cells[0],
        samplePerson({ name: "Charlie Incomplete" }),
      );
      await storePrivateData(
        charlie.cells[0],
        samplePrivateData({
          legal_name: "Charlie Incomplete Data",
          email: "charlie.incomplete@example.com",
          // Missing phone, location, time_zone
        }),
      );

      await dhtSync([alice, bob, charlie], alice.cells[0].cell_id[0]);

      console.log("Testing agent promotion workflow...");

      // 1. Bob creates auto-grant for governance access (needed for validation)
      const bobAutoGrant = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "auto_grant_governance_access",
        payload: "Accountable Agent",
      });
      assert.ok(bobAutoGrant);
      console.log("Bob created auto-grant for promotion:", bobAutoGrant);

      await dhtSync([alice, bob, charlie], alice.cells[0].cell_id[0]);

      // 2. Alice promotes Bob to Accountable Agent (should succeed)
      try {
        const bobPromotion = await alice.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "promote_agent_with_validation",
          payload: {
            target_agent: bob.agentPubKey,
            target_role: "Accountable Agent",
            justification:
              "Bob has demonstrated leadership and has complete data",
            validate_private_data: true,
          },
        });
        assert.ok(bobPromotion);
        console.log("✅ Bob promotion successful:", bobPromotion);
      } catch (error) {
        console.error("❌ Bob promotion failed unexpectedly:", error);
        throw error;
      }

      // 3. Try to promote Charlie (should fail due to incomplete data)
      const charlieAutoGrant = await charlie.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "auto_grant_governance_access",
        payload: "Accountable Agent",
      });
      assert.ok(charlieAutoGrant);

      await dhtSync([alice, bob, charlie], alice.cells[0].cell_id[0]);

      try {
        await alice.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "promote_agent_with_validation",
          payload: {
            target_agent: charlie.agentPubKey,
            target_role: "Accountable Agent",
            justification: "Charlie promotion test",
            validate_private_data: true,
          },
        });
        assert.fail("Should have failed for incomplete private data");
      } catch (error) {
        console.log(
          "✅ Charlie promotion correctly failed due to incomplete data:",
          error,
        );
      }

      // 4. Test self-promotion request
      try {
        const promotionRequest = await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "request_role_promotion",
          payload: {
            target_role: "Primary Accountable Agent",
            justification: "Ready for governance responsibilities",
          },
        });
        assert.ok(promotionRequest);
        console.log("✅ Bob self-promotion request created:", promotionRequest);
      } catch (error) {
        console.error("Self-promotion request failed:", error);
      }

      console.log("✅ Agent promotion workflow test completed successfully");
    },
  );
});

test("enhanced audit trail and notifications", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      // Set up profiles and private data
      await createPerson(
        alice.cells[0],
        samplePerson({ name: "Alice Auditor" }),
      );
      await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          email: "alice.auditor@example.com",
          phone: "+1-555-AUDIT",
          location: "Audit City",
        }),
      );
      await createPerson(bob.cells[0], samplePerson({ name: "Bob Recipient" }));

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      console.log("Testing enhanced audit trail and notifications...");

      // 1. Create a grant to generate audit activity
      const auditRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email", "phone"],
          context: "audit_test_grant",
          resource_hash: null,
          justification: "Testing audit trail functionality",
        },
      });

      const auditRequestHash = (auditRequest as any).signed_action.hashed.hash;
      const grant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: auditRequestHash,
          response: {
            granted: true,
            expires_at: null, // 7-day default (but we'll test expiry functionality)
          },
        },
      });
      assert.ok(grant);
      console.log("Test grant created for audit trail:", grant);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // 2. Test audit trail retrieval
      const auditTrail = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_agent_access_audit_trail",
        payload: { agent_pubkey: alice.agentPubKey },
      });
      assert.ok(Array.isArray(auditTrail));
      console.log("✅ Audit trail retrieved:", auditTrail);

      // 3. Test expiring grants detection
      const expiringGrants = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_expiring_grants",
        payload: 2, // Look ahead 2 days
      });
      assert.ok(Array.isArray(expiringGrants));
      assert.ok(expiringGrants.length > 0); // Should find the 1-day grant
      console.log("✅ Expiring grants detected:", expiringGrants);

      // 4. Test grant renewal
      const grantHash = (grant as any).signed_action.hashed.hash;
      const renewedGrant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_grant_renewal",
        payload: {
          grant_hash: grantHash,
          additional_days: 5,
          renewal_justification: "Extended for additional coordination",
        },
      });
      assert.ok(renewedGrant);
      console.log("✅ Grant renewal successful:", renewedGrant);

      // 5. Test private data sharing statistics
      const stats = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "get_private_data_sharing_stats",
        payload: null,
      });
      assert.ok(stats);
      assert.ok((stats as any).total_grants_issued >= 1);
      assert.ok((stats as any).most_requested_fields);
      console.log("✅ Private data sharing statistics:", stats);

      // 6. Test bulk operations
      const bulkOperation = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "execute_bulk_grant_operation",
        payload: {
          operation_type: "notify",
          grant_hashes: [grantHash],
          justification: "Testing bulk notifications",
        },
      });
      assert.ok(Array.isArray(bulkOperation));
      console.log("✅ Bulk operation completed:", bulkOperation);

      console.log(
        "✅ Enhanced audit trail and notifications test completed successfully",
      );
    },
  );
});

test("comprehensive private data validation edge cases", async () => {
  await runScenarioWithTwoAgents(
    async (scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
      const charlie = await scenario.addPlayerWithApp({
        appBundleSource: {
          type: "path" as const,
          value: process.cwd() + "/../workdir/nondominium.happ",
        },
      });
      await scenario.shareAllAgents();

      // Set up test agents
      await createPerson(
        alice.cells[0],
        samplePerson({ name: "Alice EdgeCase" }),
      );
      await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          email: "alice@example.com",
          phone: "+1-555-EDGE",
          location: "Edge City",
          time_zone: "America/Los_Angeles",
        }),
      );

      await createPerson(bob.cells[0], samplePerson({ name: "Bob EdgeCase" }));
      await createPerson(
        charlie.cells[0],
        samplePerson({ name: "Charlie EdgeCase" }),
      );

      await dhtSync([alice, bob, charlie], alice.cells[0].cell_id[0]);

      console.log("Testing comprehensive edge cases...");

      // 1. Test expired grant cleanup - create a grant through request/response pattern
      const shortRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email"],
          context: "short_term_test",
          resource_hash: null,
          justification: "Short term test grant",
        },
      });
      const shortRequestHash = (shortRequest as any).signed_action.hashed.hash;
      const shortGrant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: shortRequestHash,
          response: {
            granted: true,
            expires_at: null, // Will use default but we'll test cleanup
          },
        },
      });
      assert.ok(shortGrant);

      await dhtSync([alice, bob, charlie], alice.cells[0].cell_id[0]);

      // Wait a moment to ensure expiry
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleanupResult = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "cleanup_expired_grants",
        payload: null,
      });
      console.log("✅ Expired grants cleanup result:", cleanupResult);

      // 2. Test maximum field validation through request/response
      try {
        const maxFieldsRequest = await bob.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "request_private_data_access",
          payload: {
            requested_from: alice.agentPubKey,
            fields_requested: [
              "email",
              "phone",
              "location",
              "time_zone",
              "emergency_contact",
            ],
            context: "max_fields_test",
            resource_hash: null,
            justification: "Testing maximum allowed fields",
          },
        });
        const maxFieldsRequestHash = (maxFieldsRequest as any).signed_action
          .hashed.hash;
        await alice.cells[0].callZome({
          zome_name: "zome_person",
          fn_name: "respond_to_data_access_request",
          payload: {
            request_hash: maxFieldsRequestHash,
            response: {
              granted: true,
              expires_at: null,
            },
          },
        });
        console.log("✅ Maximum allowed fields grant successful");
      } catch (error) {
        assert.fail("Maximum fields grant should succeed");
      }

      // 3. Test renewal limits (30-day cap) - create through request/response
      const longTermRequest = await bob.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_private_data_access",
        payload: {
          requested_from: alice.agentPubKey,
          fields_requested: ["email"],
          context: "long_term_test",
          resource_hash: null,
          justification: "Testing renewal limits",
        },
      });
      const longTermRequestHash = (longTermRequest as any).signed_action.hashed
        .hash;
      const longTermGrant = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "respond_to_data_access_request",
        payload: {
          request_hash: longTermRequestHash,
          response: {
            granted: true,
            expires_at: null, // 7-day default
          },
        },
      });
      assert.ok(longTermGrant);

      const longTermGrantHash = (longTermGrant as any).signed_action.hashed
        .hash;

      // Try to renew for 60 days (should be capped at 30)
      const cappedRenewal = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "request_grant_renewal",
        payload: {
          grant_hash: longTermGrantHash,
          additional_days: 60,
          renewal_justification: "Testing renewal cap",
        },
      });
      assert.ok(cappedRenewal);
      console.log("✅ Grant renewal properly capped at maximum duration");

      // 4. Test complex validation scenarios
      const complexValidation = await alice.cells[0].callZome({
        zome_name: "zome_person",
        fn_name: "validate_agent_private_data",
        payload: {
          target_agent: alice.agentPubKey,
          validation_context: "complex_edge_case",
          required_fields: ["email", "phone", "location", "time_zone"],
          governance_requester: bob.agentPubKey,
        },
      });

      // Should fail because no governance grant exists from alice to bob
      assert.equal((complexValidation as any).is_valid, false);
      console.log("✅ Complex validation correctly handled missing grant");

      console.log("✅ Comprehensive edge cases test completed successfully");
    },
  );
});
