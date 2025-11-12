import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { ActionHash } from "@holochain/client";

import {
  samplePerson,
  sampleDevice,
  sampleDeviceWithId,
  createPerson,
  registerDeviceForPerson,
  getDevicesForPerson,
  getMyDevices,
  getDeviceInfo,
  updateDeviceActivity,
  deactivateDevice,
  validateDeviceData,
  validateDeviceTimestamps,
  DEVICE_TYPES,
} from "./common";
import { runScenarioWithTwoAgents } from "../utils";

test("should register device with valid data", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Register a device for Lynn
      const deviceInput = sampleDevice(personHash, {
        device_name: "Lynn's iPhone",
        device_type: DEVICE_TYPES.MOBILE,
      });

      const deviceResult = await registerDeviceForPerson(
        lynn.cells[0],
        deviceInput,
      );

      assert.ok(deviceResult);
      assert.ok(deviceResult.signed_action);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify device was registered correctly
      const devices = await getDevicesForPerson(lynn.cells[0], personHash);
      assert.equal(devices.length, 1);

      const device = devices[0];
      assert.isTrue(validateDeviceData(deviceInput, device));
      assert.isTrue(validateDeviceTimestamps(device));
    },
  );
}, 240000);

test("should reject device registration with invalid data", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Try to register device with empty device_id
      let errorThrown = false;
      try {
        await registerDeviceForPerson(lynn.cells[0], {
          device_id: "", // Empty device_id
          device_name: "Test Device",
          device_type: DEVICE_TYPES.MOBILE,
          person_hash: personHash,
        });
      } catch (error) {
        errorThrown = true;
        assert.include((error as Error).message, "Device ID cannot be empty");
      }
      assert.isTrue(errorThrown);

      // Try to register device with empty device_name
      errorThrown = false;
      try {
        await registerDeviceForPerson(lynn.cells[0], {
          device_id: "test_device",
          device_name: "", // Empty device_name
          device_type: DEVICE_TYPES.MOBILE,
          person_hash: personHash,
        });
      } catch (error) {
        errorThrown = true;
        assert.include((error as Error).message, "Device name cannot be empty");
      }
      assert.isTrue(errorThrown);

      // Try to register device with empty device_type
      errorThrown = false;
      try {
        await registerDeviceForPerson(lynn.cells[0], {
          device_id: "test_device",
          device_name: "Test Device",
          device_type: "", // Empty device_type
          person_hash: personHash,
        });
      } catch (error) {
        errorThrown = true;
        assert.include((error as Error).message, "Device type cannot be empty");
      }
      assert.isTrue(errorThrown);
    },
  );
}, 240000);

test("should enforce device type restrictions", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Test valid device types
      const validDeviceTypes = [
        DEVICE_TYPES.MOBILE,
        DEVICE_TYPES.DESKTOP,
        DEVICE_TYPES.TABLET,
        DEVICE_TYPES.WEB,
        DEVICE_TYPES.SERVER,
      ];

      for (const deviceType of validDeviceTypes) {
        const deviceInput = sampleDevice(personHash, {
          device_type: deviceType,
          device_name: `${deviceType} Device`,
        });

        const deviceResult = await registerDeviceForPerson(
          lynn.cells[0],
          deviceInput,
        );
        assert.ok(deviceResult, `Should accept device type: ${deviceType}`);
      }

      // Test invalid device type
      let errorThrown = false;
      try {
        await registerDeviceForPerson(lynn.cells[0], {
          device_id: "invalid_device",
          device_name: "Invalid Device",
          device_type: "invalid_type", // Invalid device type
          person_hash: personHash,
        });
      } catch (error) {
        errorThrown = true;
        assert.include((error as Error).message, "Invalid device type");
      }
      assert.isTrue(errorThrown);
    },
  );
}, 240000);

test("should prevent duplicate device IDs for same person", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Register first device
      const deviceInput1 = sampleDeviceWithId("duplicate_test", personHash, {
        device_name: "First Device",
        device_type: DEVICE_TYPES.MOBILE,
      });

      const deviceResult1 = await registerDeviceForPerson(
        lynn.cells[0],
        deviceInput1,
      );
      assert.ok(deviceResult1);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Try to register second device with same ID
      let errorThrown = false;
      try {
        await registerDeviceForPerson(lynn.cells[0], {
          device_id: "duplicate_test", // Same device_id
          device_name: "Second Device",
          device_type: DEVICE_TYPES.DESKTOP,
          person_hash: personHash,
        });
      } catch (error) {
        errorThrown = true;
        assert.include((error as Error).message, "already exists");
      }
      assert.isTrue(errorThrown);
    },
  );
}, 240000);

