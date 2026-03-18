//! Integration tests for the resource zome.
//!
//! Translated from `resource/resource-integration-tests.test.ts`.
//! Covers multi-agent discovery, cross-agent resource creation,
//! custody transfers, governance rule consistency, resource state
//! management across agents, specification-to-resource relationships,
//! first resource requirement validation, and DHT synchronization.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

/// Input for the `update_resource_state` zome call.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: zome_resource_integrity::ResourceState,
}

/// Input for the `transfer_custody` zome call.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TransferCustodyInput {
    pub resource_hash: ActionHash,
    pub new_custodian: AgentPubKey,
    pub request_contact_info: Option<bool>,
}

/// Output from the `transfer_custody` zome call.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TransferCustodyOutputMirror {
    pub updated_resource_hash: ActionHash,
    pub updated_resource: EconomicResourceMirror,
}

/// Mirror for `GetResourceSpecWithRulesOutput`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetResourceSpecWithRulesOutputMirror {
    pub specification: zome_resource_integrity::ResourceSpecification,
    pub governance_rules: Vec<zome_resource_integrity::GovernanceRule>,
}

/// Mirror for `GetAllGovernanceRulesOutput`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetAllGovernanceRulesOutputMirror {
    pub rules: Vec<zome_resource_integrity::GovernanceRule>,
}

// ---------------------------------------------------------------------------
// Helper: create basic resources for both agents (mirrors TS setupBasicResources)
// ---------------------------------------------------------------------------

struct BasicResourceContext {
    alice_spec_hash: ActionHash,
    bob_spec_hash: ActionHash,
    alice_resource_hash: ActionHash,
    bob_resource_hash: ActionHash,
}

/// Sets up a basic two-agent resource ecosystem:
/// - Alice creates "Lynn's Tool" spec (1 governance rule) + 1 economic resource
/// - Bob creates "Bob's Equipment" spec (1 governance rule) + 1 economic resource
async fn setup_basic_resources(
    conductors: &SweetConductorBatch,
    alice: &SweetCell,
    bob: &SweetCell,
) -> BasicResourceContext {
    let alice_spec = create_resource_specification(
        &conductors[0],
        alice,
        ResourceSpecificationInput {
            name: "Lynn's Tool".to_string(),
            description: "A shared community resource".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "community".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "access_requirement".to_string(),
                rule_data: r#"{"min_member_level":"verified"}"#.to_string(),
                enforced_by: Some("Resource Steward".to_string()),
            }],
        },
    )
    .await;

    let bob_spec = create_resource_specification(
        &conductors[1],
        bob,
        ResourceSpecificationInput {
            name: "Bob's Equipment".to_string(),
            description: "A shared community resource".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec!["community".to_string(), "verified".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "usage_limit".to_string(),
                rule_data: r#"{"max_hours_per_day":8}"#.to_string(),
                enforced_by: Some("Equipment Manager".to_string()),
            }],
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [alice, bob])
        .await
        .unwrap();

    let alice_resource = create_economic_resource(
        &conductors[0],
        alice,
        EconomicResourceInput {
            spec_hash: alice_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "tool".to_string(),
            current_location: Some("Workshop A".to_string()),
        },
    )
    .await;

    let bob_resource = create_economic_resource(
        &conductors[1],
        bob,
        EconomicResourceInput {
            spec_hash: bob_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "unit".to_string(),
            current_location: Some("Lab B".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [alice, bob])
        .await
        .unwrap();

    BasicResourceContext {
        alice_spec_hash: alice_spec.spec_hash,
        bob_spec_hash: bob_spec.spec_hash,
        alice_resource_hash: alice_resource.resource_hash,
        bob_resource_hash: bob_resource.resource_hash,
    }
}

// ---------------------------------------------------------------------------
// Test: Multi-agent resource specification discovery
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multi_agent_resource_specification_discovery() {
    let (conductors, alice, bob) = setup_two_agents().await;
    let ctx = setup_basic_resources(&conductors, &alice, &bob).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents can discover each other's resource specifications.
    let all_specs_alice = get_all_resource_specifications(&conductors[0], &alice).await;
    let all_specs_bob = get_all_resource_specifications(&conductors[1], &bob).await;

    assert_eq!(all_specs_alice.specifications.len(), 2);
    assert_eq!(all_specs_bob.specifications.len(), 2);

    // Verify both see each other's specifications.
    let mut alice_names: Vec<&str> = all_specs_alice
        .specifications
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    alice_names.sort();
    assert_eq!(alice_names, vec!["Bob's Equipment", "Lynn's Tool"]);

    let mut bob_names: Vec<&str> = all_specs_bob
        .specifications
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    bob_names.sort();
    assert_eq!(bob_names, vec!["Bob's Equipment", "Lynn's Tool"]);

    // Verify specs with governance rules.
    let alice_spec_rules: GetResourceSpecWithRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resource_specification_with_rules",
            ctx.alice_spec_hash.clone(),
        )
        .await;
    assert_eq!(alice_spec_rules.governance_rules.len(), 1);

    let bob_spec_rules: GetResourceSpecWithRulesOutputMirror = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_resource_specification_with_rules",
            ctx.bob_spec_hash.clone(),
        )
        .await;
    assert_eq!(bob_spec_rules.governance_rules.len(), 1);
}

