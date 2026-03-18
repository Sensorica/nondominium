//! Foundation tests for the resource zome.
//!
//! Translated from `resource/resource-foundation-tests.test.ts`.
//! Covers basic CRUD operations: create/retrieve resource specifications,
//! economic resources, and governance rules.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// Resource Specification Foundation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn create_and_retrieve_basic_resource_specification() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create a resource specification with governance rules.
    let spec_input = ResourceSpecificationInput {
        name: "Community Drill".to_string(),
        description: "A shared community resource".to_string(),
        category: "tools".to_string(),
        image_url: Some("https://example.com/tool.png".to_string()),
        tags: vec!["shared".to_string(), "community".to_string()],
        governance_rules: vec![GovernanceRuleInput {
            rule_type: "access_requirement".to_string(),
            rule_data: r#"{"min_member_level":"verified"}"#.to_string(),
            enforced_by: Some("Resource Steward".to_string()),
        }],
    };

    let create_result =
        create_resource_specification(&conductors[0], &alice, spec_input.clone()).await;

    // Validate the created specification fields.
    assert_eq!(create_result.spec.name, "Community Drill");
    assert_eq!(create_result.spec.category, "tools");
    assert!(create_result.spec.is_active);
    assert_eq!(create_result.spec.tags.len(), 2);

    // Governance rules should match the input count.
    assert_eq!(
        create_result.governance_rule_hashes.len(),
        1,
        "Expected 1 governance rule hash, got {}",
        create_result.governance_rule_hashes.len()
    );

    // Wait for DHT propagation, then retrieve all specifications.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let all_specs = get_all_resource_specifications(&conductors[0], &alice).await;
    assert_eq!(
        all_specs.specifications.len(),
        1,
        "Expected 1 specification, got {}",
        all_specs.specifications.len()
    );

    let retrieved = &all_specs.specifications[0];
    assert_eq!(retrieved.name, "Community Drill");
    assert_eq!(retrieved.category, "tools");
    assert!(retrieved.is_active);

    // Retrieve the specification with its governance rules.
    let spec_with_rules: GetResourceSpecWithRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resource_specification_with_rules",
            create_result.spec_hash.clone(),
        )
        .await;

    assert_eq!(
        spec_with_rules.governance_rules.len(),
        1,
        "Expected 1 governance rule, got {}",
        spec_with_rules.governance_rules.len()
    );
}

// ---------------------------------------------------------------------------
// Economic Resource Foundation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn create_and_manage_economic_resources() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // First create a resource specification.
    let spec_result = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Workshop Tool".to_string(),
            description: "A shared community resource".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec!["shared".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "access_requirement".to_string(),
                rule_data: r#"{"min_member_level":"verified"}"#.to_string(),
                enforced_by: Some("Resource Steward".to_string()),
            }],
        },
    )
    .await;

    // Create an economic resource.
    let resource_result = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: spec_result.spec_hash.clone(),
            quantity: 3.0,
            unit: "pieces".to_string(),
            current_location: Some("Main Workshop".to_string()),
        },
    )
    .await;

    // Validate resource fields.
    assert_eq!(resource_result.resource.quantity, 3.0);
    assert_eq!(resource_result.resource.unit, "pieces");
    assert_eq!(
        resource_result.resource.current_location.as_deref(),
        Some("Main Workshop")
    );

    // Initial state should be PendingValidation.
    assert_eq!(
        resource_result.resource.state,
        ResourceState::PendingValidation,
        "Expected PendingValidation state"
    );

    // Custodian should be Alice.
    assert_eq!(
        resource_result.resource.custodian,
        alice.agent_pubkey().clone(),
        "Custodian should be the creating agent"
    );

    // DHT sync and retrieval.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let all_resources = get_all_economic_resources(&conductors[0], &alice).await;
    assert_eq!(
        all_resources.resources.len(),
        1,
        "Expected 1 resource, got {}",
        all_resources.resources.len()
    );

    let retrieved = &all_resources.resources[0];
    assert_eq!(retrieved.quantity, 3.0);
    assert_eq!(retrieved.unit, "pieces");

    // First resource requirement check.
    let has_first_resource: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;

    assert!(
        has_first_resource,
        "Agent should have first resource requirement fulfilled"
    );
}

