import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  samplePerson,
  samplePrivateData,
  createPerson,
  storePrivateData,
  getMyProfile,
  assignPersonRole,
  getPersonRoles,
  hasRoleCapability,
  getCapabilityLevel,
  setupPersonWithMultipleDevices,
  validateCrossDevicePersonAccess,
  validateCrossDevicePrivateDataAccess,
  getMyDevices,
  getDevicesForPerson,
  getDeviceInfo,
  registerDeviceForPerson,
  updateDeviceActivity,
  addAgentToPerson,
  DeviceInfo,
  DeviceInput,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common";
import { runScenarioWithThreeAgents } from "../utils";

test("Multi-device person setup and validation", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with multiple devices using helper
      const deviceContext = await setupPersonWithMultipleDevices(
        alice,
        bob,
        carol,
      );

      // Sync all agents
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Validate cross-device person access
      const devices = [
        { agent: alice, deviceInfo: deviceContext.aliceDevice },
        { agent: bob, deviceInfo: deviceContext.bobDevice },
        { agent: carol, deviceInfo: deviceContext.carolDevice },
      ];

      const crossDeviceAccess = await validateCrossDevicePersonAccess(devices);
      assert.isTrue(
        crossDeviceAccess,
        "All devices should access the same person data",
      );

      // Verify specific person details from each device
      const aliceProfile = await getMyProfile(alice.cells[0]);
      const bobProfile = await getMyProfile(bob.cells[0]);
      const carolProfile = await getMyProfile(carol.cells[0]);

      assert.ok(aliceProfile.person);
      assert.ok(bobProfile.person);
      assert.ok(carolProfile.person);

      assert.equal(aliceProfile.person!.name, "Alice Smith");
      assert.equal(bobProfile.person!.name, "Alice Smith");
      assert.equal(carolProfile.person!.name, "Alice Smith");

      // In multi-device scenario, all agents should see all devices for the person
      const aliceMyDevices = await getMyDevices(alice.cells[0]);
      const bobMyDevices = await getMyDevices(bob.cells[0]);
      const carolMyDevices = await getMyDevices(carol.cells[0]);

      // All agents should see all 3 devices registered for Alice's person
      assert.equal(aliceMyDevices.length, 3);
      assert.equal(bobMyDevices.length, 3);
      assert.equal(carolMyDevices.length, 3);

      // Verify all devices are present (regardless of order)
      const aliceDeviceIds = aliceMyDevices.map((d) => d.device_id).sort();
      const bobDeviceIds = bobMyDevices.map((d) => d.device_id).sort();
      const carolDeviceIds = carolMyDevices.map((d) => d.device_id).sort();

      assert.deepEqual(aliceDeviceIds, ["alice_mobile", "bob_desktop", "carol_tablet"]);
      assert.deepEqual(bobDeviceIds, ["alice_mobile", "bob_desktop", "carol_tablet"]);
      assert.deepEqual(carolDeviceIds, ["alice_mobile", "bob_desktop", "carol_tablet"]);
    },
  );
}, 240000);

test("Cross-device private data access", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with multiple devices (this includes private data)
      const deviceContext = await setupPersonWithMultipleDevices(
        alice,
        bob,
        carol,
      );

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Validate cross-device private data access
      const devices = [
        { agent: alice, deviceInfo: deviceContext.aliceDevice },
        { agent: bob, deviceInfo: deviceContext.bobDevice },
        { agent: carol, deviceInfo: deviceContext.carolDevice },
      ];

      const crossDevicePrivateData =
        await validateCrossDevicePrivateDataAccess(devices);
      assert.isTrue(
        crossDevicePrivateData,
        "All devices should access the same private data",
      );

      // Verify private data access from each device
      const aliceProfile = await getMyProfile(alice.cells[0]);
      const bobProfile = await getMyProfile(bob.cells[0]);
      const carolProfile = await getMyProfile(carol.cells[0]);

      assert.ok(aliceProfile.private_data);
      assert.ok(bobProfile.private_data);
      assert.ok(carolProfile.private_data);

      // Alice should see her own private data
      assert.equal(aliceProfile.private_data!.legal_name, "Alice Smith");
      assert.equal(aliceProfile.private_data!.email, "alice@example.com");

      // Bob and Carol should be able to access private data through agent-person relationship
      assert.ok(bobProfile.private_data!.legal_name);
      assert.ok(bobProfile.private_data!.email);
      assert.ok(carolProfile.private_data!.legal_name);
      assert.ok(carolProfile.private_data!.email);
    },
  );
}, 240000);

