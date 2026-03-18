//! Resource state update tests.
//!
//! Translated from `resource/resource-update-test.test.ts`.
//! Covers basic resource state transitions (PendingValidation -> Active).

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

/// Input for the `update_resource_state` zome call.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: ResourceState,
}

#[tokio::test(flavor = "multi_thread")]
async fn basic_resource_state_update() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Step 1: Create a resource specification with no governance rules.
    let spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Test Tool".to_string(),
            description: "A simple test tool".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec!["shared".to_string()],
            governance_rules: vec![],
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 2: Create an economic resource.
    let resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "tool".to_string(),
            current_location: Some("Workshop".to_string()),
        },
    )
    .await;

    // Verify initial state is PendingValidation.
    assert_eq!(
        resource.resource.state,
        ResourceState::PendingValidation,
        "Initial state should be PendingValidation"
    );

    // Verify custodian is the creating agent.
    assert_eq!(
        resource.resource.custodian,
        alice.agent_pubkey().clone(),
        "Custodian should be Alice"
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 3: Update resource state to Active.
    let _update_record: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: resource.resource_hash.clone(),
                new_state: ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 4: Verify the state was updated.
    let all_resources = get_all_economic_resources(&conductors[0], &alice).await;
    assert_eq!(
        all_resources.resources.len(),
        1,
        "Expected 1 resource, got {}",
        all_resources.resources.len()
    );

    assert_eq!(
        all_resources.resources[0].state,
        ResourceState::Active,
        "Resource state should be Active after update"
    );
}
