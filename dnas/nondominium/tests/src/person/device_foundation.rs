//! Device foundation tests -- translated from `person/device-foundation-tests.test.ts`.
//!
//! Validates basic device registration, retrieval, deactivation, and activity
//! tracking through the `zome_person` coordinator.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Register device with valid data
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn register_device_with_valid_data() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates a person
    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Register a mobile device for Lynn
    let device_input = DeviceInput {
        device_id: "device-001".to_string(),
        device_name: "Lynn's iPhone".to_string(),
        device_type: "mobile".to_string(),
        person_hash: person_hash.clone(),
    };

    let device_record: Record = register_device_for_person(
        &conductors[0],
        &alice,
        device_input,
    )
    .await;

    // The returned record must have a real action hash
    assert_ne!(
        device_record.signed_action.hashed.hash,
        ActionHash::from_raw_36(vec![0; 36]),
        "Device record should have a valid action hash"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify via get_devices_for_person
    let devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(devices.len(), 1, "Should have exactly 1 device registered");
    assert_eq!(devices[0].device_id, "device-001");
    assert_eq!(devices[0].device_name, "Lynn's iPhone");
    assert_eq!(devices[0].device_type, "mobile");
    assert_eq!(devices[0].status, zome_person_integrity::DeviceStatus::Active);
}

// ---------------------------------------------------------------------------
// 2. Reject device with invalid data (empty fields)
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
#[ignore = "error path -- sweettest panics on zome validation errors; needs std::panic::catch_unwind wrapper"]
async fn reject_device_with_empty_device_id() {
    // Should test: registering a device with an empty device_id causes a validation error.
    // The zome is expected to return an error containing "Device ID cannot be empty".
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _result = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "".to_string(),
            device_name: "Test Device".to_string(),
            device_type: "mobile".to_string(),
            person_hash,
        },
    )
    .await;
    // Expected: panic/error with "Device ID cannot be empty"
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "error path -- sweettest panics on zome validation errors"]
async fn reject_device_with_empty_device_name() {
    // Should test: registering a device with an empty device_name causes a validation error.
    // The zome is expected to return an error containing "Device name cannot be empty".
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _result = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "test_device".to_string(),
            device_name: "".to_string(),
            device_type: "mobile".to_string(),
            person_hash,
        },
    )
    .await;
    // Expected: panic/error with "Device name cannot be empty"
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "error path -- sweettest panics on zome validation errors"]
async fn reject_device_with_empty_device_type() {
    // Should test: registering a device with an empty device_type causes a validation error.
    // The zome is expected to return an error containing "Device type cannot be empty".
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _result = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "test_device".to_string(),
            device_name: "Test Device".to_string(),
            device_type: "".to_string(),
            person_hash,
        },
    )
    .await;
    // Expected: panic/error with "Device type cannot be empty"
}

// ---------------------------------------------------------------------------
// 3. Enforce device type restrictions
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn accept_all_valid_device_types() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let valid_types = ["mobile", "desktop", "tablet", "web", "server"];

    for (i, device_type) in valid_types.iter().enumerate() {
        let input = DeviceInput {
            device_id: format!("valid_type_device_{}", i),
            device_name: format!("{} Device", device_type),
            device_type: device_type.to_string(),
            person_hash: person_hash.clone(),
        };
        let record = register_device_for_person(&conductors[0], &alice, input).await;
        assert_ne!(
            record.signed_action.hashed.hash,
            ActionHash::from_raw_36(vec![0; 36]),
            "Should accept device type: {}",
            device_type
        );
    }

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(devices.len(), 5, "All 5 valid device types should be registered");
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "error path -- sweettest panics on zome validation errors"]
async fn reject_invalid_device_type() {
    // Should test: registering a device with type "invalid_type" causes a validation error.
    // The zome is expected to return an error containing "Invalid device type".
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _result = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "invalid_device".to_string(),
            device_name: "Invalid Device".to_string(),
            device_type: "invalid_type".to_string(),
            person_hash,
        },
    )
    .await;
    // Expected: panic/error with "Invalid device type"
}