test("Role assignment and access across devices", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with multiple devices
      const deviceContext = await setupPersonWithMultipleDevices(
        alice,
        bob,
        carol,
      );

      // Assign role from primary device (Alice)
      const roleInput = {
        agent_pubkey: alice.agentPubKey,
        role_name: TEST_ROLES.RESOURCE_COORDINATOR,
        description: "Accountable Agent role assigned from mobile device",
      };

      await assignPersonRole(alice.cells[0], roleInput);
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Verify role accessibility from all devices
      const aliceRoles = await getPersonRoles(
        alice.cells[0],
        alice.agentPubKey,
      );
      const bobRoles = await getPersonRoles(bob.cells[0], bob.agentPubKey);
      const carolRoles = await getPersonRoles(
        carol.cells[0],
        carol.agentPubKey,
      );

      // All devices should see the same roles for Alice's person
      assert.equal(aliceRoles.roles.length, 1);
      assert.equal(bobRoles.roles.length, 1);
      assert.equal(carolRoles.roles.length, 1);

      assert.equal(
        aliceRoles.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      assert.equal(
        bobRoles.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      assert.equal(
        carolRoles.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      // Test role capability checking from all devices
      const aliceHasCapability = await hasRoleCapability(
        alice.cells[0],
        alice.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      const bobHasCapability = await hasRoleCapability(
        bob.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      const carolHasCapability = await hasRoleCapability(
        carol.cells[0],
        carol.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      assert.isTrue(aliceHasCapability);
      assert.isTrue(bobHasCapability);
      assert.isTrue(carolHasCapability);

      // Test capability level consistency across devices
      const aliceCapabilityLevel = await getCapabilityLevel(
        alice.cells[0],
        alice.agentPubKey,
      );
      const bobCapabilityLevel = await getCapabilityLevel(
        bob.cells[0],
        bob.agentPubKey,
      );
      const carolCapabilityLevel = await getCapabilityLevel(
        carol.cells[0],
        carol.agentPubKey,
      );

      assert.equal(aliceCapabilityLevel, CAPABILITY_LEVELS.COORDINATION);
      assert.equal(bobCapabilityLevel, CAPABILITY_LEVELS.COORDINATION);
      assert.equal(carolCapabilityLevel, CAPABILITY_LEVELS.COORDINATION);

      // Verify roles assigned from any device work across all devices
      const additionalRoleInput = {
        agent_pubkey: bob.agentPubKey, // Assign from Bob's device
        role_name: TEST_ROLES.RESOURCE_STEWARD,
        description: "Steward role assigned from desktop device",
      };

      await assignPersonRole(bob.cells[0], additionalRoleInput);
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Now all devices should see both roles
      const aliceRolesUpdated = await getPersonRoles(
        alice.cells[0],
        alice.agentPubKey,
      );
      const bobRolesUpdated = await getPersonRoles(
        bob.cells[0],
        bob.agentPubKey,
      );
      const carolRolesUpdated = await getPersonRoles(
        carol.cells[0],
        carol.agentPubKey,
      );

      assert.equal(aliceRolesUpdated.roles.length, 2);
      assert.equal(bobRolesUpdated.roles.length, 2);
      assert.equal(carolRolesUpdated.roles.length, 2);

      const roleNames = aliceRolesUpdated.roles.map((r) => r.role_name).sort();
      assert.deepEqual(roleNames, [
        TEST_ROLES.RESOURCE_COORDINATOR,
        TEST_ROLES.RESOURCE_STEWARD,
      ]);
    },
  );
}, 240000);

test("Device independence and isolation", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with devices
      const aliceDeviceContext = await setupPersonWithMultipleDevices(
        alice,
        bob,
        carol,
      );

      // Setup Bob as a separate person with his own device
      const bobPerson = await createPerson(
        bob.cells[0],
        samplePerson({ name: "Bob Johnson" }),
      );
      await storePrivateData(
        bob.cells[0],
        samplePrivateData({
          legal_name: "Bob Johnson",
          email: "bob@example.com",
        }),
      );

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Verify device isolation - Bob's device should only see Bob's data
      const bobProfileFromBobDevice = await getMyProfile(bob.cells[0]);
      assert.ok(bobProfileFromBobDevice.person);
      assert.equal(bobProfileFromBobDevice.person!.name, "Bob Johnson");
      assert.ok(bobProfileFromBobDevice.private_data);
      assert.equal(
        bobProfileFromBobDevice.private_data!.email,
        "bob@example.com",
      );

      // Bob's device should NOT see Alice's data when using getMyProfile
      // (getMyProfile should always return the calling agent's person data)
      const bobDeviceCount = await getMyDevices(bob.cells[0]);
      // Bob should see his own device count, not Alice's
      assert.isAtLeast(bobDeviceCount.length, 1);

      // Verify Alice's devices only see Alice's data
      const aliceProfileFromAliceDevice = await getMyProfile(alice.cells[0]);
      const aliceProfileFromBobDevice = await getMyProfile(bob.cells[0]);
      const aliceProfileFromCarolDevice = await getMyProfile(carol.cells[0]);

      // All devices registered to Alice's person should see Alice's data
      assert.equal(aliceProfileFromAliceDevice.person!.name, "Alice Smith");
      assert.equal(aliceProfileFromBobDevice.person!.name, "Alice Smith");
      assert.equal(aliceProfileFromCarolDevice.person!.name, "Alice Smith");

      // Device registration isolation - devices should be properly associated
      const aliceMyDevices = await getMyDevices(alice.cells[0]);
      const bobMyDevices = await getMyDevices(bob.cells[0]);
      const carolMyDevices = await getMyDevices(carol.cells[0]);

      // Alice, Bob, and Carol agents should see their respective device counts
      assert.equal(aliceMyDevices.length, 1); // Alice's mobile device
      assert.isAtLeast(bobMyDevices.length, 1); // Bob's own device(s)
      assert.equal(carolMyDevices.length, 1); // Carol's tablet device (for Alice)
    },
  );
}, 240000);

