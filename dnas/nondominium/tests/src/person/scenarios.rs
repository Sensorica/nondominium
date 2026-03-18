//! Person scenario tests — translated from `person/person-scenario-tests.test.ts`.
//!
//! These are end-to-end user-journey tests that exercise the full person
//! management lifecycle: onboarding, governance hierarchy, privacy boundaries,
//! and community scaling/discovery.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. Complete user onboarding workflow
// ---------------------------------------------------------------------------

/// Simulates a complete new-member onboarding journey:
/// - Lynn creates profile + private data + founder role
/// - Bob joins as new member
/// - Community discovery works for both agents
/// - Lynn delegates steward role to Bob
/// - Capability levels verified throughout
#[tokio::test(flavor = "multi_thread")]
async fn complete_user_onboarding_workflow() {
    let (conductors, lynn, bob) = setup_two_agents().await;

    // Step 1: Lynn creates her profile
    let lynn_person_input = PersonInput {
        name: "Lynn Cooper".to_string(),
        avatar_url: Some("https://example.com/lynn-avatar.png".to_string()),
        bio: Some("A community member".to_string()),
    };
    create_person(&conductors[0], &lynn, lynn_person_input).await;

    store_private_person_data(
        &conductors[0],
        &lynn,
        PrivatePersonDataInput {
            legal_name: "Lynn Elizabeth Cooper".to_string(),
            email: "lynn.foster@example.com".to_string(),
            phone: Some("+1-555-ALICE-1".to_string()),
            address: Some("123 Harmony Lane, Community Springs, CS 12345".to_string()),
            emergency_contact: Some("Bob Cooper (spouse), +1-555-BOB-EMG".to_string()),
            time_zone: Some("America/New_York".to_string()),
            location: None,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Step 2: Lynn becomes community founder
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: lynn.agent_pubkey().clone(),
            role_name: ROLE_FOUNDER.to_string(),
            description: Some("Community founder and initial administrator".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Verify Lynn's founder status
    let lynn_capability = get_person_capability_level(
        &conductors[0],
        &lynn,
        lynn.agent_pubkey().clone(),
    )
    .await;
    assert_eq!(
        lynn_capability, CAP_GOVERNANCE,
        "Lynn should have governance capability as founder"
    );

    // Step 3: Bob joins as new member
    let bob_person_input = PersonInput {
        name: "Bob Williams".to_string(),
        avatar_url: Some("https://example.com/bob-avatar.png".to_string()),
        bio: Some("A community member".to_string()),
    };
    create_person(&conductors[1], &bob, bob_person_input).await;

    store_private_person_data(
        &conductors[1],
        &bob,
        PrivatePersonDataInput {
            legal_name: "Robert James Williams".to_string(),
            email: "bob.williams@example.com".to_string(),
            phone: Some("+1-555-BOB-123".to_string()),
            address: Some("456 Innovation Drive, Tech Valley, TV 67890".to_string()),
            emergency_contact: Some("Sarah Williams (sister), +1-555-SARAH-99".to_string()),
            time_zone: Some("America/New_York".to_string()),
            location: None,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Step 4: Community discovery - both agents visible
    let all_members = get_all_persons(&conductors[0], &lynn).await;
    assert_eq!(
        all_members.persons.len(),
        2,
        "Community should have 2 members"
    );

    let mut member_names: Vec<String> = all_members
        .persons
        .iter()
        .map(|p| p.name.clone())
        .collect();
    member_names.sort();
    assert_eq!(member_names, vec!["Bob Williams", "Lynn Cooper"]);

    // Lynn can see Bob's public profile but not private data
    let bob_public_profile = get_person_profile(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
    )
    .await;
    assert!(
        bob_public_profile.person.is_some(),
        "Lynn should see Bob's public person"
    );
    assert_eq!(
        bob_public_profile.person.as_ref().unwrap().name,
        "Bob Williams"
    );
    assert!(
        bob_public_profile.private_data.is_none(),
        "Privacy maintained: Lynn should not see Bob's private data"
    );

    // Step 5: Lynn assigns steward role to Bob
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_STEWARD.to_string(),
            description: Some(
                "Community steward responsible for member onboarding and support".to_string(),
            ),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Step 6: Verify role-based capabilities
    let bob_has_steward = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    assert!(
        bob_has_steward,
        "Bob should have steward capability after assignment"
    );

    let bob_capability = get_person_capability_level(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
    )
    .await;
    assert_eq!(
        bob_capability, CAP_STEWARDSHIP,
        "Bob should have stewardship capability level"
    );

    // Step 7: Bob's roles are visible
    let bob_roles = get_person_roles(&conductors[1], &bob, bob.agent_pubkey().clone()).await;
    assert_eq!(bob_roles.roles.len(), 1, "Bob should have 1 role");
    assert_eq!(bob_roles.roles[0].role_name, ROLE_RESOURCE_STEWARD);
    assert_eq!(
        bob_roles.roles[0].assigned_by,
        lynn.agent_pubkey().clone(),
        "Role should be assigned by Lynn"
    );

    // Final verification: both agents can see their own complete profiles
    let lynn_complete = get_my_person_profile(&conductors[0], &lynn).await;
    assert!(lynn_complete.person.is_some());
    assert!(lynn_complete.private_data.is_some());
    assert_eq!(lynn_complete.person.as_ref().unwrap().name, "Lynn Cooper");
    assert_eq!(
        lynn_complete.private_data.as_ref().unwrap().legal_name,
        "Lynn Elizabeth Cooper"
    );

    let bob_complete = get_my_person_profile(&conductors[1], &bob).await;
    assert!(bob_complete.person.is_some());
    assert!(bob_complete.private_data.is_some());
    assert_eq!(bob_complete.person.as_ref().unwrap().name, "Bob Williams");
    assert_eq!(
        bob_complete.private_data.as_ref().unwrap().legal_name,
        "Robert James Williams"
    );
}

// ---------------------------------------------------------------------------
// 2. Community governance workflow with role hierarchy
// ---------------------------------------------------------------------------

/// Establishes a governance hierarchy and validates role-based access:
/// - Both members join
/// - Lynn becomes founder (governance level)
/// - Bob gets steward + coordinator (coordination level)
/// - Cross-agent validation of governance structure
#[tokio::test(flavor = "multi_thread")]
async fn community_governance_workflow_with_role_hierarchy() {
    let (conductors, lynn, bob) = setup_two_agents().await;

    // Setup: Both members join community
    create_person(&conductors[0], &lynn, sample_person("Lynn Cooper")).await;
    store_private_person_data(
        &conductors[0],
        &lynn,
        sample_private_data("Lynn Cooper", "lynn@example.com"),
    )
    .await;

    create_person(&conductors[1], &bob, sample_person("Bob Williams")).await;
    store_private_person_data(
        &conductors[1],
        &bob,
        sample_private_data("Bob Williams", "bob@example.com"),
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Phase 1: Establish primary leadership
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: lynn.agent_pubkey().clone(),
            role_name: ROLE_FOUNDER.to_string(),
            description: Some(
                "Primary accountable agent responsible for community governance".to_string(),
            ),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Phase 2: Delegate accountable roles
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_STEWARD.to_string(),
            description: Some("Community steward for member support".to_string()),
        },
    )
    .await;

    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_COORDINATOR.to_string(),
            description: Some("Resource coordinator for community assets".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Phase 3: Verify governance hierarchy
    let lynn_capability = get_person_capability_level(
        &conductors[0],
        &lynn,
        lynn.agent_pubkey().clone(),
    )
    .await;
    assert_eq!(
        lynn_capability, CAP_GOVERNANCE,
        "Lynn should have governance capability"
    );

    let bob_capability = get_person_capability_level(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
    )
    .await;
    assert_eq!(
        bob_capability, CAP_COORDINATION,
        "Bob should have coordination capability (multiple coordination roles)"
    );

    // Phase 4: Role-specific capability validation
    let bob_has_steward = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    let bob_has_coordinator = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;
    let bob_has_founder = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_FOUNDER,
    )
    .await;

    assert!(bob_has_steward, "Bob should have steward role");
    assert!(bob_has_coordinator, "Bob should have coordinator role");
    assert!(!bob_has_founder, "Bob should NOT have founder role");

    let lynn_has_founder = has_person_role_capability(
        &conductors[0],
        &lynn,
        lynn.agent_pubkey().clone(),
        ROLE_FOUNDER,
    )
    .await;
    let lynn_has_steward = has_person_role_capability(
        &conductors[0],
        &lynn,
        lynn.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;

    assert!(lynn_has_founder, "Lynn should have founder role");
    assert!(!lynn_has_steward, "Lynn should NOT have steward role");

    // Phase 5: Cross-agent validation of governance
    let lynn_roles_from_bob =
        get_person_roles(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_roles_from_lynn =
        get_person_roles(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    assert_eq!(
        lynn_roles_from_bob.roles.len(),
        1,
        "Lynn should have 1 role (founder)"
    );
    assert_eq!(lynn_roles_from_bob.roles[0].role_name, ROLE_FOUNDER);

    assert_eq!(
        bob_roles_from_lynn.roles.len(),
        2,
        "Bob should have 2 roles"
    );
    let mut bob_role_names: Vec<String> = bob_roles_from_lynn
        .roles
        .iter()
        .map(|r| r.role_name.clone())
        .collect();
    bob_role_names.sort();
    assert_eq!(
        bob_role_names,
        vec![ROLE_RESOURCE_COORDINATOR, ROLE_RESOURCE_STEWARD]
    );
}

// ---------------------------------------------------------------------------
// 3. Privacy and access control workflow
// ---------------------------------------------------------------------------

/// Comprehensive privacy boundary testing:
/// - Public profiles visible cross-agent
/// - Private data invisible cross-agent
/// - Self-access to private data works
/// - Role assignments don't leak private data
/// - Capability checking works without private data exposure
#[tokio::test(flavor = "multi_thread")]
async fn privacy_and_access_control_workflow() {
    let (conductors, lynn, bob) = setup_two_agents().await;

    // Lynn joins with comprehensive profile
    create_person(
        &conductors[0],
        &lynn,
        PersonInput {
            name: "Dr. Lynn Smith".to_string(),
            avatar_url: Some("https://medical-directory.com/dr-lynn.jpg".to_string()),
            bio: Some("A community member".to_string()),
        },
    )
    .await;

    store_private_person_data(
        &conductors[0],
        &lynn,
        PrivatePersonDataInput {
            legal_name: "Dr. Lynn Marie Smith, MD".to_string(),
            email: "lynn.smith@hospital.com".to_string(),
            phone: Some("+1-555-DOCTOR-1".to_string()),
            address: Some("789 Medical Plaza, Suite 201, Health City, HC 54321".to_string()),
            emergency_contact: Some(
                "Medical Association Emergency Line, +1-800-MED-HELP".to_string(),
            ),
            time_zone: Some("America/New_York".to_string()),
            location: None,
        },
    )
    .await;

    // Bob joins with different profile type
    create_person(
        &conductors[1],
        &bob,
        PersonInput {
            name: "Bob Community".to_string(),
            avatar_url: Some("https://community.org/members/bob.png".to_string()),
            bio: Some("A community member".to_string()),
        },
    )
    .await;

    store_private_person_data(
        &conductors[1],
        &bob,
        PrivatePersonDataInput {
            legal_name: "Robert Community Builder".to_string(),
            email: "bob@community.org".to_string(),
            phone: Some("+1-555-BUILDER".to_string()),
            address: Some(
                "123 Community Center Dr, Collaboration Town, CT 98765".to_string(),
            ),
            emergency_contact: Some(
                "Community Emergency Response, +1-555-EMERGENCY".to_string(),
            ),
            time_zone: Some("America/New_York".to_string()),
            location: None,
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Test 1: Public profile visibility
    let lynn_public_from_bob =
        get_person_profile(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_public_from_lynn =
        get_person_profile(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    // Public data is visible
    assert!(lynn_public_from_bob.person.is_some());
    assert_eq!(
        lynn_public_from_bob.person.as_ref().unwrap().name,
        "Dr. Lynn Smith"
    );
    assert_eq!(
        lynn_public_from_bob.person.as_ref().unwrap().avatar_url,
        Some("https://medical-directory.com/dr-lynn.jpg".to_string())
    );

    assert!(bob_public_from_lynn.person.is_some());
    assert_eq!(
        bob_public_from_lynn.person.as_ref().unwrap().name,
        "Bob Community"
    );

    // Private data is NOT visible cross-agent
    assert!(
        lynn_public_from_bob.private_data.is_none(),
        "Bob must not see Lynn's private data"
    );
    assert!(
        bob_public_from_lynn.private_data.is_none(),
        "Lynn must not see Bob's private data"
    );

    // Test 2: Self-access to private data
    let lynn_private_profile = get_my_person_profile(&conductors[0], &lynn).await;
    let bob_private_profile = get_my_person_profile(&conductors[1], &bob).await;

    assert!(lynn_private_profile.private_data.is_some());
    assert_eq!(
        lynn_private_profile.private_data.as_ref().unwrap().legal_name,
        "Dr. Lynn Marie Smith, MD"
    );
    assert_eq!(
        lynn_private_profile.private_data.as_ref().unwrap().email,
        "lynn.smith@hospital.com"
    );

    assert!(bob_private_profile.private_data.is_some());
    assert_eq!(
        bob_private_profile.private_data.as_ref().unwrap().legal_name,
        "Robert Community Builder"
    );
    assert_eq!(
        bob_private_profile.private_data.as_ref().unwrap().email,
        "bob@community.org"
    );

    // Test 3: Role assignments don't leak private data
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: lynn.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_STEWARD.to_string(),
            description: Some("Medical advisor for community health initiatives".to_string()),
        },
    )
    .await;

    assign_person_role(
        &conductors[1],
        &bob,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_COORDINATOR.to_string(),
            description: Some("Community resource coordination specialist".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Roles are visible
    let lynn_roles_from_bob =
        get_person_roles(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_roles_from_lynn =
        get_person_roles(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    assert_eq!(lynn_roles_from_bob.roles.len(), 1);
    assert_eq!(
        lynn_roles_from_bob.roles[0].role_name,
        ROLE_RESOURCE_STEWARD
    );

    assert_eq!(bob_roles_from_lynn.roles.len(), 1);
    assert_eq!(
        bob_roles_from_lynn.roles[0].role_name,
        ROLE_RESOURCE_COORDINATOR
    );

    // But cross-agent private data access is STILL denied after role assignment
    let lynn_public_after_role =
        get_person_profile(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_public_after_role =
        get_person_profile(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    assert!(
        lynn_public_after_role.private_data.is_none(),
        "Private data should remain hidden after role assignment"
    );
    assert!(
        bob_public_after_role.private_data.is_none(),
        "Private data should remain hidden after role assignment"
    );

    // Test 4: Capability checking works without private data exposure
    let lynn_has_steward = has_person_role_capability(
        &conductors[1],
        &bob,
        lynn.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    let bob_has_coordinator = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;

    assert!(lynn_has_steward, "Lynn should have steward capability");
    assert!(
        bob_has_coordinator,
        "Bob should have coordinator capability"
    );

    let lynn_cap_level = get_person_capability_level(
        &conductors[1],
        &bob,
        lynn.agent_pubkey().clone(),
    )
    .await;
    let bob_cap_level = get_person_capability_level(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
    )
    .await;

    assert_eq!(lynn_cap_level, CAP_STEWARDSHIP);
    assert_eq!(bob_cap_level, CAP_COORDINATION);
}

// ---------------------------------------------------------------------------
// 4. Community scaling and discovery workflow
// ---------------------------------------------------------------------------

/// Tests community growth, member discovery, role delegation, and
/// organizational structure verification.
#[tokio::test(flavor = "multi_thread")]
async fn community_scaling_and_discovery_workflow() {
    let (conductors, lynn, bob) = setup_two_agents().await;

    // Phase 1: Initial community establishment
    create_person(
        &conductors[0],
        &lynn,
        PersonInput {
            name: "Lynn Founder".to_string(),
            avatar_url: Some("https://community.org/founder.png".to_string()),
            bio: Some("A community member".to_string()),
        },
    )
    .await;

    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: lynn.agent_pubkey().clone(),
            role_name: ROLE_FOUNDER.to_string(),
            description: Some("Community founder and primary governance lead".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Verify initial state: one member
    let all_members = get_all_persons(&conductors[0], &lynn).await;
    assert_eq!(all_members.persons.len(), 1);
    assert_eq!(all_members.persons[0].name, "Lynn Founder");

    // Phase 2: First member joins
    create_person(
        &conductors[1],
        &bob,
        PersonInput {
            name: "Bob FirstMember".to_string(),
            avatar_url: Some("https://community.org/member1.png".to_string()),
            bio: Some("A community member".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Community grows
    let all_members = get_all_persons(&conductors[0], &lynn).await;
    assert_eq!(all_members.persons.len(), 2);

    let mut member_names: Vec<String> = all_members
        .persons
        .iter()
        .map(|p| p.name.clone())
        .collect();
    member_names.sort();
    assert_eq!(member_names, vec!["Bob FirstMember", "Lynn Founder"]);

    // Phase 3: Role delegation and capability distribution
    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_STEWARD.to_string(),
            description: Some("Community steward for new member onboarding".to_string()),
        },
    )
    .await;

    assign_person_role(
        &conductors[0],
        &lynn,
        PersonRoleInput {
            agent_pubkey: bob.agent_pubkey().clone(),
            role_name: ROLE_RESOURCE_COORDINATOR.to_string(),
            description: Some("Resource coordinator for community assets".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&lynn, &bob])
        .await
        .unwrap();

    // Phase 4: Verify distributed governance structure
    let lynn_capability = get_person_capability_level(
        &conductors[1],
        &bob,
        lynn.agent_pubkey().clone(),
    )
    .await;
    let bob_capability = get_person_capability_level(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
    )
    .await;

    assert_eq!(lynn_capability, CAP_GOVERNANCE);
    assert_eq!(bob_capability, CAP_COORDINATION);

    // Verify role distribution
    let lynn_roles = get_person_roles(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_roles = get_person_roles(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    assert_eq!(lynn_roles.roles.len(), 1);
    assert_eq!(lynn_roles.roles[0].role_name, ROLE_FOUNDER);

    assert_eq!(bob_roles.roles.len(), 2);
    let mut bob_role_names: Vec<String> =
        bob_roles.roles.iter().map(|r| r.role_name.clone()).collect();
    bob_role_names.sort();
    assert_eq!(
        bob_role_names,
        vec![ROLE_RESOURCE_COORDINATOR, ROLE_RESOURCE_STEWARD]
    );

    // Phase 5: Discovery and interaction patterns
    let lynn_view = get_all_persons(&conductors[0], &lynn).await;
    let bob_view = get_all_persons(&conductors[1], &bob).await;

    assert_eq!(lynn_view.persons.len(), 2);
    assert_eq!(bob_view.persons.len(), 2);

    // Cross-agent profile access works
    let lynn_profile_from_bob =
        get_person_profile(&conductors[1], &bob, lynn.agent_pubkey().clone()).await;
    let bob_profile_from_lynn =
        get_person_profile(&conductors[0], &lynn, bob.agent_pubkey().clone()).await;

    assert!(lynn_profile_from_bob.person.is_some());
    assert_eq!(
        lynn_profile_from_bob.person.as_ref().unwrap().name,
        "Lynn Founder"
    );

    assert!(bob_profile_from_lynn.person.is_some());
    assert_eq!(
        bob_profile_from_lynn.person.as_ref().unwrap().name,
        "Bob FirstMember"
    );

    // Phase 6: Community readiness for further scaling
    let has_founder = has_person_role_capability(
        &conductors[1],
        &bob,
        lynn.agent_pubkey().clone(),
        ROLE_FOUNDER,
    )
    .await;
    assert!(has_founder, "Primary accountability established");

    let has_steward = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_STEWARD,
    )
    .await;
    let has_coordinator = has_person_role_capability(
        &conductors[0],
        &lynn,
        bob.agent_pubkey().clone(),
        ROLE_RESOURCE_COORDINATOR,
    )
    .await;

    assert!(has_steward, "Distributed steward role present");
    assert!(has_coordinator, "Distributed coordinator role present");
}