// ---------------------------------------------------------------------------
// Test: Cross-agent economic resource creation and discovery
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn cross_agent_economic_resource_creation_and_discovery() {
    let (conductors, alice, bob) = setup_two_agents().await;
    let ctx = setup_basic_resources(&conductors, &alice, &bob).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice creates a resource from Bob's specification.
    let _cross_resource_1 = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: ctx.bob_spec_hash.clone(),
            quantity: 2.0,
            unit: "units".to_string(),
            current_location: Some("Lynn's Workshop".to_string()),
        },
    )
    .await;

    // Bob creates a resource from Alice's specification.
    let _cross_resource_2 = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: ctx.alice_spec_hash.clone(),
            quantity: 1.5,
            unit: "items".to_string(),
            current_location: Some("Bob's Facility".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents should see all 4 resources (2 from setup + 2 cross-spec).
    let all_from_alice = get_all_economic_resources(&conductors[0], &alice).await;
    let all_from_bob = get_all_economic_resources(&conductors[1], &bob).await;

    assert_eq!(all_from_alice.resources.len(), 4);
    assert_eq!(all_from_bob.resources.len(), 4);

    // Verify custodianship links via get_my_economic_resources.
    let alice_my: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_my: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    // Each agent should have 2 resources (1 from setup + 1 cross-spec).
    assert_eq!(alice_my.len(), 2);
    assert_eq!(bob_my.len(), 2);
}

// ---------------------------------------------------------------------------
// Test: Resource custody transfer between agents
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn resource_custody_transfer_between_agents() {
    let (conductors, alice, bob) = setup_two_agents().await;
    let ctx = setup_basic_resources(&conductors, &alice, &bob).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice transfers custody of her resource to Bob.
    let transfer_result: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: ctx.alice_resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        transfer_result.updated_resource.custodian,
        bob.agent_pubkey().clone(),
        "Custodian should now be Bob"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify custody links have been updated.
    let alice_my: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_my: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    // Alice should now have 0 resources.
    assert_eq!(alice_my.len(), 0, "Alice should have 0 resources after transfer");

    // Bob should now have 2 resources (his original + transferred from Alice).
    assert_eq!(bob_my.len(), 2, "Bob should have 2 resources after transfer");

    // Bob can transfer the resource back.
    let transfer_back: TransferCustodyOutputMirror = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: transfer_result.updated_resource_hash.clone(),
                new_custodian: alice.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        transfer_back.updated_resource.custodian,
        alice.agent_pubkey().clone(),
        "Custodian should be back to Alice"
    );
}

// ---------------------------------------------------------------------------
// Test: Resource state management across agents
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn resource_state_management_across_agents() {
    let (conductors, alice, bob) = setup_two_agents().await;
    let ctx = setup_basic_resources(&conductors, &alice, &bob).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice updates her resource state to Active.
    let _update_result: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: ctx.alice_resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents should see the updated state.
    let all_from_alice = get_all_economic_resources(&conductors[0], &alice).await;
    let all_from_bob = get_all_economic_resources(&conductors[1], &bob).await;

    let active_from_alice = all_from_alice
        .resources
        .iter()
        .find(|r| r.state == zome_resource_integrity::ResourceState::Active);
    let active_from_bob = all_from_bob
        .resources
        .iter()
        .find(|r| r.state == zome_resource_integrity::ResourceState::Active);

    assert!(active_from_alice.is_some(), "Alice should see an Active resource");
    assert!(active_from_bob.is_some(), "Bob should see an Active resource");

    // Transition to Maintenance.
    let _maintenance_result: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: ctx.alice_resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Maintenance,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Bob should see the Maintenance state.
    let updated_from_bob = get_all_economic_resources(&conductors[1], &bob).await;
    let maintenance_resource = updated_from_bob
        .resources
        .iter()
        .find(|r| r.state == zome_resource_integrity::ResourceState::Maintenance);

    assert!(
        maintenance_resource.is_some(),
        "Bob should see a Maintenance resource"
    );
}

