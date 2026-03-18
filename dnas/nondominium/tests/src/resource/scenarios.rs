//! Scenario tests for the resource zome.
//!
//! Translated from `resource/resource-scenario-tests.test.ts`.
//! Covers complete resource lifecycle workflows, community resource sharing,
//! custody/stewardship patterns, and multi-agent ecosystem discovery.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// Local mirror types used only in scenario tests
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: zome_resource_integrity::ResourceState,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TransferCustodyInput {
    pub resource_hash: ActionHash,
    pub new_custodian: AgentPubKey,
    pub request_contact_info: Option<bool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TransferCustodyOutputMirror {
    pub updated_resource_hash: ActionHash,
    pub updated_resource: EconomicResourceMirror,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetResourceSpecWithRulesOutputMirror {
    pub specification: zome_resource_integrity::ResourceSpecification,
    pub governance_rules: Vec<zome_resource_integrity::GovernanceRule>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct GetAllGovernanceRulesOutputMirror {
    pub rules: Vec<zome_resource_integrity::GovernanceRule>,
}

// ---------------------------------------------------------------------------
// Scenario 1: Complete resource lifecycle workflow
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn complete_resource_lifecycle_workflow() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Step 1: Alice creates a resource specification with governance rules.
    let tool_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Community 3D Printer".to_string(),
            description: "High-precision 3D printer for community projects".to_string(),
            category: "equipment".to_string(),
            image_url: Some("https://example.com/3d-printer.jpg".to_string()),
            tags: vec![
                "shared".to_string(),
                "community".to_string(),
                "verified".to_string(),
            ],
            governance_rules: vec![
                GovernanceRuleInput {
                    rule_type: "access_requirement".to_string(),
                    rule_data: r#"{"certification_required":true,"min_training_hours":10}"#
                        .to_string(),
                    enforced_by: Some("Equipment Steward".to_string()),
                },
                GovernanceRuleInput {
                    rule_type: "usage_limit".to_string(),
                    rule_data: r#"{"max_hours_per_session":4,"max_sessions_per_week":3,"booking_advance_days":7}"#
                        .to_string(),
                    enforced_by: Some("Resource Coordinator".to_string()),
                },
                GovernanceRuleInput {
                    rule_type: "maintenance_schedule".to_string(),
                    rule_data: r#"{"cleaning_after_each_use":true,"professional_service_months":6,"calibration_weeks":2}"#
                        .to_string(),
                    enforced_by: Some("Technical Steward".to_string()),
                },
            ],
        },
    )
    .await;

    assert_eq!(tool_spec.governance_rule_hashes.len(), 3);

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 2: Bob can discover and review the specification.
    let spec_with_rules: GetResourceSpecWithRulesOutputMirror = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_resource_specification_with_rules",
            tool_spec.spec_hash.clone(),
        )
        .await;

    assert_eq!(spec_with_rules.specification.name, "Community 3D Printer");
    assert_eq!(spec_with_rules.governance_rules.len(), 3);

    let rule_types: Vec<&str> = spec_with_rules
        .governance_rules
        .iter()
        .map(|r| r.rule_type.as_str())
        .collect();
    assert!(rule_types.contains(&"access_requirement"));
    assert!(rule_types.contains(&"usage_limit"));
    assert!(rule_types.contains(&"maintenance_schedule"));

    // Step 3: Alice creates the actual economic resource.
    let printer_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: tool_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "printer".to_string(),
            current_location: Some("Community Workshop - Station 1".to_string()),
        },
    )
    .await;

    assert_eq!(
        printer_resource.resource.state,
        zome_resource_integrity::ResourceState::PendingValidation
    );
    assert_eq!(
        printer_resource.resource.custodian,
        alice.agent_pubkey().clone()
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 4: Resource activation.
    let activation_record: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: printer_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify resource is active and visible to Bob.
    let all_resources = get_all_economic_resources(&conductors[1], &bob).await;
    let active_printer = all_resources
        .resources
        .iter()
        .find(|r| {
            r.state == zome_resource_integrity::ResourceState::Active
                && r.current_location.as_deref() == Some("Community Workshop - Station 1")
        });
    assert!(active_printer.is_some(), "Active printer should be visible to Bob");

    // Step 5: Custody transfer to resource steward (Bob).
    let custody_transfer: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: printer_resource.resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        custody_transfer.updated_resource.custodian,
        bob.agent_pubkey().clone()
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify custody links.
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

    // Step 6: Resource maintenance cycle (Bob is now steward).
    let _maintenance_record: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: custody_transfer.updated_resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Maintenance,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify maintenance state is visible to Alice.
    let resources_in_maintenance = get_all_economic_resources(&conductors[0], &alice).await;
    let maintenance_printer = resources_in_maintenance
        .resources
        .iter()
        .find(|r| r.state == zome_resource_integrity::ResourceState::Maintenance);
    assert!(
        maintenance_printer.is_some(),
        "Maintenance resource should be visible to Alice"
    );

    // Return to active state after maintenance.
    let _reactivation: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: custody_transfer.updated_resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Step 7: Community resource contribution validation.
    let alice_contributed: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let bob_contributed: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;

    assert!(alice_contributed, "Alice created the resource, should pass");
    assert!(!bob_contributed, "Bob only manages it, should not pass");

    // Final verification: spec-resource relationship and governance rules.
    let resources_by_spec: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            tool_spec.spec_hash.clone(),
        )
        .await;
    assert_eq!(resources_by_spec.len(), 1);

    let final_spec_rules: GetResourceSpecWithRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resource_specification_with_rules",
            tool_spec.spec_hash.clone(),
        )
        .await;
    assert_eq!(final_spec_rules.governance_rules.len(), 3);

    let final_all_specs = get_all_resource_specifications(&conductors[1], &bob).await;
    assert_eq!(final_all_specs.specifications.len(), 1);
}