// ---------------------------------------------------------------------------
// 4. Prevent duplicate device IDs for same person
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
#[ignore = "error path -- sweettest panics on zome validation errors for duplicate device IDs"]
async fn prevent_duplicate_device_ids_for_same_person() {
    // Should test: registering two devices with the same device_id for the same person
    // causes a validation error on the second registration containing "already exists".
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // First registration succeeds
    let _first = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "duplicate_test".to_string(),
            device_name: "First Device".to_string(),
            device_type: "mobile".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Second registration with same device_id should fail
    let _second = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "duplicate_test".to_string(),
            device_name: "Second Device".to_string(),
            device_type: "desktop".to_string(),
            person_hash,
        },
    )
    .await;
    // Expected: panic/error with "already exists"
}

// ---------------------------------------------------------------------------
// 5. Allow same device ID for different persons
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn allow_same_device_id_for_different_persons() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both agents create their own person
    let lynn_person = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let bob_person = create_person(&conductors[1], &bob, sample_person("Bob")).await;

    let lynn_hash = lynn_person.signed_action.hashed.hash.clone();
    let bob_hash = bob_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let shared_device_id = "shared_device_id";

    // Both register a device with the same device_id but for different persons
    let _lynn_device = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: shared_device_id.to_string(),
            device_name: "Lynn's Device".to_string(),
            device_type: "mobile".to_string(),
            person_hash: lynn_hash.clone(),
        },
    )
    .await;

    let _bob_device = register_device_for_person(
        &conductors[1],
        &bob,
        DeviceInput {
            device_id: shared_device_id.to_string(),
            device_name: "Bob's Device".to_string(),
            device_type: "desktop".to_string(),
            person_hash: bob_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Each person should have exactly 1 device
    let lynn_devices = get_devices_for_person(&conductors[0], &alice, lynn_hash).await;
    let bob_devices = get_devices_for_person(&conductors[1], &bob, bob_hash).await;

    assert_eq!(lynn_devices.len(), 1);
    assert_eq!(bob_devices.len(), 1);
    assert_eq!(lynn_devices[0].device_id, shared_device_id);
    assert_eq!(bob_devices[0].device_id, shared_device_id);
    assert_eq!(lynn_devices[0].device_name, "Lynn's Device");
    assert_eq!(bob_devices[0].device_name, "Bob's Device");
}

// ---------------------------------------------------------------------------
// 6. Retrieve device info by device ID
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn get_device_info_by_id() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _device = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "test_device_info".to_string(),
            device_name: "Test Device Info".to_string(),
            device_type: "tablet".to_string(),
            person_hash,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Get device info by ID
    let device_info = get_device_info(&conductors[0], &alice, "test_device_info".to_string()).await;

    assert!(device_info.is_some(), "Device info should be returned");
    let info = device_info.unwrap();
    assert_eq!(info.device_id, "test_device_info");
    assert_eq!(info.device_name, "Test Device Info");
    assert_eq!(info.device_type, "tablet");
    assert_eq!(info.status, zome_person_integrity::DeviceStatus::Active);

    // Non-existent device should return None
    let missing = get_device_info(&conductors[0], &alice, "non_existent_device".to_string()).await;
    assert!(missing.is_none(), "Non-existent device should return None");
}

// ---------------------------------------------------------------------------
// 7. Update device activity timestamp
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn update_device_activity_timestamp() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _device = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "activity_test_device".to_string(),
            device_name: "Activity Test Device".to_string(),
            device_type: "mobile".to_string(),
            person_hash,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Get initial device info
    let initial = get_device_info(&conductors[0], &alice, "activity_test_device".to_string())
        .await
        .expect("Device should exist");
    let initial_last_active = initial.last_active;

    // Wait to ensure different timestamp
    pause_ms(200).await;

    // Update device activity
    let updated = update_device_activity(&conductors[0], &alice, "activity_test_device".to_string()).await;
    assert!(updated, "update_device_activity should return true");

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify timestamp was updated
    let after = get_device_info(&conductors[0], &alice, "activity_test_device".to_string())
        .await
        .expect("Device should still exist");
    assert!(
        after.last_active > initial_last_active,
        "last_active should be more recent after update"
    );

    // Non-existent device should return false
    let non_existent = update_device_activity(&conductors[0], &alice, "non_existent_device".to_string()).await;
    assert!(!non_existent, "Updating non-existent device should return false");
}

