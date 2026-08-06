//! Resource zome Sweettest integration tests.
//!
//! Covers `get_all_resource_specifications` — specifically that the new
//! `action_hashes` field is returned in parallel with `specifications` and
//! that both vectors have the same length and order.
//!
//! Covers `OperationalState` on `EconomicResource`: default on create,
//! `update_operational_state`, and `get_resources_by_operational_state`.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds nondominium.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test resource

use holochain::prelude::*;
use nondominium_shared::types::OperationalState;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror structs — avoids importing zome crates into the test binary.
// These must match the serialized form of their counterparts in the zomes.
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
struct GovernanceRuleInput {
    pub rule_type: String,
    pub rule_data: String,
    pub enforced_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub governance_rules: Vec<GovernanceRuleInput>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateResourceSpecificationOutput {
    pub spec_hash: ActionHash,
    pub spec: ResourceSpecification,
    pub governance_rule_hashes: Vec<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GetAllResourceSpecificationsOutput {
    pub specifications: Vec<ResourceSpecification>,
    pub action_hashes: Vec<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EconomicResource {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,
    pub current_location: Option<String>,
    pub operational_state: OperationalState,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResource,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateOperationalStateInput {
    pub resource_hash: ActionHash,
    pub new_operational_state: OperationalState,
}

fn decode_record_entry<T: serde::de::DeserializeOwned>(record: &Record) -> T {
    match record.entry().as_option() {
        Some(Entry::App(app_bytes)) => {
            holochain_serialized_bytes::decode(app_bytes.bytes()).expect("entry deserialization failed")
        }
        _ => panic!("expected Present App entry"),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// `get_all_resource_specifications` returns both `specifications` and
/// `action_hashes` as parallel vectors of the same length.
#[tokio::test(flavor = "multi_thread")]
async fn get_all_resource_specifications_returns_parallel_hashes() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let spec1 = ResourceSpecificationInput {
        name: "Shared Bicycle".to_string(),
        description: "A community pedal-powered vehicle".to_string(),
        category: "Transportation".to_string(),
        image_url: None,
        tags: vec!["transport".to_string()],
        governance_rules: vec![],
    };

    let spec2 = ResourceSpecificationInput {
        name: "Safety Helmet".to_string(),
        description: "Protective headgear for cyclists".to_string(),
        category: "Safety".to_string(),
        image_url: None,
        tags: vec!["safety".to_string()],
        governance_rules: vec![],
    };

    // Create both specs — discard the output, we only care about get_all below
    let _: CreateResourceSpecificationOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_resource_specification", spec1)
        .await;

    let _: CreateResourceSpecificationOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_resource_specification", spec2)
        .await;

    // Fetch all specs
    let output: GetAllResourceSpecificationsOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "get_all_resource_specifications", ())
        .await;

    // Both vectors must be non-empty and equal in length
    assert!(
        output.specifications.len() >= 2,
        "expected at least 2 specifications, got {}",
        output.specifications.len()
    );
    assert_eq!(
        output.specifications.len(),
        output.action_hashes.len(),
        "specifications and action_hashes must have the same length"
    );

    // Verify both created specs appear by name
    let names: Vec<&str> = output.specifications.iter().map(|s| s.name.as_str()).collect();
    assert!(
        names.contains(&"Shared Bicycle"),
        "expected 'Shared Bicycle' in specifications"
    );
    assert!(
        names.contains(&"Safety Helmet"),
        "expected 'Safety Helmet' in specifications"
    );

    // Every action hash must be 39 bytes (Holochain ActionHash length)
    for (i, hash) in output.action_hashes.iter().enumerate() {
        assert_eq!(
            hash.get_raw_39().len(),
            39,
            "action_hash at index {} is not 39 bytes",
            i
        );
    }
}

/// New economic resources default to `PendingValidation`; custodian can update
/// operational state and query by operational state anchor.
#[tokio::test(flavor = "multi_thread")]
async fn economic_resource_operational_state_lifecycle() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let spec_input = ResourceSpecificationInput {
        name: "Operational Drill".to_string(),
        description: "Cordless drill for shared use".to_string(),
        category: "tools".to_string(),
        image_url: None,
        tags: vec!["tools".to_string()],
        governance_rules: vec![],
    };

    let spec_out: CreateResourceSpecificationOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input,
        )
        .await;

    let resource_input = EconomicResourceInput {
        spec_hash: spec_out.spec_hash.clone(),
        quantity: 1.0,
        unit: "piece".to_string(),
        current_location: Some("Workshop".to_string()),
    };

    let create_out: CreateEconomicResourceOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_economic_resource",
            resource_input,
        )
        .await;

    assert_eq!(
        create_out.resource.operational_state,
        OperationalState::PendingValidation,
        "new instances must start PendingValidation"
    );

    let pending_records: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_operational_state",
            OperationalState::PendingValidation,
        )
        .await;

    assert!(
        pending_records.iter().any(|r| {
            decode_record_entry::<EconomicResource>(r).operational_state
                == OperationalState::PendingValidation
        }),
        "PendingValidation query should include the new resource"
    );

    let updated: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_operational_state",
            UpdateOperationalStateInput {
                resource_hash: create_out.resource_hash.clone(),
                new_operational_state: OperationalState::InUse,
            },
        )
        .await;

    let updated_resource: EconomicResource = decode_record_entry(&updated);
    assert_eq!(
        updated_resource.operational_state,
        OperationalState::InUse,
        "operational state should update to InUse"
    );

    let in_use_records: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_operational_state",
            OperationalState::InUse,
        )
        .await;

    assert_eq!(
        in_use_records.len(),
        1,
        "exactly one resource should be InUse after update"
    );

    let pending_after: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_operational_state",
            OperationalState::PendingValidation,
        )
        .await;

    assert!(
        pending_after.is_empty(),
        "PendingValidation anchor should no longer list the resource"
    );
}
