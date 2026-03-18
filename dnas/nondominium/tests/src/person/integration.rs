//! Person integration tests — translated from `person/person-integration-tests.test.ts`.
//!
//! Covers multi-agent discovery, privacy boundaries, cross-agent role assignment,
//! capability-level consistency, multiple role aggregation, DHT synchronization
//! invariants, and edge cases around missing person records.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Multi-agent person discovery and interaction
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multi_agent_person_discovery_and_interaction() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both agents create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents can discover each other
    let all_from_alice = get_all_persons(&conductors[0], &alice).await;
    let all_from_bob = get_all_persons(&conductors[1], &bob).await;

    assert_eq!(all_from_alice.persons.len(), 2);
    assert_eq!(all_from_bob.persons.len(), 2);

    // Verify both can see each other's public profiles
    let alice_view_of_bob =
        get_person_profile(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    let bob_view_of_alice =
        get_person_profile(&conductors[1], &bob, alice.agent_pubkey().clone()).await;

    assert!(alice_view_of_bob.person.is_some());
    assert_eq!(alice_view_of_bob.person.as_ref().unwrap().name, "Bob");
    assert!(
        alice_view_of_bob.private_data.is_none(),
        "Alice must not see Bob's private data"
    );

    assert!(bob_view_of_alice.person.is_some());
    assert_eq!(bob_view_of_alice.person.as_ref().unwrap().name, "Lynn");
    assert!(
        bob_view_of_alice.private_data.is_none(),
        "Bob must not see Alice's private data"
    );
}