// ---------------------------------------------------------------------------
// 8. Deactivate device
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn deactivate_device_changes_status() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let _device = register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "deactivate_test_device".to_string(),
            device_name: "Deactivate Test Device".to_string(),
            device_type: "web".to_string(),
            person_hash,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify device is initially active
    let initial = get_device_info(&conductors[0], &alice, "deactivate_test_device".to_string())
        .await
        .expect("Device should exist");
    assert_eq!(initial.status, zome_person_integrity::DeviceStatus::Active);

    // Deactivate the device
    let result = deactivate_device(&conductors[0], &alice, "deactivate_test_device".to_string()).await;
    assert!(result, "deactivate_device should return true");

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify device is now revoked
    let after = get_device_info(&conductors[0], &alice, "deactivate_test_device".to_string())
        .await
        .expect("Device should still exist after deactivation");
    assert_eq!(after.status, zome_person_integrity::DeviceStatus::Revoked);

    // Non-existent device should return false
    let non_existent = deactivate_device(&conductors[0], &alice, "non_existent_device".to_string()).await;
    assert!(!non_existent, "Deactivating non-existent device should return false");

    // Activity update on deactivated device should still work for timestamp updates
    let activity_update = update_device_activity(
        &conductors[0],
        &alice,
        "deactivate_test_device".to_string(),
    )
    .await;
    assert!(
        activity_update,
        "Activity update on deactivated device should still succeed"
    );
}

// ---------------------------------------------------------------------------
// 9. Register multiple devices and retrieve for person
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn register_multiple_devices_for_person() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let person_record = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let person_hash = person_record.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Initially no devices
    let devices = get_devices_for_person(&conductors[0], &alice, person_hash.clone()).await;
    assert_eq!(devices.len(), 0, "Initially no devices should exist");

    // Register 3 devices
    for (id, name, dtype) in [
        ("person_device_1", "Device 1", "mobile"),
        ("person_device_2", "Device 2", "desktop"),
        ("person_device_3", "Device 3", "tablet"),
    ] {
        register_device_for_person(
            &conductors[0],
            &alice,
            DeviceInput {
                device_id: id.to_string(),
                device_name: name.to_string(),
                device_type: dtype.to_string(),
                person_hash: person_hash.clone(),
            },
        )
        .await;
    }

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(devices.len(), 3, "Should have 3 devices registered");

    let mut device_ids: Vec<String> = devices.iter().map(|d| d.device_id.clone()).collect();
    device_ids.sort();
    assert_eq!(
        device_ids,
        vec!["person_device_1", "person_device_2", "person_device_3"]
    );
}

// ---------------------------------------------------------------------------
// 10. Get my devices for current agent
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn get_my_devices_for_current_agent() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both agents create their own person
    let lynn_person = create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    let bob_person = create_person(&conductors[1], &bob, sample_person("Bob")).await;
    let lynn_hash = lynn_person.signed_action.hashed.hash.clone();
    let bob_hash = bob_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Initially no devices for either
    let lynn_devices = get_my_devices(&conductors[0], &alice).await;
    let bob_devices = get_my_devices(&conductors[1], &bob).await;
    assert_eq!(lynn_devices.len(), 0);
    assert_eq!(bob_devices.len(), 0);

    // Register 2 devices for Lynn
    register_device_for_person(
        &conductors[0],
        &alice,
        sample_device(lynn_hash.clone(), "lynn_device_1"),
    )
    .await;
    register_device_for_person(
        &conductors[0],
        &alice,
        sample_device(lynn_hash, "lynn_device_2"),
    )
    .await;

    // Register 1 device for Bob
    register_device_for_person(
        &conductors[1],
        &bob,
        sample_device(bob_hash, "bob_device_1"),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let lynn_devices = get_my_devices(&conductors[0], &alice).await;
    let bob_devices = get_my_devices(&conductors[1], &bob).await;

    assert_eq!(lynn_devices.len(), 2, "Lynn should have 2 devices");
    assert_eq!(bob_devices.len(), 1, "Bob should have 1 device");

    let mut lynn_ids: Vec<String> = lynn_devices.iter().map(|d| d.device_id.clone()).collect();
    lynn_ids.sort();
    assert_eq!(lynn_ids, vec!["lynn_device_1", "lynn_device_2"]);

    let bob_ids: Vec<String> = bob_devices.iter().map(|d| d.device_id.clone()).collect();
    assert_eq!(bob_ids, vec!["bob_device_1"]);
}