// ---------------------------------------------------------------------------
// Scenario 2: Community resource sharing and governance workflow
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn community_resource_sharing_and_governance_workflow() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Phase 1: Alice establishes community workshop resources.
    let space_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Workshop Space".to_string(),
            description: "Shared workspace for community projects".to_string(),
            category: "space".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "community".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "access_hours".to_string(),
                rule_data: r#"{"open_hours":"9AM-9PM","max_session_hours":8}"#.to_string(),
                enforced_by: Some("Space Coordinator".to_string()),
            }],
        },
    )
    .await;

    pause_ms(100).await; // Source chain ordering

    let tools_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Power Tools Set".to_string(),
            description: "Professional grade power tools for woodworking".to_string(),
            category: "tools".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "verified".to_string()],
            governance_rules: vec![
                GovernanceRuleInput {
                    rule_type: "safety_certification".to_string(),
                    rule_data: r#"{"certification_required":true,"safety_training_hours":4}"#
                        .to_string(),
                    enforced_by: Some("Safety Officer".to_string()),
                },
                GovernanceRuleInput {
                    rule_type: "maintenance_protocol".to_string(),
                    rule_data: r#"{"clean_after_use":true,"report_issues":true,"monthly_inspection":true}"#
                        .to_string(),
                    enforced_by: Some("Tool Steward".to_string()),
                },
            ],
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 2: Bob contributes complementary resources.
    let printing_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "3D Printing Station".to_string(),
            description: "Advanced 3D printing setup with multiple printers".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec![
                "shared".to_string(),
                "community".to_string(),
                "verified".to_string(),
            ],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "material_usage".to_string(),
                rule_data: r#"{"material_fee_per_gram":0.05,"max_print_time_hours":12,"advance_booking_required":true}"#
                    .to_string(),
                enforced_by: Some("3D Print Coordinator".to_string()),
            }],
        },
    )
    .await;

    pause_ms(100).await;

    let electronics_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Electronics Lab".to_string(),
            description: "Electronics prototyping and testing equipment".to_string(),
            category: "space".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "experimental".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "skill_requirement".to_string(),
                rule_data: r#"{"electronics_experience":"intermediate","soldering_certification":true}"#
                    .to_string(),
                enforced_by: Some("Electronics Mentor".to_string()),
            }],
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 3: Create economic resources for all specifications.
    let space_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: space_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "space".to_string(),
            current_location: Some("Building A - Floor 2".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let tools_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: tools_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "set".to_string(),
            current_location: Some("Workshop - Tool Cabinet".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let printing_resource = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: printing_spec.spec_hash.clone(),
            quantity: 3.0,
            unit: "printers".to_string(),
            current_location: Some("Workshop - 3D Print Corner".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let electronics_resource = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: electronics_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "lab".to_string(),
            current_location: Some("Building A - Floor 1 - Room 105".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 4: Activate all resources.
    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: space_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;
    pause_ms(100).await;

    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: tools_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;
    pause_ms(100).await;

    let _: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: printing_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;
    pause_ms(100).await;

    let _: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: electronics_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 5: Cross-agent resource discovery and validation.
    let all_specs_alice = get_all_resource_specifications(&conductors[0], &alice).await;
    let all_specs_bob = get_all_resource_specifications(&conductors[1], &bob).await;
    let all_resources_alice = get_all_economic_resources(&conductors[0], &alice).await;
    let all_resources_bob = get_all_economic_resources(&conductors[1], &bob).await;

    assert_eq!(all_specs_alice.specifications.len(), 4);
    assert_eq!(all_specs_bob.specifications.len(), 4);
    assert_eq!(all_resources_alice.resources.len(), 4);
    assert_eq!(all_resources_bob.resources.len(), 4);

    // Verify resource categories are discoverable.
    let categories: Vec<&str> = all_specs_alice
        .specifications
        .iter()
        .map(|s| s.category.as_str())
        .collect();
    assert!(categories.contains(&"space"));
    assert!(categories.contains(&"tools"));
    assert!(categories.contains(&"equipment"));

    // Phase 6: Governance rule aggregation.
    let all_rules: GetAllGovernanceRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_all_governance_rules",
            (),
        )
        .await;

    // At least 5 rules from specifications (1+2+1+1 = 5).
    assert!(
        all_rules.rules.len() >= 5,
        "Expected at least 5 governance rules, got {}",
        all_rules.rules.len()
    );

    let rule_types: Vec<&str> = all_rules.rules.iter().map(|r| r.rule_type.as_str()).collect();
    assert!(rule_types.contains(&"access_hours"));
    assert!(rule_types.contains(&"safety_certification"));
    assert!(rule_types.contains(&"maintenance_protocol"));
    assert!(rule_types.contains(&"material_usage"));
    assert!(rule_types.contains(&"skill_requirement"));

    // Phase 7: Resource contribution tracking.
    let alice_contributions: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let bob_contributions: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;

    assert!(alice_contributions, "Alice created workshop resources");
    assert!(bob_contributions, "Bob created tech resources");

    let alice_resource_count: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_resource_count: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    assert_eq!(alice_resource_count.len(), 2, "Alice should have 2 resources (space + tools)");
    assert_eq!(bob_resource_count.len(), 2, "Bob should have 2 resources (printing + electronics)");

    // Final verification: specification-resource relationships.
    let space_resources: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            space_spec.spec_hash.clone(),
        )
        .await;
    let printing_resources: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_resources_by_specification",
            printing_spec.spec_hash.clone(),
        )
        .await;

    assert_eq!(space_resources.len(), 1);
    assert_eq!(printing_resources.len(), 1);

    // Verify all resources are active.
    let active_count = all_resources_alice
        .resources
        .iter()
        .filter(|r| r.state == zome_resource_integrity::ResourceState::Active)
        .count();
    assert_eq!(active_count, 4, "All 4 resources should be active");
}