// ---------------------------------------------------------------------------
// Test: Specification-to-resource relationships
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn specification_to_resource_relationships() {
    let (conductors, alice, bob) = setup_two_agents().await;
    let ctx = setup_basic_resources(&conductors, &alice, &bob).await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Create additional resources from the same specifications.
    let _alice_resource_2 = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: ctx.alice_spec_hash.clone(),
            quantity: 5.0,
            unit: "pieces".to_string(),
            current_location: Some("Storage A".to_string()),
        },
    )
    .await;

    let _bob_resource_2 = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: ctx.alice_spec_hash.clone(),
            quantity: 3.0,
            unit: "pieces".to_string(),
            current_location: Some("Storage B".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Query resources by specification from both agents.
    let alice_spec_resources_from_alice: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            ctx.alice_spec_hash.clone(),
        )
        .await;
    let alice_spec_resources_from_bob: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_resources_by_specification",
            ctx.alice_spec_hash.clone(),
        )
        .await;

    // Should have 3 resources conforming to Alice's spec (1 from setup + 2 new).
    assert_eq!(alice_spec_resources_from_alice.len(), 3);
    assert_eq!(alice_spec_resources_from_bob.len(), 3);

    // Bob's spec should have 1 resource (from setup).
    let bob_spec_resources: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            ctx.bob_spec_hash.clone(),
        )
        .await;

    assert_eq!(bob_spec_resources.len(), 1);
}

// ---------------------------------------------------------------------------
// Test: First resource requirement validation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn first_resource_requirement_validation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Initially, no agents have resources.
    let alice_initial: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let bob_initial: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;

    assert!(!alice_initial, "Alice should not have first resource requirement initially");
    assert!(!bob_initial, "Bob should not have first resource requirement initially");

    // Alice creates her first resource.
    let alice_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Alice's First Resource Spec".to_string(),
            description: "First resource".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec![],
            governance_rules: vec![],
        },
    )
    .await;

    let _alice_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: alice_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "item".to_string(),
            current_location: Some("Alice's Place".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice should now pass the first resource requirement.
    let alice_after: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let alice_from_bob: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;

    assert!(alice_after, "Alice should pass first resource requirement");
    assert!(alice_from_bob, "Alice should pass from Bob's perspective too");

    // Bob still should not pass.
    let bob_still: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;
    assert!(!bob_still, "Bob should not pass first resource requirement yet");

    // Bob creates his first resource.
    let bob_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Bob's First Resource Spec".to_string(),
            description: "First resource".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec![],
            governance_rules: vec![],
        },
    )
    .await;

    let _bob_resource = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: bob_spec.spec_hash.clone(),
            quantity: 2.0,
            unit: "units".to_string(),
            current_location: Some("Bob's Place".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Now both should pass.
    let final_alice: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let final_bob: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;

    assert!(final_alice, "Alice should pass final check");
    assert!(final_bob, "Bob should pass final check");
}

// ---------------------------------------------------------------------------
// Test: DHT synchronization and eventual consistency for resources
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn dht_synchronization_and_eventual_consistency() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates a resource specification.
    let alice_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Sync Test Tool".to_string(),
            description: "Testing DHT sync".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec![],
            governance_rules: vec![],
        },
    )
    .await;

    // Bob creates a resource specification.
    let _bob_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Sync Test Equipment".to_string(),
            description: "Testing DHT sync".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec![],
            governance_rules: vec![],
        },
    )
    .await;

    // Before DHT sync, Alice should see at least her own spec.
    let pre_sync = get_all_resource_specifications(&conductors[0], &alice).await;
    assert!(
        !pre_sync.specifications.is_empty(),
        "Alice should see at least 1 spec before sync"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // After DHT sync, both should see 2 specifications.
    let alice_view = get_all_resource_specifications(&conductors[0], &alice).await;
    let bob_view = get_all_resource_specifications(&conductors[1], &bob).await;

    assert_eq!(alice_view.specifications.len(), 2);
    assert_eq!(bob_view.specifications.len(), 2);

    // Alice creates an economic resource.
    let alice_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: alice_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "tool".to_string(),
            current_location: Some("Workshop".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents should see the resource.
    let resources_alice = get_all_economic_resources(&conductors[0], &alice).await;
    let resources_bob = get_all_economic_resources(&conductors[1], &bob).await;

    assert_eq!(resources_alice.resources.len(), 1);
    assert_eq!(resources_bob.resources.len(), 1);

    // Test custody transfer synchronization.
    let _transfer_result: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: alice_resource.resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Both agents should see the updated custody.
    let alice_my: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_my: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    assert_eq!(alice_my.len(), 0, "Alice should have 0 resources after transfer");
    assert_eq!(bob_my.len(), 1, "Bob should have 1 resource after transfer");
}
