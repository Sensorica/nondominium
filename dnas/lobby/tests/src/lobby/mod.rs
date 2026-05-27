//! Lobby DNA Sweettest integration tests.
//!
//! Covers:
//!   - Agent profile: upsert_lobby_agent_profile, get_lobby_agent_profile
//!   - Group registry: announce_group, get_all_group_announcements,
//!     get_my_group_announcements, get_my_groups
//!
//! NDO announcement functions were removed from the Lobby DNA. NDOs are discovered
//! through group cells following the Lobby → Groups → NDOs hierarchy.
//!
//! Prerequisites:
//!   bun run build:happ   # builds lobby.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --package lobby_sweettest --test lobby

use holochain::prelude::*;
use holochain::sweettest::*;
use serde::{Deserialize, Serialize};

use lobby_sweettest::common::*;
use nondominium_shared::io::lobby::{AnnounceGroupInput, GroupDescriptorStub, LobbyAgentProfileInput};

// ─── Local output types ────────────────────────────────────────────────────────

/// Partial view of LobbyAgentProfile for test assertions.
#[derive(Debug, Serialize, Deserialize)]
struct LobbyProfileView {
    pub handle: String,
}

/// Partial view of GroupAnnouncement for test assertions.
#[derive(Debug, Serialize, Deserialize)]
struct GroupAnnouncementEntry {
    pub group_name: String,
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

// ─── Agent profile tests ───────────────────────────────────────────────────────

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
    let profile: Option<LobbyProfileView> = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "get_lobby_agent_profile",
            cell_alice.agent_pubkey().clone(),
        )
        .await;

    assert!(profile.is_some(), "profile should exist after upsert");
    assert_eq!(profile.unwrap().handle, "alice_ovn");

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

// ─── Group announcement tests ─────────────────────────────────────────────────

/// `announce_group` creates an announcement visible via `get_all_group_announcements`.
#[tokio::test(flavor = "multi_thread")]
async fn announce_group_single_agent() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    let group_dna_hash = DnaHash::from_raw_36(vec![0u8; 36]);

    let record: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_group",
            AnnounceGroupInput {
                group_name: "Open Hardware Lab".to_string(),
                group_dna_hash: group_dna_hash.clone(),
                network_seed: "group-seed-001".to_string(),
                description: Some("A group for open hardware projects".to_string()),
            },
        )
        .await;

    let entry: GroupAnnouncementEntry = decode_record_entry(&record);
    assert_eq!(entry.group_name, "Open Hardware Lab");
    assert_eq!(entry.network_seed, "group-seed-001");

    let all_announcements: Vec<Record> = conductors[0]
        .call(&cell_alice.zome("zome_lobby"), "get_all_group_announcements", ())
        .await;

    assert_eq!(all_announcements.len(), 1, "should have exactly one group announcement");
    let ann: GroupAnnouncementEntry = decode_record_entry(&all_announcements[0]);
    assert_eq!(ann.group_name, "Open Hardware Lab");
}

/// `announce_group` cross-conductor: alice announces, bob sees it after DHT sync.
#[tokio::test(flavor = "multi_thread")]
async fn announce_group_cross_conductor() {
    let (conductors, cell_alice, cell_bob) = setup_two_lobby_agents().await;

    let _record: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_group",
            AnnounceGroupInput {
                group_name: "Sensorica Design Group".to_string(),
                group_dna_hash: DnaHash::from_raw_36(vec![1u8; 36]),
                network_seed: "group-seed-002".to_string(),
                description: None,
            },
        )
        .await;

    await_consistency(10, [&cell_alice, &cell_bob])
        .await
        .expect("DHT consistency timeout");

    let bob_announcements: Vec<Record> = conductors[1]
        .call(&cell_bob.zome("zome_lobby"), "get_all_group_announcements", ())
        .await;

    assert!(
        !bob_announcements.is_empty(),
        "Bob should see at least one group announcement after DHT sync"
    );
    // Find by name rather than index: other tests may share the same conductor pool
    let found = bob_announcements.iter().any(|r| {
        decode_record_entry::<GroupAnnouncementEntry>(r).group_name == "Sensorica Design Group"
    });
    assert!(found, "Bob should see the 'Sensorica Design Group' announcement from Alice");
}

/// `get_my_group_announcements` returns only the calling agent's announcements.
#[tokio::test(flavor = "multi_thread")]
async fn get_my_group_announcements_returns_own() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    let _: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_group",
            AnnounceGroupInput {
                group_name: "Alice Group".to_string(),
                group_dna_hash: DnaHash::from_raw_36(vec![2u8; 36]),
                network_seed: "group-seed-003".to_string(),
                description: None,
            },
        )
        .await;

    let my_announcements: Vec<Record> = conductors[0]
        .call(&cell_alice.zome("zome_lobby"), "get_my_group_announcements", ())
        .await;

    assert_eq!(my_announcements.len(), 1, "alice should have exactly one of her own announcements");
    let ann: GroupAnnouncementEntry = decode_record_entry(&my_announcements[0]);
    assert_eq!(ann.group_name, "Alice Group");
}

/// `get_my_groups` returns stubs for the agent's announced groups.
#[tokio::test(flavor = "multi_thread")]
async fn get_my_groups_returns_real_group() {
    let (conductors, cell_alice, _cell_bob) = setup_two_lobby_agents().await;

    // Announce a group first
    let _: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_lobby"),
            "announce_group",
            AnnounceGroupInput {
                group_name: "Test Group".to_string(),
                group_dna_hash: DnaHash::from_raw_36(vec![3u8; 36]),
                network_seed: "my-test-group".to_string(),
                description: None,
            },
        )
        .await;

    let groups: Vec<GroupDescriptorStub> = conductors[0]
        .call(&cell_alice.zome("zome_lobby"), "get_my_groups", ())
        .await;

    assert!(!groups.is_empty(), "get_my_groups should return at least one group after announcing");
    assert!(
        groups.iter().any(|g| g.name == "Test Group"),
        "should find the announced group in the list"
    );
    assert!(
        groups.iter().all(|g| !g.is_solo),
        "real groups should not be marked as solo"
    );
}