// ---------------------------------------------------------------------------
// Scenario 3: Resource custody and stewardship workflow
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn resource_custody_and_stewardship_workflow() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Phase 1: Alice creates a high-value community resource.
    let expensive_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Industrial CNC Machine".to_string(),
            description: "High-precision CNC machine for advanced manufacturing".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "verified".to_string()],
            governance_rules: vec![
                GovernanceRuleInput {
                    rule_type: "operator_certification".to_string(),
                    rule_data: r#"{"certification_level":"advanced","training_hours":40,"supervision_required":true}"#
                        .to_string(),
                    enforced_by: Some("Manufacturing Steward".to_string()),
                },
                GovernanceRuleInput {
                    rule_type: "usage_tracking".to_string(),
                    rule_data: r#"{"log_all_usage":true,"project_approval_required":true,"material_costs_tracked":true}"#
                        .to_string(),
                    enforced_by: Some("Resource Coordinator".to_string()),
                },
                GovernanceRuleInput {
                    rule_type: "maintenance_intensive".to_string(),
                    rule_data: r#"{"daily_inspection":true,"professional_service_monthly":true,"downtime_scheduling":true}"#
                        .to_string(),
                    enforced_by: Some("Technical Steward".to_string()),
                },
            ],
        },
    )
    .await;

    let cnc_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: expensive_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "machine".to_string(),
            current_location: Some("Manufacturing Floor - Bay 3".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 2: Specialized stewardship assignment - Alice transfers to Bob.
    let initial_transfer: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: cnc_resource.resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        initial_transfer.updated_resource.custodian,
        bob.agent_pubkey().clone()
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify custody change.
    let alice_after_transfer: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_after_transfer: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    assert_eq!(alice_after_transfer.len(), 0);
    assert_eq!(bob_after_transfer.len(), 1);

    // Phase 3: Resource activation under stewardship.
    let activation_record: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: initial_transfer.updated_resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify resource is active and visible to community.
    let community_view = get_all_economic_resources(&conductors[0], &alice).await;
    let active_cnc = community_view
        .resources
        .iter()
        .find(|r| {
            r.custodian == bob.agent_pubkey().clone()
                && r.state == zome_resource_integrity::ResourceState::Active
        });
    assert!(active_cnc.is_some(), "Active CNC should be visible to community");

    // Phase 4: Maintenance cycle management.
    let maintenance_start: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: activation_record.signed_action.hashed.hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Maintenance,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Verify maintenance state is communicated.
    let maintenance_view = get_all_economic_resources(&conductors[0], &alice).await;
    let maintenance_cnc = maintenance_view
        .resources
        .iter()
        .find(|r| {
            r.custodian == bob.agent_pubkey().clone()
                && r.state == zome_resource_integrity::ResourceState::Maintenance
        });
    assert!(maintenance_cnc.is_some(), "Maintenance CNC should be visible");

    // Complete maintenance and return to active.
    let maintenance_complete: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: maintenance_start.signed_action.hashed.hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 5: Temporary custody transfer for specific project.
    // Bob transfers back to Alice for a project.
    let project_transfer: TransferCustodyOutputMirror = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: maintenance_complete.signed_action.hashed.hash.clone(),
                new_custodian: alice.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        project_transfer.updated_resource.custodian,
        alice.agent_pubkey().clone()
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let alice_for_project: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    assert!(
        !alice_for_project.is_empty(),
        "Alice should have at least 1 resource for the project"
    );

    // Phase 6: Return to permanent steward.
    let return_transfer: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: project_transfer.updated_resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    assert_eq!(
        return_transfer.updated_resource.custodian,
        bob.agent_pubkey().clone()
    );

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let bob_final: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    assert!(
        !bob_final.is_empty(),
        "Bob should have at least 1 resource as permanent steward"
    );

    // Final verification: governance rules are still effective.
    let final_spec_rules: GetResourceSpecWithRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resource_specification_with_rules",
            expensive_spec.spec_hash.clone(),
        )
        .await;
    assert_eq!(final_spec_rules.governance_rules.len(), 3);

    // Alice remains the contributor.
    let alice_still_contributor: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    assert!(alice_still_contributor, "Alice should still be a contributor");
}

