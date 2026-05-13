//! Lobby DNA Sweettest integration tests.
//!
//! Covers:
//!   - announce_ndo: single-agent creation and cross-conductor discovery
//!   - upsert_lobby_agent_profile: create and update
//!   - get_my_groups: returns solo workspace stub
//!
//! Prerequisites:
//!   bun run build:happ   # builds lobby.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --package lobby_sweettest --test lobby

use holochain::prelude::*;
use holochain::sweettest::*;
use serde::{Deserialize, Serialize};

use crate::common::*;
// Input and stub types come directly from the shared crate — no mirror needed.
use nondominium_shared::io::lobby::{AnnounceNdoInput, GroupDescriptorStub, LobbyAgentProfileInput};
use nondominium_shared::types::{LifecycleStage, PropertyRegime, ResourceNature};

// ─── Local output types (contain NdoAnnouncement / LobbyAgentProfile from the
//     integrity zome which is a WASM crate — kept here as partial assertion views) ──

/// Partial view of NdoAnnouncement for test assertions.
#[derive(Debug, Serialize, Deserialize)]
struct NdoAnnouncementRecord {
    pub action_hash: ActionHash,
    pub entry: NdoAnnouncementEntry,
}

/// Subset of NdoAnnouncement fields used for assertions.
#[derive(Debug, Serialize, Deserialize)]
struct NdoAnnouncementEntry {
    pub ndo_name: String,
    pub network_seed: String,
    pub registered_by: AgentPubKey,
}

// ─── Decode helper ────────────────────────────────────────────────────────────

fn decode_record_entry<T: serde::de::DeserializeOwned + std::fmt::Debug>(record: &Record) -> T {
    match record.entry().as_option() {
        Some(holochain::prelude::Entry::App(app_bytes)) => {
            holochain_serialized_bytes::decode(app_bytes.bytes())
                .expect("entry deserialization failed")
        }
        _ => panic!("expected Present App entry, got: {:?}", record.entry()),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[tokio::test(flavor = "multi_thread")]
async fn announce_ndo_single_agent() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    let ndo_dna_hash = DnaHash::from_raw_36(vec![0u8; 36]);
    let ndo_identity_hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_ndo",
            AnnounceNdoInput {
                ndo_name: "Test Electronic Device".to_string(),
                ndo_dna_hash: ndo_dna_hash.clone(),
                network_seed: "test-seed-001".to_string(),
                ndo_identity_hash: ActionHash::from_raw_36(vec![1u8; 36]),
                lifecycle_stage: LifecycleStage::Active,
                property_regime: PropertyRegime::Nondominium,
                resource_nature: ResourceNature::Physical,
                description: Some("A test NDO".to_string()),
            },
        )
        .await;

    // Alice should be able to read her own announcement
    let announcements: Vec<NdoAnnouncementRecord> = conductors[0]
        .call(&cell_alice.zome("zome_lobby"), "get_all_ndo_announcements", ())
        .await;

    assert_eq!(announcements.len(), 1, "expected 1 announcement");
    assert_eq!(announcements[0].entry.ndo_name, "Test Electronic Device");
    let _ = ndo_identity_hash;
}

#[tokio::test(flavor = "multi_thread")]
async fn announce_ndo_cross_conductor() {
    let (conductors, cell_alice, cell_bob) = setup_two_lobby_agents().await;

    let _hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_ndo",
            AnnounceNdoInput {
                ndo_name: "Power Supply NDO".to_string(),
                ndo_dna_hash: DnaHash::from_raw_36(vec![2u8; 36]),
                network_seed: "test-seed-002".to_string(),
                ndo_identity_hash: ActionHash::from_raw_36(vec![2u8; 36]),
                lifecycle_stage: LifecycleStage::Stable,
                property_regime: PropertyRegime::Commons,
                resource_nature: ResourceNature::Physical,
                description: None,
            },
        )
        .await;

    // Wait for DHT consistency between Alice and Bob
    await_consistency(10, &[&cell_alice, &cell_bob])
        .await
        .expect("DHT consistency timeout");

    // Bob should see Alice's announcement via the global anchor
    let bob_announcements: Vec<NdoAnnouncementRecord> = conductors[1]
        .call(&cell_bob.zome("zome_lobby"), "get_all_ndo_announcements", ())
        .await;

    assert!(
        !bob_announcements.is_empty(),
        "Bob should see at least 1 announcement from Alice"
    );
    assert_eq!(bob_announcements[0].entry.ndo_name, "Power Supply NDO");
}

#[tokio::test(flavor = "multi_thread")]
async fn upsert_lobby_agent_profile() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    // Create initial profile
    let _hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "upsert_lobby_agent_profile",
            LobbyAgentProfileInput {
                handle: "alice_ovn".to_string(),
                avatar_url: None,
                bio: Some("Open hardware contributor".to_string()),
            },
        )
        .await;

    // Retrieve and verify
    let profile: Option<serde_json::Value> = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "get_lobby_agent_profile",
            cell_alice.agent_pubkey().clone(),
        )
        .await;

    assert!(profile.is_some(), "profile should exist after upsert");

    // Update profile
    let _updated_hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "upsert_lobby_agent_profile",
            LobbyAgentProfileInput {
                handle: "alice_sensorica".to_string(),
                avatar_url: Some("https://example.com/alice.png".to_string()),
                bio: Some("Sensorica network contributor".to_string()),
            },
        )
        .await;
}

#[tokio::test(flavor = "multi_thread")]
async fn get_my_groups_returns_stub() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    let groups: Vec<GroupDescriptorStub> = conductors[0]
        .call(&cell_alice.zome("zome_lobby"), "get_my_groups", ())
        .await;

    assert_eq!(groups.len(), 1, "should return solo workspace stub");
    assert!(groups[0].is_solo, "stub group should be marked as solo");
    assert_eq!(groups[0].id, "solo");
}