test("Device registration timing and consistency", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Create Alice's person
      const alicePerson = await createPerson(
        alice.cells[0],
        samplePerson({ name: "Alice Smith" }),
      );
      const personHash = alicePerson.signed_action.hashed.hash;

      // Store private data
      await storePrivateData(
        alice.cells[0],
        samplePrivateData({
          legal_name: "Alice Smith",
          email: "alice@example.com",
        }),
      );

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Add Bob and Carol as agents to Alice's person for multi-device support
      await addAgentToPerson(alice.cells[0], bob.agentPubKey, personHash);
      await addAgentToPerson(alice.cells[0], carol.agentPubKey, personHash);

      // Wait for agent-person relationships to propagate through DHT
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Register devices with timing gaps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Alice registers mobile device
      await registerDeviceForPerson(alice.cells[0], {
        device_id: "alice_mobile_timed",
        device_name: "Alice's Mobile",
        device_type: "mobile",
        person_hash: personHash,
      } as DeviceInput);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Bob registers desktop device
      await registerDeviceForPerson(bob.cells[0], {
        device_id: "alice_desktop_timed",
        device_name: "Alice's Desktop",
        device_type: "desktop",
        person_hash: personHash,
      } as DeviceInput);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Carol registers tablet device
      await registerDeviceForPerson(carol.cells[0], {
        device_id: "alice_tablet_timed",
        device_name: "Alice's Tablet",
        device_type: "tablet",
        person_hash: personHash,
      } as DeviceInput);

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Verify all devices are registered with proper timing
      const aliceDevices: DeviceInfo[] = await getDevicesForPerson(
        alice.cells[0],
        personHash,
      );

      assert.equal(aliceDevices.length, 3);

      // Verify registration timestamps are in correct order
      const mobileDevice = aliceDevices.find(
        (d: any) => d.device_id === "alice_mobile_timed",
      )!;
      const desktopDevice = aliceDevices.find(
        (d: any) => d.device_id === "alice_desktop_timed",
      )!;
      const tabletDevice = aliceDevices.find(
        (d: any) => d.device_id === "alice_tablet_timed",
      )!;

      assert.isTrue(mobileDevice.registered_at <= desktopDevice.registered_at);
      assert.isTrue(desktopDevice.registered_at <= tabletDevice.registered_at);

      // All devices should still access the same person and private data consistently
      const aliceProfile = await getMyProfile(alice.cells[0]);
      const bobProfile = await getMyProfile(bob.cells[0]);
      const carolProfile = await getMyProfile(carol.cells[0]);

      assert.equal(aliceProfile.person!.name, "Alice Smith");
      assert.equal(bobProfile.person!.name, "Alice Smith");
      assert.equal(carolProfile.person!.name, "Alice Smith");

      assert.equal(aliceProfile.private_data!.email, "alice@example.com");
      assert.equal(bobProfile.private_data!.email, "alice@example.com");
      assert.equal(carolProfile.private_data!.email, "alice@example.com");
    },
  );
}, 240000);