// ---------------------------------------------------------------------------
// Governance Rule Foundation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn create_and_manage_governance_rules() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create a standalone governance rule.
    let rule_input = GovernanceRuleInput {
        rule_type: "usage_limit".to_string(),
        rule_data: r#"{"max_hours_per_day":4}"#.to_string(),
        enforced_by: Some("Resource Steward".to_string()),
    };

    let rule_record: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            rule_input,
        )
        .await;

    // The record should exist.
    let _rule_hash = rule_record.signed_action.hashed.hash.clone();

    // DHT sync and retrieval of all rules.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let all_rules: GetAllGovernanceRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_all_governance_rules",
            (),
        )
        .await;

    assert_eq!(
        all_rules.rules.len(),
        1,
        "Expected 1 governance rule, got {}",
        all_rules.rules.len()
    );

    let retrieved = &all_rules.rules[0];
    assert_eq!(retrieved.rule_type, "usage_limit");
    assert_eq!(
        retrieved.enforced_by.as_deref(),
        Some("Resource Steward")
    );
}

// ---------------------------------------------------------------------------
// Cross-Agent Visibility
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn cross_agent_visibility_resources_visible_to_other_agents() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates a resource specification.
    let alice_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Lynn's Shared Tool".to_string(),
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

    // Bob creates a different specification.
    let bob_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Bob's Equipment".to_string(),
            description: "A shared community resource".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec!["community".to_string(), "verified".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "access_requirement".to_string(),
                rule_data: r#"{"min_member_level":"verified"}"#.to_string(),
                enforced_by: Some("Resource Steward".to_string()),
            }],
        },
    )
    .await;

    // Wait for DHT sync.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Alice should see both specifications.
    let alice_view = get_all_resource_specifications(&conductors[0], &alice).await;
    assert_eq!(
        alice_view.specifications.len(),
        2,
        "Alice should see 2 specifications, saw {}",
        alice_view.specifications.len()
    );

    // Bob should also see both specifications.
    let bob_view = get_all_resource_specifications(&conductors[1], &bob).await;
    assert_eq!(
        bob_view.specifications.len(),
        2,
        "Bob should see 2 specifications, saw {}",
        bob_view.specifications.len()
    );

    // Verify specific specification names are present.
    let alice_names: Vec<&str> = alice_view
        .specifications
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    assert!(
        alice_names.contains(&"Lynn's Shared Tool"),
        "Alice should see Lynn's Shared Tool"
    );
    assert!(
        alice_names.contains(&"Bob's Equipment"),
        "Alice should see Bob's Equipment"
    );

    let bob_names: Vec<&str> = bob_view
        .specifications
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    assert!(
        bob_names.contains(&"Lynn's Shared Tool"),
        "Bob should see Lynn's Shared Tool"
    );
    assert!(
        bob_names.contains(&"Bob's Equipment"),
        "Bob should see Bob's Equipment"
    );
}

// ---------------------------------------------------------------------------
// Mirror types needed only in resource tests (not in the shared mirrors)
// ---------------------------------------------------------------------------

/// Mirror for `GetResourceSpecWithRulesOutput` which contains the full
/// `ResourceSpecification` from the integrity crate serialised via msgpack.
/// We use a lighter mirror with just the `GovernanceRule` list since that is
/// what the tests need to assert.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetResourceSpecWithRulesOutputMirror {
    pub specification: ResourceSpecificationMirror,
    pub governance_rules: Vec<GovernanceRuleMirror>,
}

/// Mirror for `GetAllGovernanceRulesOutput`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetAllGovernanceRulesOutputMirror {
    pub rules: Vec<GovernanceRuleMirror>,
}
