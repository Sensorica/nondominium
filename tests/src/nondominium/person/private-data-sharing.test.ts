import { assert, test } from "vitest";
import { runScenario, dhtSync, CallableCell } from "@holochain/tryorama";
import {
  samplePerson,
  samplePrivateData,
  createPerson,
  storePrivateData,
} from "./common.js";

test("private data sharing workflow for custodianship transfer", async () => {
  await runScenario(async (scenario) => {
    // Set up the app
    const [alice, bob] = await scenario.addPlayersWithApps([
      { appName: "nondominium" },
      { appName: "nondominium" },
    ]);

    await scenario.shareAllAgents();

    // Create persons for both agents
    console.log("Setting up personas...");

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
      payload: {},
    });
    assert.ok(Array.isArray(pendingRequests));
    assert.equal(pendingRequests.length, 1);
    assert.equal(pendingRequests[0].requested_by, bob.agentPubKey);
    assert.equal(pendingRequests[0].context, "custodian_transfer_simulation");
    console.log("Alice sees pending request:", pendingRequests[0]);

    // 3. Alice approves the request
    const requestHash = (dataRequest as any).signed_action.hashed.hash;
    const grantResponse = await alice.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "respond_to_data_request",
      payload: {
        request_hash: requestHash,
        approve: true,
        duration_days: 3, // Grant access for 3 days
      },
    });
    assert.ok(grantResponse);
    console.log("Alice approved the request and created grant:", grantResponse);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // 4. Bob retrieves Alice's shared contact information
    const sharedData = await bob.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "get_granted_private_data",
      payload: alice.agentPubKey,
    });
    assert.ok(sharedData);
    assert.equal(sharedData.granted_by, alice.agentPubKey);
    assert.equal(sharedData.context, "custodian_transfer_simulation");

    // Verify only granted fields are accessible
    assert.ok(sharedData.fields.email);
    assert.equal(sharedData.fields.email, "alice.custodian@example.com");
    assert.ok(sharedData.fields.phone);
    assert.equal(sharedData.fields.phone, "+1-555-111-2222");
    assert.ok(sharedData.fields.location);
    assert.equal(sharedData.fields.location, "Seattle, WA");
    assert.ok(sharedData.fields.time_zone);
    assert.equal(sharedData.fields.time_zone, "America/Los_Angeles");

    // Verify sensitive fields are NOT accessible
    assert.ok(!sharedData.fields.legal_name);
    assert.ok(!sharedData.fields.address);

    console.log(
      "Bob successfully retrieved Alice's contact info:",
      sharedData.fields,
    );

    // 5. Verify Alice can see her active grants
    const aliceGrants = await alice.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "get_my_data_grants",
      payload: {},
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
    const revokedData = await bob.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "get_granted_private_data",
      payload: alice.agentPubKey,
    });
    assert.equal(revokedData, null);
    console.log("Data access successfully revoked");

    console.log("✅ Private data sharing workflow test completed successfully");
  });
});

test("direct data access grant without request", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appName: "nondominium" },
      { appName: "nondominium" },
    ]);

    await scenario.shareAllAgents();

    // Set up profiles
    await createPerson(alice.cells[0], samplePerson({ name: "Alice Granter" }));
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

    // Alice directly grants access to Bob
    const directGrant = await alice.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "grant_private_data_access",
      payload: {
        granted_to: bob.agentPubKey,
        fields_granted: ["email", "phone"],
        context: "direct_coordination",
        resource_hash: null,
        duration_days: 1,
      },
    });
    assert.ok(directGrant);
    console.log("Direct grant created:", directGrant);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob can access the granted data
    const grantedData = await bob.cells[0].callZome({
      zome_name: "zome_person",
      fn_name: "get_granted_private_data",
      payload: alice.agentPubKey,
    });
    assert.ok(grantedData);
    assert.equal(grantedData.fields.email, "alice@example.com");
    assert.equal(grantedData.fields.phone, "+1-555-999-8888");
    console.log("Bob accessed directly granted data:", grantedData.fields);

    console.log("✅ Direct grant workflow test completed successfully");
  });
});

test("data access validation and security", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appName: "nondominium" },
      { appName: "nondominium" },
    ]);

    await scenario.shareAllAgents();

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
  });
});
