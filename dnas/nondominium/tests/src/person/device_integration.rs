//! Device integration tests -- translated from `person/device-integration-tests.test.ts`.
//!
//! Validates multi-agent device interactions: cross-agent device discovery,
//! DHT visibility, device activity tracking, and profile consistency.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Multi-device person setup and validation (3 agents)
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multi_device_person_setup_and_cross_agent_discovery() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Alice creates a person
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Add Bob and Carol as agents to Alice's person for multi-device support
    let bob_added = add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    assert!(bob_added, "Bob should be added as an agent to Alice's person");

    let carol_added = add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;
    assert!(carol_added, "Carol should be added as an agent to Alice's person");

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Each agent registers a device for Alice's person
    register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "alice_mobile".to_string(),
            device_name: "Alice's Mobile".to_string(),
            device_type: "mobile".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    register_device_for_person(
        &conductors[1],
        &bob,
        DeviceInput {
            device_id: "bob_desktop".to_string(),
            device_name: "Bob's Desktop".to_string(),
            device_type: "desktop".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    register_device_for_person(
        &conductors[2],
        &carol,
        DeviceInput {
            device_id: "carol_tablet".to_string(),
            device_name: "Carol's Tablet".to_string(),
            device_type: "tablet".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Each agent should see only their own device via get_my_devices
    let alice_my = get_my_devices(&conductors[0], &alice).await;
    let bob_my = get_my_devices(&conductors[1], &bob).await;
    let carol_my = get_my_devices(&conductors[2], &carol).await;

    assert_eq!(alice_my.len(), 1, "Alice should see 1 device via get_my_devices");
    assert_eq!(bob_my.len(), 1, "Bob should see 1 device via get_my_devices");
    assert_eq!(carol_my.len(), 1, "Carol should see 1 device via get_my_devices");

    assert_eq!(alice_my[0].device_id, "alice_mobile");
    assert_eq!(bob_my[0].device_id, "bob_desktop");
    assert_eq!(carol_my[0].device_id, "carol_tablet");

    // But get_devices_for_person should show all 3 devices
    let all_devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(
        all_devices.len(),
        3,
        "get_devices_for_person should return all 3 devices"
    );
}

// ---------------------------------------------------------------------------
// 2. Role assignment and capability verification across devices
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn role_assignment_visible_across_all_agent_devices() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Alice creates a person
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Add Bob and Carol as agents
    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Assign role from Alice's device
    assign_person_role(
        &conductors[0],
        &alice,
        PersonRoleInput {
            agent_pubkey: alice.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_COORDINATOR.to_string(),
            description: Some("Accountable Agent role assigned from mobile device".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // All agents should see the role
    let alice_roles = get_person_roles(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let bob_roles = get_person_roles(&conductors[1], &bob, bob.agent_pubkey().clone()).await;
    let carol_roles = get_person_roles(&conductors[2], &carol, carol.agent_pubkey().clone()).await;

    assert_eq!(alice_roles.roles.len(), 1, "Alice should see 1 role");
    assert_eq!(bob_roles.roles.len(), 1, "Bob should see 1 role");
    assert_eq!(carol_roles.roles.len(), 1, "Carol should see 1 role");

    assert_eq!(alice_roles.roles[0].role_name, ROLE_RESOURCE_COORDINATOR);

    // All agents should have the capability
    let alice_has = has_person_role_capability(
        &conductors[0],
        &alice,
        alice.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    let bob_has = has_person_role_capability(
        &conductors[1],
        &bob,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    let carol_has = has_person_role_capability(
        &conductors[2],
        &carol,
        carol.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;

    assert!(alice_has, "Alice should have the capability");
    assert!(bob_has, "Bob should have the capability");
    assert!(carol_has, "Carol should have the capability");

    // Capability level should be consistent
    let alice_level = get_person_capability_level(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let bob_level = get_person_capability_level(&conductors[1], &bob, bob.agent_pubkey().clone()).await;
    let carol_level = get_person_capability_level(&conductors[2], &carol, carol.agent_pubkey().clone()).await;

    assert_eq!(alice_level, CAP_COORDINATION);
    assert_eq!(bob_level, CAP_COORDINATION);
    assert_eq!(carol_level, CAP_COORDINATION);
}

// ---------------------------------------------------------------------------
// 3. Device activity tracking and management across agents
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn device_activity_tracking_across_agents() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Alice creates a person
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Add Bob and Carol as agents
    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Register devices
    register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "alice_mobile".to_string(),
            device_name: "Alice's Mobile".to_string(),
            device_type: "mobile".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    register_device_for_person(
        &conductors[1],
        &bob,
        DeviceInput {
            device_id: "bob_desktop".to_string(),
            device_name: "Bob's Desktop".to_string(),
            device_type: "desktop".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Get initial activity timestamps
    let initial_alice_device = get_device_info(&conductors[0], &alice, "alice_mobile".to_string())
        .await
        .expect("Alice's device should exist");
    let initial_bob_device = get_device_info(&conductors[0], &alice, "bob_desktop".to_string())
        .await
        .expect("Bob's device should exist");

    let alice_initial_time = initial_alice_device.last_active;
    let bob_initial_time = initial_bob_device.last_active;

    // Wait then update Alice's device activity
    pause_ms(200).await;

    let alice_update = update_device_activity(&conductors[0], &alice, "alice_mobile".to_string()).await;
    assert!(alice_update, "Alice's activity update should succeed");

    pause_ms(200).await;

    // Update Bob's device activity
    let bob_update = update_device_activity(&conductors[1], &bob, "bob_desktop".to_string()).await;
    assert!(bob_update, "Bob's activity update should succeed");

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Verify timestamps were updated independently
    let updated_alice = get_device_info(&conductors[0], &alice, "alice_mobile".to_string())
        .await
        .expect("Alice's device should still exist");
    let updated_bob = get_device_info(&conductors[0], &alice, "bob_desktop".to_string())
        .await
        .expect("Bob's device should still exist");

    assert!(
        updated_alice.last_active > alice_initial_time,
        "Alice's last_active should be updated"
    );
    assert!(
        updated_bob.last_active > bob_initial_time,
        "Bob's last_active should be updated"
    );

    // Test device deactivation from Alice's agent
    let deactivate_result = deactivate_device(&conductors[0], &alice, "alice_mobile".to_string()).await;
    assert!(deactivate_result, "Deactivation should succeed");

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    let deactivated = get_device_info(&conductors[0], &alice, "alice_mobile".to_string())
        .await
        .expect("Deactivated device should still be visible");
    assert_eq!(
        deactivated.status,
        DeviceStatus::Revoked,
        "Device should be revoked after deactivation"
    );
}

// ---------------------------------------------------------------------------
// 4. Person profile consistency across devices
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn person_profile_consistency_across_devices() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Alice creates a person and stores private data
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    store_private_person_data(
        &conductors[0],
        &alice,
        sample_private_data("Alice Smith", "alice@example.com"),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Add Bob and Carol as agents
    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Register devices
    register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "alice_mobile".to_string(),
            device_name: "Alice's Mobile".to_string(),
            device_type: "mobile".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    register_device_for_person(
        &conductors[1],
        &bob,
        DeviceInput {
            device_id: "bob_desktop".to_string(),
            device_name: "Bob's Desktop".to_string(),
            device_type: "desktop".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    register_device_for_person(
        &conductors[2],
        &carol,
        DeviceInput {
            device_id: "carol_tablet".to_string(),
            device_name: "Carol's Tablet".to_string(),
            device_type: "tablet".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // All agents should see the same person data
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    let bob_profile = get_my_person_profile(&conductors[1], &bob).await;
    let carol_profile = get_my_person_profile(&conductors[2], &carol).await;

    assert!(alice_profile.person.is_some(), "Alice should see person data");
    assert!(bob_profile.person.is_some(), "Bob should see person data");
    assert!(carol_profile.person.is_some(), "Carol should see person data");

    assert_eq!(alice_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(bob_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(carol_profile.person.as_ref().unwrap().name, "Alice Smith");

    // Verify device registration timestamps are valid
    let alice_my = get_my_devices(&conductors[0], &alice).await;
    let bob_my = get_my_devices(&conductors[1], &bob).await;
    let carol_my = get_my_devices(&conductors[2], &carol).await;

    assert_eq!(alice_my.len(), 1);
    assert_eq!(bob_my.len(), 1);
    assert_eq!(carol_my.len(), 1);

    // Registered_at timestamps should be non-zero
    assert_ne!(
        alice_my[0].registered_at,
        Timestamp::from_micros(0),
        "Alice device registered_at should be non-zero"
    );
    assert_ne!(
        bob_my[0].registered_at,
        Timestamp::from_micros(0),
        "Bob device registered_at should be non-zero"
    );
    assert_ne!(
        carol_my[0].registered_at,
        Timestamp::from_micros(0),
        "Carol device registered_at should be non-zero"
    );
}