// ---------------------------------------------------------------------------
// Scenario 4: Multi-agent resource ecosystem and discovery workflow
// (Partially translated - complex scenario with cross-custody patterns)
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn multi_agent_resource_ecosystem_and_discovery() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Phase 1: Diverse resource creation by both agents.
    let course_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Permaculture Design Course".to_string(),
            description: "Comprehensive permaculture design training program".to_string(),
            category: "knowledge".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "community".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "participation_requirement".to_string(),
                rule_data: r#"{"commitment_hours":72,"field_work_required":true}"#.to_string(),
                enforced_by: Some("Course Coordinator".to_string()),
            }],
        },
    )
    .await;

    pause_ms(100).await;

    let kitchen_spec = create_resource_specification(
        &conductors[0],
        &alice,
        ResourceSpecificationInput {
            name: "Community Kitchen".to_string(),
            description: "Shared commercial kitchen for food processing".to_string(),
            category: "space".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "verified".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "food_safety".to_string(),
                rule_data: r#"{"certification_required":true,"cleaning_protocols":"strict"}"#
                    .to_string(),
                enforced_by: Some("Food Safety Coordinator".to_string()),
            }],
        },
    )
    .await;

    pause_ms(100).await;

    let web_dev_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Web Development Services".to_string(),
            description: "Custom web development for community projects".to_string(),
            category: "service".to_string(),
            image_url: None,
            tags: vec!["community".to_string(), "verified".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "project_scope".to_string(),
                rule_data: r#"{"community_projects_priority":true,"max_project_duration_months":6}"#
                    .to_string(),
                enforced_by: Some("Tech Coordinator".to_string()),
            }],
        },
    )
    .await;

    pause_ms(100).await;

    let van_fleet_spec = create_resource_specification(
        &conductors[1],
        &bob,
        ResourceSpecificationInput {
            name: "Delivery Van Fleet".to_string(),
            description: "Electric delivery vans for community logistics".to_string(),
            category: "equipment".to_string(),
            image_url: None,
            tags: vec!["shared".to_string(), "community".to_string()],
            governance_rules: vec![GovernanceRuleInput {
                rule_type: "driver_requirements".to_string(),
                rule_data: r#"{"commercial_license":true,"eco_driving_training":true}"#.to_string(),
                enforced_by: Some("Fleet Manager".to_string()),
            }],
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 2: Create economic resources with varied quantities.
    let course_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: course_spec.spec_hash.clone(),
            quantity: 4.0,
            unit: "sessions".to_string(),
            current_location: Some("Community Center - Room 201".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let kitchen_resource = create_economic_resource(
        &conductors[0],
        &alice,
        EconomicResourceInput {
            spec_hash: kitchen_spec.spec_hash.clone(),
            quantity: 1.0,
            unit: "kitchen".to_string(),
            current_location: Some("Building B - Ground Floor".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let web_dev_resource = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: web_dev_spec.spec_hash.clone(),
            quantity: 100.0,
            unit: "hours".to_string(),
            current_location: Some("Remote/Distributed".to_string()),
        },
    )
    .await;

    pause_ms(100).await;

    let van_resource = create_economic_resource(
        &conductors[1],
        &bob,
        EconomicResourceInput {
            spec_hash: van_fleet_spec.spec_hash.clone(),
            quantity: 3.0,
            unit: "vehicles".to_string(),
            current_location: Some("Community Garage - Bays 1-3".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 3: Mixed resource state management.
    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: course_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    pause_ms(100).await;

    // Kitchen under renovation.
    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: kitchen_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Maintenance,
            },
        )
        .await;

    pause_ms(100).await;

    let _: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: web_dev_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Active,
            },
        )
        .await;

    pause_ms(100).await;

    // Vans reserved for special project.
    let _: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "update_resource_state",
            UpdateResourceStateInput {
                resource_hash: van_resource.resource_hash.clone(),
                new_state: zome_resource_integrity::ResourceState::Reserved,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Phase 4: Comprehensive discovery testing.
    let all_specs_alice = get_all_resource_specifications(&conductors[0], &alice).await;
    let all_specs_bob = get_all_resource_specifications(&conductors[1], &bob).await;
    let all_resources_alice = get_all_economic_resources(&conductors[0], &alice).await;
    let all_resources_bob = get_all_economic_resources(&conductors[1], &bob).await;

    assert_eq!(all_specs_alice.specifications.len(), 4);
    assert_eq!(all_specs_bob.specifications.len(), 4);
    assert_eq!(all_resources_alice.resources.len(), 4);
    assert_eq!(all_resources_bob.resources.len(), 4);

    // Verify category diversity.
    let mut categories: Vec<&str> = all_specs_alice
        .specifications
        .iter()
        .map(|s| s.category.as_str())
        .collect();
    categories.sort();
    categories.dedup();
    assert_eq!(
        categories.len(),
        4,
        "Expected 4 different categories, got {:?}",
        categories
    );

    // Verify state diversity.
    let mut states: Vec<String> = all_resources_alice
        .resources
        .iter()
        .map(|r| format!("{:?}", r.state))
        .collect();
    states.sort();
    states.dedup();
    assert!(
        states.len() >= 3,
        "Expected at least 3 different states, got {:?}",
        states
    );

    // Phase 5: Cross-agent custody patterns.
    // Alice transfers course resource to Bob.
    let _course_transfer: TransferCustodyOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: course_resource.resource_hash.clone(),
                new_custodian: bob.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    // Bob transfers web dev services to Alice.
    let _web_dev_transfer: TransferCustodyOutputMirror = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "transfer_custody",
            TransferCustodyInput {
                resource_hash: web_dev_resource.resource_hash.clone(),
                new_custodian: alice.agent_pubkey().clone(),
                request_contact_info: None,
            },
        )
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Each should still have 2 resources, but different ones.
    let alice_after_swap: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;
    let bob_after_swap: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_my_economic_resources",
            (),
        )
        .await;

    assert_eq!(alice_after_swap.len(), 2, "Alice should have 2 resources after swap");
    assert_eq!(bob_after_swap.len(), 2, "Bob should have 2 resources after swap");

    // Phase 6: Specification-resource relationship validation.
    let course_resources: Vec<Link> = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_resources_by_specification",
            course_spec.spec_hash.clone(),
        )
        .await;
    let web_dev_resources: Vec<Link> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            web_dev_spec.spec_hash.clone(),
        )
        .await;

    assert_eq!(course_resources.len(), 1);
    assert_eq!(web_dev_resources.len(), 1);

    // Phase 7: Community contribution validation.
    let alice_contribution: bool = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "check_first_resource_requirement",
            alice.agent_pubkey().clone(),
        )
        .await;
    let bob_contribution: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_first_resource_requirement",
            bob.agent_pubkey().clone(),
        )
        .await;

    assert!(alice_contribution, "Alice should have contributions");
    assert!(bob_contribution, "Bob should have contributions");

    // Verify governance rule ecosystem.
    let all_governance: GetAllGovernanceRulesOutputMirror = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_all_governance_rules",
            (),
        )
        .await;
    assert!(
        all_governance.rules.len() >= 4,
        "Expected at least 4 governance rules, got {}",
        all_governance.rules.len()
    );
}
