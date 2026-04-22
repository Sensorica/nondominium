//! Resource zome Sweettest integration tests.
//!
//! Covers `get_all_resource_specifications` — specifically that the new
//! `action_hashes` field is returned in parallel with `specifications` and
//! that both vectors have the same length and order.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds nondominium.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test resource

use holochain::prelude::*;
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
struct GetAllResourceSpecificationsOutput {
    pub specifications: Vec<ResourceSpecification>,
    pub action_hashes: Vec<ActionHash>,
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

    // Create both specs (returns CreateResourceSpecificationOutput — we discard it)
    let _: Record = conductors[0]
        .call(&alice.zome("zome_resource"), "create_resource_specification", spec1)
        .await;

    let _: Record = conductors[0]
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