// ---------------------------------------------------------------------------
// 2. Privacy boundaries — private data isolation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn privacy_boundaries_private_data_isolation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both create persons and store private data
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    store_private_person_data(
        &conductors[0],
        &alice,
        sample_private_data("Lynn Smith", "lynn@example.com"),
    )
    .await;
    store_private_person_data(
        &conductors[1],
        &bob,
        sample_private_data("Bob Johnson", "bob@example.com"),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice can see her own private data
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    assert!(alice_profile.person.is_some());
    assert!(alice_profile.private_data.is_some());
    assert_eq!(
        alice_profile.private_data.as_ref().unwrap().legal_name,
        "Lynn Smith"
    );
    assert_eq!(
        alice_profile.private_data.as_ref().unwrap().email,
        "lynn@example.com"
    );

    // Bob can see his own private data
    let bob_profile = get_my_person_profile(&conductors[1], &bob).await;
    assert!(bob_profile.person.is_some());
    assert!(bob_profile.private_data.is_some());
    assert_eq!(
        bob_profile.private_data.as_ref().unwrap().legal_name,
        "Bob Johnson"
    );
    assert_eq!(
        bob_profile.private_data.as_ref().unwrap().email,
        "bob@example.com"
    );

    // Alice cannot see Bob's private data
    let alice_view_of_bob =
        get_person_profile(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert!(alice_view_of_bob.person.is_some());
    assert!(
        alice_view_of_bob.private_data.is_none(),
        "Alice must not see Bob's private data"
    );

    // Bob cannot see Alice's private data
    let bob_view_of_alice =
        get_person_profile(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    assert!(bob_view_of_alice.person.is_some());
    assert!(
        bob_view_of_alice.private_data.is_none(),
        "Bob must not see Alice's private data"
    );
}

// ---------------------------------------------------------------------------
// 3. Cross-agent role assignment and validation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn cross_agent_role_assignment_and_validation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice assigns steward role to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD),
    )
    .await;

    // Bob assigns coordinator role to Alice
    assign_person_role(
        &conductors[1],
        &bob,
        sample_role(alice.agent_pubkey().clone(), ROLE_RESOURCE_COORDINATOR),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify Bob's roles from both perspectives
    let bob_roles_from_alice =
        get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    let bob_roles_from_bob =
        get_person_roles(&conductors[1], &bob, bob.agent_pubkey().clone()).await;

    assert_eq!(bob_roles_from_alice.roles.len(), 1);
    assert_eq!(bob_roles_from_bob.roles.len(), 1);
    assert_eq!(bob_roles_from_alice.roles[0].role_name, ROLE_RESOURCE_STEWARD);
    assert_eq!(bob_roles_from_bob.roles[0].role_name, ROLE_RESOURCE_STEWARD);

    // Verify Alice's roles from both perspectives
    let alice_roles_from_alice =
        get_person_roles(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let alice_roles_from_bob =
        get_person_roles(&conductors[1], &bob, alice.agent_pubkey().clone()).await;

    assert_eq!(alice_roles_from_alice.roles.len(), 1);
    assert_eq!(alice_roles_from_bob.roles.len(), 1);
    assert_eq!(
        alice_roles_from_alice.roles[0].role_name,
        ROLE_RESOURCE_COORDINATOR
    );
    assert_eq!(
        alice_roles_from_bob.roles[0].role_name,
        ROLE_RESOURCE_COORDINATOR
    );

    // Verify capability checking from both agents
    let bob_has_steward_from_alice = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    let bob_has_steward_from_bob = has_person_role_capability(
        &conductors[1],
        &bob,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;

    assert!(bob_has_steward_from_alice);
    assert!(bob_has_steward_from_bob);

    let alice_has_coord_from_alice = has_person_role_capability(
        &conductors[0],
        &alice,
        alice.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    let alice_has_coord_from_bob = has_person_role_capability(
        &conductors[1],
        &bob,
        alice.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;

    assert!(alice_has_coord_from_alice);
    assert!(alice_has_coord_from_bob);
}

// ---------------------------------------------------------------------------
// 4. Capability level consistency across agents
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn capability_level_consistency_across_agents() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Initially both have member capability level
    let alice_cap_from_alice =
        get_person_capability_level(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let alice_cap_from_bob =
        get_person_capability_level(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    let bob_cap_from_alice =
        get_person_capability_level(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    let bob_cap_from_bob =
        get_person_capability_level(&conductors[1], &bob, bob.agent_pubkey().clone()).await;

    assert_eq!(alice_cap_from_alice, CAP_MEMBER);
    assert_eq!(alice_cap_from_bob, CAP_MEMBER);
    assert_eq!(bob_cap_from_alice, CAP_MEMBER);
    assert_eq!(bob_cap_from_bob, CAP_MEMBER);

    // Alice assigns coordination role to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_COORDINATOR),
    )
    .await;

    // Bob assigns governance role to Alice
    assign_person_role(
        &conductors[1],
        &bob,
        sample_role(alice.agent_pubkey().clone(), ROLE_FOUNDER),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify capability levels are consistent across agents
    let alice_cap_from_alice =
        get_person_capability_level(&conductors[0], &alice, alice.agent_pubkey().clone()).await;
    let alice_cap_from_bob =
        get_person_capability_level(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    let bob_cap_from_alice =
        get_person_capability_level(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    let bob_cap_from_bob =
        get_person_capability_level(&conductors[1], &bob, bob.agent_pubkey().clone()).await;

    assert_eq!(alice_cap_from_alice, CAP_GOVERNANCE);
    assert_eq!(alice_cap_from_bob, CAP_GOVERNANCE);
    assert_eq!(bob_cap_from_alice, CAP_COORDINATION);
    assert_eq!(bob_cap_from_bob, CAP_COORDINATION);
}

// ---------------------------------------------------------------------------
// 5. Multiple role assignments and capability aggregation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multiple_role_assignments_and_capability_aggregation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Both create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice assigns multiple roles to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD),
    )
    .await;

    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_COORDINATOR),
    )
    .await;

    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_FOUNDER),
    )
    .await;

    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_SIMPLE_AGENT),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify Bob has all assigned roles
    let bob_roles = get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(bob_roles.roles.len(), 4, "Bob should have 4 roles");

    let mut role_names: Vec<String> = bob_roles.roles.iter().map(|r| r.role_name.clone()).collect();
    role_names.sort();
    let mut expected = vec![
        ROLE_RESOURCE_COORDINATOR.to_string(),
        ROLE_FOUNDER.to_string(),
        ROLE_SIMPLE_AGENT.to_string(),
        ROLE_RESOURCE_STEWARD.to_string(),
    ];
    expected.sort();
    assert_eq!(role_names, expected);

    // Verify Bob has all capabilities
    let has_steward = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    let has_coordinator = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    let has_simple = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_SIMPLE_AGENT,
    )
    .await;
    let has_founder = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_FOUNDER,
    )
    .await;

    assert!(has_steward, "Bob should have steward capability");
    assert!(has_coordinator, "Bob should have coordinator capability");
    assert!(has_simple, "Bob should have simple agent capability");
    assert!(has_founder, "Bob should have founder capability");

    // Capability level should be governance (highest of the assigned roles)
    let cap_level =
        get_person_capability_level(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(
        cap_level, CAP_GOVERNANCE,
        "Bob's capability level should be governance (highest)"
    );
}

// ---------------------------------------------------------------------------
// 6. DHT synchronization and eventual consistency
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn dht_synchronization_and_eventual_consistency() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates person
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;

    // Bob creates person
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    // Before DHT sync, Alice should see at least her own person
    let all_from_alice = get_all_persons(&conductors[0], &alice).await;
    assert!(
        all_from_alice.persons.len() >= 1,
        "Alice should see at least 1 person before sync"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // After DHT sync, both should see each other
    let all_from_alice = get_all_persons(&conductors[0], &alice).await;
    let all_from_bob = get_all_persons(&conductors[1], &bob).await;

    assert_eq!(all_from_alice.persons.len(), 2);
    assert_eq!(all_from_bob.persons.len(), 2);

    // Alice assigns role to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents should see the role assignment
    let bob_roles_from_alice =
        get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    let bob_roles_from_bob =
        get_person_roles(&conductors[1], &bob, bob.agent_pubkey().clone()).await;

    assert_eq!(bob_roles_from_alice.roles.len(), 1);
    assert_eq!(bob_roles_from_bob.roles.len(), 1);
    assert_eq!(bob_roles_from_alice.roles[0].role_name, ROLE_RESOURCE_STEWARD);
    assert_eq!(bob_roles_from_bob.roles[0].role_name, ROLE_RESOURCE_STEWARD);
}

// ---------------------------------------------------------------------------
// 7. Agent interaction without prior person creation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn agent_interaction_without_prior_person_creation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Try to get profile for agent who hasn't created a person record yet
    let bob_profile_from_alice =
        get_person_profile(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert!(
        bob_profile_from_alice.person.is_none(),
        "Person should be None for agent without person record"
    );
    assert!(
        bob_profile_from_alice.private_data.is_none(),
        "Private data should be None for agent without person record"
    );

    // Verify that roles cannot be retrieved without person record
    let bob_roles_before =
        get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(
        bob_roles_before.roles.len(),
        0,
        "Roles should be empty before person creation"
    );

    // Now Bob creates person record
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now Alice should see Bob's person
    let bob_profile_after =
        get_person_profile(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert!(bob_profile_after.person.is_some());
    assert_eq!(bob_profile_after.person.as_ref().unwrap().name, "Bob");

    // Now Alice can assign a role to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Role should now be retrievable
    let bob_roles_after =
        get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(bob_roles_after.roles.len(), 1);
    assert_eq!(bob_roles_after.roles[0].role_name, ROLE_RESOURCE_STEWARD);
}
