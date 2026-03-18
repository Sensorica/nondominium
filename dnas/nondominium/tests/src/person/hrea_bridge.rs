//! hREA bridge integration tests — translated from `person/person-hrea-bridge-tests.test.ts`.
//!
//! Validates that `create_person` creates a corresponding ReaAgent in the hREA DNA
//! and that `get_hrea_agents` can retrieve that agent via cross-DNA read.
//!
//! Requires the dual-DNA setup (nondominium + hREA) provided by `setup_dual_dna_two_agents`.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// 1. create_person stores hrea_agent_hash in Person entry
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn create_person_stores_hrea_agent_hash() {
    let (conductors, nd_alice, _hrea_alice, _nd_bob, _hrea_bob) =
        setup_dual_dna_two_agents().await;

    let person_input = sample_person("Lynn");
    let record = create_person(&conductors[0], &nd_alice, person_input).await;
    assert!(
        record.signed_action.hashed.hash != ActionHash::from_raw_36(vec![0; 36]),
        "create_person should return a valid record"
    );

    // Decode using the integrity crate type (has #[hdk_entry_helper] = TryFrom<SerializedBytes>)
    let person: zome_person_integrity::Person = record
        .entry
        .to_app_option::<zome_person_integrity::Person>()
        .unwrap()
        .unwrap();
    assert!(
        person.hrea_agent_hash.is_some(),
        "Person should have hrea_agent_hash set after dual-DNA creation"
    );
}

// ---------------------------------------------------------------------------
// 2. get_hrea_agents retrieves ReaAgent created by create_person
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn get_hrea_agents_retrieves_rea_agent_created_by_create_person() {
    let (conductors, nd_alice, _hrea_alice, nd_bob, _hrea_bob) =
        setup_dual_dna_two_agents().await;

    let person_input = sample_person("Lynn");
    let record = create_person(&conductors[0], &nd_alice, person_input.clone()).await;

    // Decode using integrity type which has TryFrom<SerializedBytes>
    let person: zome_person_integrity::Person = record
        .entry
        .to_app_option::<zome_person_integrity::Person>()
        .unwrap()
        .unwrap();
    assert!(
        person.hrea_agent_hash.is_some(),
        "hrea_agent_hash must be set to proceed with cross-DNA read test"
    );
    let hrea_hash = person.hrea_agent_hash.unwrap();

    // Wait for DHT propagation
    await_consistency(Duration::from_secs(60), [&nd_alice, &nd_bob])
        .await
        .unwrap();

    // Retrieve the ReaAgent from hREA via cross-DNA read
    let agents: Vec<Option<Record>> = conductors[0]
        .call(
            &nd_alice.zome("zome_person"),
            "get_hrea_agents",
            vec![hrea_hash],
        )
        .await;

    assert_eq!(agents.len(), 1, "Should return one agent entry");
    assert!(agents[0].is_some(), "Agent record should not be None");

    // Decode the ReaAgent entry using serde_json::Value (hREA integrity crate not available here)
    let agent_record = agents[0].as_ref().unwrap();
    let entry_bytes = match agent_record.entry() {
        RecordEntry::Present(Entry::App(app_bytes)) => app_bytes.as_ref().bytes().to_vec(),
        _ => panic!("Expected App entry for ReaAgent"),
    };
    let rea_agent: serde_json::Value = rmp_serde::from_slice(&entry_bytes)
        .expect("Failed to deserialize ReaAgent from msgpack");

    assert_eq!(rea_agent["name"], "Lynn", "ReaAgent name should match Person name");
    assert_eq!(rea_agent["agent_type"], "Person", "ReaAgent type should be 'Person'");
    let expected_image = person_input.avatar_url.as_deref().unwrap_or("");
    assert_eq!(rea_agent["image"], expected_image, "ReaAgent image should match");
}

// ---------------------------------------------------------------------------
// 3. create_person succeeds when hREA bridge fails gracefully
// ---------------------------------------------------------------------------

#[ignore = "requires single-DNA fixture -- hrea role absent from .happ"]
#[tokio::test(flavor = "multi_thread")]
async fn create_person_succeeds_when_hrea_bridge_fails_gracefully() {
    // This test requires a single-DNA .happ fixture where the hREA role is absent.
    // The dual-DNA environment always has hREA available, so this path cannot
    // be exercised here. Implement once a dedicated single-DNA test bundle exists.
    unimplemented!("Requires single-DNA fixture without hREA DNA");
}