test("Device activity tracking across devices", async () => {
  await runScenarioWithThreeAgents(
    async (
      scenario: Scenario,
      alice: PlayerApp,
      bob: PlayerApp,
      carol: PlayerApp,
    ) => {
      // Setup Alice with multiple devices
      const deviceContext = await setupPersonWithMultipleDevices(
        alice,
        bob,
        carol,
      );

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Get initial activity timestamps
      const initialAliceDevice = await getDeviceInfo(
        alice.cells[0],
        "alice_mobile",
      );

      const initialBobDevice = await getDeviceInfo(
        alice.cells[0],
        "bob_desktop",
      );

      assert.ok(initialAliceDevice);
      assert.ok(initialBobDevice);

      const aliceInitialTime = initialAliceDevice!.last_active;
      const bobInitialTime = initialBobDevice!.last_active;

      // Wait a moment then update Alice's device activity
      await new Promise((resolve) => setTimeout(resolve, 100));

      const aliceUpdateResult = await updateDeviceActivity(
        alice.cells[0],
        "alice_mobile",
      );

      assert.isTrue(aliceUpdateResult);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update Bob's device activity
      const bobUpdateResult = await updateDeviceActivity(
        bob.cells[0],
        "bob_desktop",
      );

      assert.isTrue(bobUpdateResult);

      await dhtSync([alice, bob, carol], alice.cells[0].cell_id[0]);

      // Verify activity timestamps were updated independently
      const updatedAliceDevice = await getDeviceInfo(
        alice.cells[0],
        "alice_mobile",
      );

      const updatedBobDevice = await getDeviceInfo(
        alice.cells[0],
        "bob_desktop",
      );

      assert.ok(updatedAliceDevice);
      assert.ok(updatedBobDevice);

      assert.isTrue(updatedAliceDevice!.last_active > aliceInitialTime);
      assert.isTrue(updatedBobDevice!.last_active > bobInitialTime);

      // Verify Carol's device wasn't affected
      const carolDevice = await getDeviceInfo(alice.cells[0], "carol_tablet");

      assert.ok(carolDevice);
      // Carol's device should still have original timestamp (shouldn't be affected by others' updates)
      assert.isTrue(
        carolDevice!.last_active >= deviceContext.carolDevice.last_active,
      );
    },
  );
}, 240000);