test("should allow same device ID for different persons", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Both create persons
      const lynnPerson = await createPerson(
        lynn.cells[0],
        samplePerson({ name: "Lynn" }),
      );
      const bobPerson = await createPerson(
        bob.cells[0],
        samplePerson({ name: "Bob" }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Both register devices with same ID but for different persons
      const sharedDeviceId = "shared_device_id";

      const lynnDeviceInput = sampleDeviceWithId(
        sharedDeviceId,
        lynnPerson.signed_action.hashed.hash,
        {
          device_name: "Lynn's Device",
          device_type: DEVICE_TYPES.MOBILE,
        },
      );

      const bobDeviceInput = sampleDeviceWithId(
        sharedDeviceId,
        bobPerson.signed_action.hashed.hash,
        {
          device_name: "Bob's Device",
          device_type: DEVICE_TYPES.DESKTOP,
        },
      );

      // Both should succeed since they're for different persons
      const lynnDeviceResult = await registerDeviceForPerson(
        lynn.cells[0],
        lynnDeviceInput,
      );
      const bobDeviceResult = await registerDeviceForPerson(
        bob.cells[0],
        bobDeviceInput,
      );

      assert.ok(lynnDeviceResult);
      assert.ok(bobDeviceResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify each person has their own device
      const lynnDevices = await getDevicesForPerson(
        lynn.cells[0],
        lynnPerson.signed_action.hashed.hash,
      );
      const bobDevices = await getDevicesForPerson(
        bob.cells[0],
        bobPerson.signed_action.hashed.hash,
      );

      assert.equal(lynnDevices.length, 1);
      assert.equal(bobDevices.length, 1);
      assert.equal(lynnDevices[0].device_id, sharedDeviceId);
      assert.equal(bobDevices[0].device_id, sharedDeviceId);
      assert.equal(lynnDevices[0].device_name, "Lynn's Device");
      assert.equal(bobDevices[0].device_name, "Bob's Device");
    },
  );
}, 240000);

test("should retrieve device info for specific device ID", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Register a device
      const deviceInput = sampleDeviceWithId("test_device_info", personHash, {
        device_name: "Test Device Info",
        device_type: DEVICE_TYPES.TABLET,
      });

      await registerDeviceForPerson(lynn.cells[0], deviceInput);
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Get device info by ID
      const deviceInfo = await getDeviceInfo(lynn.cells[0], "test_device_info");

      assert.ok(deviceInfo);
      assert.equal(deviceInfo!.device_id, "test_device_info");
      assert.equal(deviceInfo!.device_name, "Test Device Info");
      assert.equal(deviceInfo!.device_type, DEVICE_TYPES.TABLET);
      assert.equal(deviceInfo!.status, "Active");
      assert.isTrue(validateDeviceTimestamps(deviceInfo!));

      // Try to get info for non-existent device
      const nonExistentDevice = await getDeviceInfo(
        lynn.cells[0],
        "non_existent_device",
      );
      assert.isNull(nonExistentDevice);
    },
  );
}, 240000);

test("should update device activity timestamp", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Register a device
      const deviceInput = sampleDeviceWithId(
        "activity_test_device",
        personHash,
        {
          device_name: "Activity Test Device",
          device_type: DEVICE_TYPES.MOBILE,
        },
      );

      await registerDeviceForPerson(lynn.cells[0], deviceInput);
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Get initial device info
      const initialDeviceInfo = await getDeviceInfo(
        lynn.cells[0],
        "activity_test_device",
      );
      assert.ok(initialDeviceInfo);
      const initialLastActive = initialDeviceInfo!.last_active;

      // Wait a moment to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update device activity
      const updateResult = await updateDeviceActivity(
        lynn.cells[0],
        "activity_test_device",
      );
      assert.isTrue(updateResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify timestamp was updated
      const updatedDeviceInfo = await getDeviceInfo(
        lynn.cells[0],
        "activity_test_device",
      );
      assert.ok(updatedDeviceInfo);
      assert.isTrue(updatedDeviceInfo!.last_active > initialLastActive);

      // Try to update activity for non-existent device
      const nonExistentUpdate = await updateDeviceActivity(
        lynn.cells[0],
        "non_existent_device",
      );
      assert.isFalse(nonExistentUpdate);
    },
  );
}, 240000);

