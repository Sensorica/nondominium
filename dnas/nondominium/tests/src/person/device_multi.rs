//! Multi-device tests -- translated from `person/device-multi-device-tests.test.ts`.
//!
//! Validates cross-device person access, private data isolation, role propagation,
//! device independence, registration timing, and activity tracking across multiple
//! agents representing the same person on different devices.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Multi-device person setup and validation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multi_device_person_setup_and_validation() {
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

    // Add Bob and Carol as agents to Alice's person
    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Register devices from each agent
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

    // All agents should see Alice's person profile
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    let bob_profile = get_my_person_profile(&conductors[1], &bob).await;
    let carol_profile = get_my_person_profile(&conductors[2], &carol).await;

    assert!(alice_profile.person.is_some());
    assert!(bob_profile.person.is_some());
    assert!(carol_profile.person.is_some());

    assert_eq!(alice_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(bob_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(carol_profile.person.as_ref().unwrap().name, "Alice Smith");

    // Each agent sees only their own device via get_my_devices
    let alice_my = get_my_devices(&conductors[0], &alice).await;
    let bob_my = get_my_devices(&conductors[1], &bob).await;
    let carol_my = get_my_devices(&conductors[2], &carol).await;

    assert_eq!(alice_my.len(), 1, "Alice should see 1 device");
    assert_eq!(bob_my.len(), 1, "Bob should see 1 device");
    assert_eq!(carol_my.len(), 1, "Carol should see 1 device");

    assert_eq!(alice_my[0].device_id, "alice_mobile");
    assert_eq!(bob_my[0].device_id, "bob_desktop");
    assert_eq!(carol_my[0].device_id, "carol_tablet");

    // get_devices_for_person shows all 3 devices
    let all_devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(all_devices.len(), 3, "All 3 devices should be visible via get_devices_for_person");
}

// ---------------------------------------------------------------------------
// 2. Cross-device private data access
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn cross_device_private_data_access() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Alice creates person and stores private data
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

    // Alice should see her own private data
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    assert!(
        alice_profile.private_data.is_some(),
        "Alice should see her private data"
    );
    assert_eq!(
        alice_profile.private_data.as_ref().unwrap().legal_name,
        "Alice Smith"
    );
    assert_eq!(
        alice_profile.private_data.as_ref().unwrap().email,
        "alice@example.com"
    );

    // Bob and Carol see Alice's person data but NOT her private data
    // (private data stays with the creator - security-by-design)
    let bob_profile = get_my_person_profile(&conductors[1], &bob).await;
    let carol_profile = get_my_person_profile(&conductors[2], &carol).await;

    assert!(bob_profile.person.is_some(), "Bob should see Alice's person data");
    assert_eq!(bob_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert!(
        bob_profile.private_data.is_none(),
        "Bob should NOT see Alice's private data"
    );

    assert!(carol_profile.person.is_some(), "Carol should see Alice's person data");
    assert_eq!(carol_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert!(
        carol_profile.private_data.is_none(),
        "Carol should NOT see Alice's private data"
    );
}

// ---------------------------------------------------------------------------
// 3. Role assignment and access across devices
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn role_assignment_and_access_across_devices() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Setup person and agents
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Alice assigns a role
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

    assert_eq!(alice_roles.roles.len(), 1);
    assert_eq!(bob_roles.roles.len(), 1);
    assert_eq!(carol_roles.roles.len(), 1);

    assert_eq!(alice_roles.roles[0].role_name, ROLE_RESOURCE_COORDINATOR);
    assert_eq!(bob_roles.roles[0].role_name, ROLE_RESOURCE_COORDINATOR);
    assert_eq!(carol_roles.roles[0].role_name, ROLE_RESOURCE_COORDINATOR);

    // Bob assigns an additional role from his device
    assign_person_role(
        &conductors[1],
        &bob,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_STEWARD.to_string(),
            description: Some("Steward role assigned from desktop device".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Now all agents should see both roles
    let alice_updated = get_person_roles(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let bob_updated = get_person_roles(&conductors[1], &bob, bob.agent_pubkey().clone()).await;
    let carol_updated = get_person_roles(&conductors[2], &carol, carol.agent_pubkey().clone()).await;

    assert_eq!(alice_updated.roles.len(), 2);
    assert_eq!(bob_updated.roles.len(), 2);
    assert_eq!(carol_updated.roles.len(), 2);

    let mut role_names: Vec<String> = alice_updated
        .roles
        .iter()
        .map(|r| r.role_name.clone())
        .collect();
    role_names.sort();
    assert_eq!(role_names, vec![ROLE_RESOURCE_COORDINATOR, ROLE_RESOURCE_STEWARD]);
}

// ---------------------------------------------------------------------------
// 4. Device independence and isolation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn device_independence_and_isolation() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Setup person and agents
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

    // All devices see Alice's person data
    let alice_p = get_my_person_profile(&conductors[0], &alice).await;
    let bob_p = get_my_person_profile(&conductors[1], &bob).await;
    let carol_p = get_my_person_profile(&conductors[2], &carol).await;

    assert_eq!(alice_p.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(bob_p.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(carol_p.person.as_ref().unwrap().name, "Alice Smith");

    // Private data isolation: only Alice sees her private data
    assert!(alice_p.private_data.is_some());
    assert_eq!(alice_p.private_data.as_ref().unwrap().email, "alice@example.com");
    assert!(bob_p.private_data.is_none(), "Bob should not see private data");
    assert!(carol_p.private_data.is_none(), "Carol should not see private data");

    // Device registration isolation
    let alice_my = get_my_devices(&conductors[0], &alice).await;
    let bob_my = get_my_devices(&conductors[1], &bob).await;
    let carol_my = get_my_devices(&conductors[2], &carol).await;

    assert_eq!(alice_my.len(), 1);
    assert_eq!(alice_my[0].device_id, "alice_mobile");
    assert_eq!(bob_my.len(), 1);
    assert_eq!(bob_my[0].device_id, "bob_desktop");
    assert_eq!(carol_my.len(), 1);
    assert_eq!(carol_my[0].device_id, "carol_tablet");

    // But get_devices_for_person shows all devices
    let all = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(all.len(), 3);
}

// ---------------------------------------------------------------------------
// 5. Device registration timing and consistency
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn device_registration_timing_and_consistency() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Create person
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

    // Add agents
    add_agent_to_person(&conductors[0], &alice, bob.agent_pubkey().clone(), person_hash.clone()).await;
    add_agent_to_person(&conductors[0], &alice, carol.agent_pubkey().clone(), person_hash.clone()).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Register devices with timing gaps
    pause_ms(200).await;

    register_device_for_person(
        &conductors[0],
        &alice,
        DeviceInput {
            device_id: "alice_mobile_timed".to_string(),
            device_name: "Alice's Mobile".to_string(),
            device_type: "mobile".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    pause_ms(200).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    register_device_for_person(
        &conductors[1],
        &bob,
        DeviceInput {
            device_id: "alice_desktop_timed".to_string(),
            device_name: "Alice's Desktop".to_string(),
            device_type: "desktop".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    pause_ms(200).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    register_device_for_person(
        &conductors[2],
        &carol,
        DeviceInput {
            device_id: "alice_tablet_timed".to_string(),
            device_name: "Alice's Tablet".to_string(),
            device_type: "tablet".to_string(),
            person_hash: person_hash.clone(),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Verify all devices are registered
    let devices = get_devices_for_person(&conductors[0], &alice, person_hash).await;
    assert_eq!(devices.len(), 3);

    // Verify registration timestamps are in correct order
    let mobile = devices.iter().find(|d| d.device_id == "alice_mobile_timed").unwrap();
    let desktop = devices.iter().find(|d| d.device_id == "alice_desktop_timed").unwrap();
    let tablet = devices.iter().find(|d| d.device_id == "alice_tablet_timed").unwrap();

    assert!(
        mobile.registered_at <= desktop.registered_at,
        "Mobile should be registered before or at same time as desktop"
    );
    assert!(
        desktop.registered_at <= tablet.registered_at,
        "Desktop should be registered before or at same time as tablet"
    );

    // All agents should still see consistent person data
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    let bob_profile = get_my_person_profile(&conductors[1], &bob).await;
    let carol_profile = get_my_person_profile(&conductors[2], &carol).await;

    assert_eq!(alice_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(bob_profile.person.as_ref().unwrap().name, "Alice Smith");
    assert_eq!(carol_profile.person.as_ref().unwrap().name, "Alice Smith");

    // Alice should see private data; Bob and Carol should not
    assert!(alice_profile.private_data.is_some());
    assert_eq!(alice_profile.private_data.as_ref().unwrap().email, "alice@example.com");
    assert!(bob_profile.private_data.is_none());
    assert!(carol_profile.private_data.is_none());
}

// ---------------------------------------------------------------------------
// 6. Device activity tracking across devices
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn device_activity_tracking_across_devices() {
    let (conductors, alice, bob, carol) = setup_three_agents().await;

    // Setup person and agents
    let alice_person = create_person(&conductors[0], &alice, sample_person("Alice Smith")).await;
    let person_hash = alice_person.signed_action.hashed.hash.clone();

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

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

    // Get initial activity timestamps
    let initial_alice = get_device_info(&conductors[0], &alice, "alice_mobile".to_string())
        .await
        .expect("Alice's device should exist");
    let initial_bob = get_device_info(&conductors[0], &alice, "bob_desktop".to_string())
        .await
        .expect("Bob's device should exist");
    let initial_carol = get_device_info(&conductors[0], &alice, "carol_tablet".to_string())
        .await
        .expect("Carol's device should exist");

    let alice_initial_time = initial_alice.last_active;
    let bob_initial_time = initial_bob.last_active;

    // Update Alice's device activity
    pause_ms(200).await;

    let alice_update = update_device_activity(&conductors[0], &alice, "alice_mobile".to_string()).await;
    assert!(alice_update);

    pause_ms(200).await;

    // Update Bob's device activity
    let bob_update = update_device_activity(&conductors[1], &bob, "bob_desktop".to_string()).await;
    assert!(bob_update);

    await_consistency(Duration::from_secs(60), [&alice, &bob, &carol])
        .await
        .unwrap();

    // Verify timestamps updated independently
    let updated_alice = get_device_info(&conductors[0], &alice, "alice_mobile".to_string())
        .await
        .unwrap();
    let updated_bob = get_device_info(&conductors[0], &alice, "bob_desktop".to_string())
        .await
        .unwrap();

    assert!(updated_alice.last_active > alice_initial_time);
    assert!(updated_bob.last_active > bob_initial_time);

    // Carol's device should not have been affected
    let carol_device = get_device_info(&conductors[0], &alice, "carol_tablet".to_string())
        .await
        .unwrap();
    assert!(
        carol_device.last_active >= initial_carol.last_active,
        "Carol's device should not be affected by other updates"
    );
}
