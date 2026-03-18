//! Person foundation tests — translated from `person/person-foundation-tests.test.ts`.
//!
//! Covers the basic CRUD lifecycle of Person entries, private data storage,
//! agent discovery, role assignment, capability checking, and error handling
//! for missing person profiles.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Create and retrieve Person
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn create_and_retrieve_person() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice (Lynn) creates a person
    let person_input = sample_person("Lynn");
    let record = create_person(&conductors[0], &alice, person_input.clone()).await;
    let hash = record.signed_action.hashed.hash.clone();

    // Retrieve and validate the person entry
    let person = get_latest_person(&conductors[0], &alice, hash).await;
    assert_eq!(person.name, "Lynn");
    assert_eq!(person.avatar_url, person_input.avatar_url);
    assert_eq!(person.bio, person_input.bio);

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice can get her own profile
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    assert!(alice_profile.person.is_some(), "Alice should see her own person");
    assert_eq!(alice_profile.person.as_ref().unwrap().name, "Lynn");
    assert!(
        alice_profile.private_data.is_none(),
        "No private data stored yet"
    );

    // Bob can get Alice's public profile
    let bob_view = get_person_profile(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    assert!(bob_view.person.is_some(), "Bob should see Alice's public person");
    assert_eq!(bob_view.person.as_ref().unwrap().name, "Lynn");
    assert!(
        bob_view.private_data.is_none(),
        "Bob must not see Alice's private data"
    );
}

// ---------------------------------------------------------------------------
// 2. Store and retrieve private data
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn store_and_retrieve_private_data() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates a person first
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice stores private data
    let private_input = sample_private_data("Lynn Smith", "lynn@example.com");
    let record = store_private_person_data(&conductors[0], &alice, private_input).await;
    assert!(
        record.signed_action.hashed.hash != ActionHash::from_raw_36(vec![0; 36]),
        "Store private data should return a valid record"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice can see her own private data
    let alice_profile = get_my_person_profile(&conductors[0], &alice).await;
    assert!(alice_profile.person.is_some());
    assert!(alice_profile.private_data.is_some(), "Alice should see her private data");
    let private_data = alice_profile.private_data.unwrap();
    assert_eq!(private_data.legal_name, "Lynn Smith");
    assert_eq!(private_data.email, "lynn@example.com");

    // Bob cannot see Alice's private data
    let bob_view = get_person_profile(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    assert!(bob_view.person.is_some());
    assert!(
        bob_view.private_data.is_none(),
        "Bob must not see Alice's private data"
    );
}

// ---------------------------------------------------------------------------
// 3. Get all agents discovery
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn get_all_agents_discovery() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Initially no persons
    let all_persons = get_all_persons(&conductors[0], &alice).await;
    assert_eq!(all_persons.persons.len(), 0, "Initially no persons should exist");

    // Alice creates a person
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now one person visible from Bob's perspective
    let all_persons = get_all_persons(&conductors[1], &bob).await;
    assert_eq!(all_persons.persons.len(), 1);
    assert_eq!(all_persons.persons[0].name, "Lynn");

    // Bob creates a person
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now two persons visible
    let all_persons = get_all_persons(&conductors[0], &alice).await;
    assert_eq!(all_persons.persons.len(), 2);

    let mut names: Vec<String> = all_persons.persons.iter().map(|p| p.name.clone()).collect();
    names.sort();
    assert_eq!(names, vec!["Bob", "Lynn"]);
}

// ---------------------------------------------------------------------------
// 4. Assign and retrieve agent roles
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn assign_and_retrieve_agent_roles() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create persons for both agents
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice assigns a steward role to Bob
    let role_input = sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD);
    let result = assign_person_role(&conductors[0], &alice, role_input).await;
    assert!(
        result.signed_action.hashed.hash != ActionHash::from_raw_36(vec![0; 36]),
        "Role assignment should return a valid record"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Get Bob's roles
    let bob_roles = get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(bob_roles.roles.len(), 1);
    assert_eq!(bob_roles.roles[0].role_name, ROLE_RESOURCE_STEWARD);
    assert_eq!(
        bob_roles.roles[0].assigned_to,
        bob.agent_pubkey().clone(),
        "Role should be assigned to Bob"
    );

    // Alice initially has no roles
    let alice_roles = get_person_roles(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    assert_eq!(alice_roles.roles.len(), 0, "Alice should have no roles");
}

// ---------------------------------------------------------------------------
// 5. Role capability checking
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn role_capability_checking() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Initially Bob has no capabilities
    let has_cap = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    assert!(!has_cap, "Bob should not have steward capability initially");

    // Assign steward role to Bob
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_STEWARD),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now Bob has steward capability
    let has_cap = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    assert!(has_cap, "Bob should have steward capability after assignment");

    // But Bob doesn't have coordinator capability
    let has_cap = has_person_role_capability(
        &conductors[0],
        &alice,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    assert!(
        !has_cap,
        "Bob should not have coordinator capability without that role"
    );
}

// ---------------------------------------------------------------------------
// 6. Agent capability levels
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn agent_capability_levels() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create persons
    create_person(&conductors[0], &alice, sample_person("Lynn")).await;
    create_person(&conductors[1], &bob, sample_person("Bob")).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Initially Bob has member capability level
    let cap_level =
        get_person_capability_level(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(cap_level, CAP_MEMBER, "Bob should start at member level");

    // Assign coordination role to Bob (Accountable Agent -> coordination level)
    assign_person_role(
        &conductors[0],
        &alice,
        sample_role(bob.agent_pubkey().clone(), ROLE_RESOURCE_COORDINATOR),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now Bob has coordination capability level
    let cap_level =
        get_person_capability_level(&conductors[0], &alice, bob.agent_pubkey().clone()).await;
    assert_eq!(
        cap_level, CAP_COORDINATION,
        "Bob should have coordination level after coordinator role"
    );

    // Assign founder role to Alice (Primary Accountable Agent -> governance level)
    assign_person_role(
        &conductors[1],
        &bob,
        sample_role(alice.agent_pubkey().clone(), ROLE_FOUNDER),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now Alice has governance capability level
    let cap_level =
        get_person_capability_level(&conductors[1], &bob, alice.agent_pubkey().clone()).await;
    assert_eq!(
        cap_level, CAP_GOVERNANCE,
        "Alice should have governance level after founder role"
    );
}

// ---------------------------------------------------------------------------
// 7. Error handling — missing person profile
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn error_handling_missing_person_profile() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Try to get profile for agent without a person record
    let profile =
        get_person_profile(&conductors[0], &alice, bob.agent_pubkey().clone()).await;

    // Should return empty profile
    assert!(
        profile.person.is_none(),
        "Person should be None for agent without a person record"
    );
    assert!(
        profile.private_data.is_none(),
        "Private data should be None for agent without a person record"
    );

    // Try to get roles for agent without a person record
    let roles = get_person_roles(&conductors[0], &alice, bob.agent_pubkey().clone()).await;

    // Should return empty roles array
    assert_eq!(
        roles.roles.len(),
        0,
        "Roles should be empty for agent without a person record"
    );
}