test("should deactivate device", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Register a device
      const deviceInput = sampleDeviceWithId(
        "deactivate_test_device",
        personHash,
        {
          device_name: "Deactivate Test Device",
          device_type: DEVICE_TYPES.WEB,
        },
      );

      await registerDeviceForPerson(lynn.cells[0], deviceInput);
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify device is initially active
      const initialDeviceInfo = await getDeviceInfo(
        lynn.cells[0],
        "deactivate_test_device",
      );
      assert.ok(initialDeviceInfo);
      assert.equal(initialDeviceInfo!.status, "Active");

      // Deactivate the device
      const deactivateResult = await deactivateDevice(
        lynn.cells[0],
        "deactivate_test_device",
      );
      assert.isTrue(deactivateResult);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify device is now revoked
      const deactivatedDeviceInfo = await getDeviceInfo(
        lynn.cells[0],
        "deactivate_test_device",
      );
      assert.ok(deactivatedDeviceInfo);
      assert.equal(deactivatedDeviceInfo!.status, "Revoked");

      // Try to deactivate non-existent device
      const nonExistentDeactivation = await deactivateDevice(
        lynn.cells[0],
        "non_existent_device",
      );
      assert.isFalse(nonExistentDeactivation);

      // Try to update activity on deactivated device (should still work for timestamp updates)
      const activityUpdateOnDeactivated = await updateDeviceActivity(
        lynn.cells[0],
        "deactivate_test_device",
      );
      assert.isTrue(activityUpdateOnDeactivated);
    },
  );
}, 240000);

test("should retrieve devices for person", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Lynn creates a person first
      const personInput = samplePerson({ name: "Lynn" });
      const lynnPerson = await createPerson(lynn.cells[0], personInput);
      const personHash = lynnPerson.signed_action.hashed.hash;

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Initially no devices
      let devices = await getDevicesForPerson(lynn.cells[0], personHash);
      assert.equal(devices.length, 0);

      // Register multiple devices
      const device1Input = sampleDeviceWithId("person_device_1", personHash, {
        device_name: "Device 1",
        device_type: DEVICE_TYPES.MOBILE,
      });

      const device2Input = sampleDeviceWithId("person_device_2", personHash, {
        device_name: "Device 2",
        device_type: DEVICE_TYPES.DESKTOP,
      });

      const device3Input = sampleDeviceWithId("person_device_3", personHash, {
        device_name: "Device 3",
        device_type: DEVICE_TYPES.TABLET,
      });

      await registerDeviceForPerson(lynn.cells[0], device1Input);
      await registerDeviceForPerson(lynn.cells[0], device2Input);
      await registerDeviceForPerson(lynn.cells[0], device3Input);

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Should have 3 devices
      devices = await getDevicesForPerson(lynn.cells[0], personHash);
      assert.equal(devices.length, 3);

      // Verify all devices are present and correctly ordered
      const deviceIds = devices.map((d) => d.device_id).sort();
      assert.deepEqual(deviceIds, [
        "person_device_1",
        "person_device_2",
        "person_device_3",
      ]);

      // Verify device details
      const device1 = devices.find((d) => d.device_id === "person_device_1")!;
      const device2 = devices.find((d) => d.device_id === "person_device_2")!;
      const device3 = devices.find((d) => d.device_id === "person_device_3")!;

      assert.isTrue(validateDeviceData(device1Input, device1));
      assert.isTrue(validateDeviceData(device2Input, device2));
      assert.isTrue(validateDeviceData(device3Input, device3));
    },
  );
}, 240000);

test("should get my devices for current agent", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Both create persons
      const lynnPerson = await createPerson(
        lynn.cells[0],
        samplePerson({ name: "Lynn" }),
      );
      const bobPerson = await createPerson(
        bob.cells[0],
        samplePerson({ name: "Bob" }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Initially no devices
      let lynnDevices = await getMyDevices(lynn.cells[0]);
      let bobDevices = await getMyDevices(bob.cells[0]);
      assert.equal(lynnDevices.length, 0);
      assert.equal(bobDevices.length, 0);

      // Register devices for Lynn
      await registerDeviceForPerson(
        lynn.cells[0],
        sampleDeviceWithId(
          "lynn_device_1",
          lynnPerson.signed_action.hashed.hash,
        ),
      );
      await registerDeviceForPerson(
        lynn.cells[0],
        sampleDeviceWithId(
          "lynn_device_2",
          lynnPerson.signed_action.hashed.hash,
        ),
      );

      // Register device for Bob
      await registerDeviceForPerson(
        bob.cells[0],
        sampleDeviceWithId("bob_device_1", bobPerson.signed_action.hashed.hash),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Check devices
      lynnDevices = await getMyDevices(lynn.cells[0]);
      bobDevices = await getMyDevices(bob.cells[0]);

      assert.equal(lynnDevices.length, 2);
      assert.equal(bobDevices.length, 1);

      const lynnDeviceIds = lynnDevices.map((d) => d.device_id).sort();
      const bobDeviceIds = bobDevices.map((d) => d.device_id);

      assert.deepEqual(lynnDeviceIds, ["lynn_device_1", "lynn_device_2"]);
      assert.deepEqual(bobDeviceIds, ["bob_device_1"]);
    },
  );
}, 240000);
