//! Group zome Sweettest integration tests.
//!
//! Covers: group creation, membership (join/leave), work logs, and soft links.
//! All tests use local mirror structs — no imports from zome crates.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds group.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --package group_sweettest --test group

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

use group_sweettest::common::*;

// ---------------------------------------------------------------------------
// Mirror structs — match the serialized form of zome entry/input types.
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
struct GroupProfileInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GroupProfileOutput {
    pub name: String,
    pub description: Option<String>,
    pub initiator: AgentPubKey,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct GroupMembershipOutput {
    pub group_hash: ActionHash,
    pub member: AgentPubKey,
    pub role: Option<String>,
    pub joined_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkLogInput {
    pub group_hash: ActionHash,
    pub description: String,
    pub hours: f32,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkLogOutput {
    pub group_hash: ActionHash,
    pub author: AgentPubKey,
    pub description: String,
    pub hours: f32,
    pub logged_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SoftLinkInput {
    pub group_hash: ActionHash,
    pub target_ndo_hash: ActionHash,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SoftLinkOutput {
    pub group_hash: ActionHash,
    pub target_ndo_hash: ActionHash,
    pub description: Option<String>,
    pub created_by: AgentPubKey,
    pub created_at: i64,
}

// ---------------------------------------------------------------------------
// Decode helper
// ---------------------------------------------------------------------------

fn decode_record_entry<T: serde::de::DeserializeOwned + std::fmt::Debug>(record: &Record) -> T {
    match record.entry().as_option() {
        Some(Entry::App(app_bytes)) => {
            holochain_serialized_bytes::decode(app_bytes.bytes())
                .expect("entry deserialization failed")
        }
        _ => panic!("expected Present App entry"),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// `create_group` returns a record with the correct name.
#[tokio::test(flavor = "multi_thread")]
async fn create_group_returns_profile() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Test Group".to_string(),
        description: Some("A test group".to_string()),
    };

    let record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let profile: GroupProfileOutput = decode_record_entry(&record);

    assert_eq!(profile.name, "Test Group");
    assert_eq!(profile.description, Some("A test group".to_string()));
}

/// `get_all_groups` returns at least the group created by alice.
#[tokio::test(flavor = "multi_thread")]
async fn get_all_groups_returns_created_group() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Discovery Group".to_string(),
        description: None,
    };

    let _record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let groups: Vec<Record> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_all_groups", ())
        .await;

    assert!(
        !groups.is_empty(),
        "get_all_groups should return at least the created group"
    );

    let first: GroupProfileOutput = decode_record_entry(&groups[0]);
    assert_eq!(first.name, "Discovery Group");
}

/// `join_group` creates a membership entry visible to alice via `get_group_members`.
#[tokio::test(flavor = "multi_thread")]
async fn join_group_creates_membership() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Membership Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let group_hash = group_record.action_address().clone();

    // Bob joins the group
    let _membership_record: Record = conductors[1]
        .call(&cell_bob.zome("zome_group"), "join_group", group_hash.clone())
        .await;

    // Sync DHT between agents
    await_consistency_20_s(&[&cell_alice, &cell_bob])
        .await
        .unwrap();

    let members: Vec<GroupMembershipOutput> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_group_members",
            group_hash,
        )
        .await;

    let bob_key = conductors[1].keystore().list_keys().await.unwrap()[0].clone();

    assert!(
        members.iter().any(|m| m.member == bob_key),
        "Bob should appear in get_group_members after joining"
    );
}

/// `leave_group` removes the membership; bob should not appear after leaving.
#[tokio::test(flavor = "multi_thread")]
async fn leave_group_removes_membership() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Leave Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let group_hash = group_record.action_address().clone();

    // Bob joins then leaves
    let _: Record = conductors[1]
        .call(&cell_bob.zome("zome_group"), "join_group", group_hash.clone())
        .await;

    await_consistency_20_s(&[&cell_alice, &cell_bob])
        .await
        .unwrap();

    let _: () = conductors[1]
        .call(
            &cell_bob.zome("zome_group"),
            "leave_group",
            group_hash.clone(),
        )
        .await;

    await_consistency_20_s(&[&cell_alice, &cell_bob])
        .await
        .unwrap();

    let members: Vec<GroupMembershipOutput> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_group_members",
            group_hash,
        )
        .await;

    let bob_key = conductors[1].keystore().list_keys().await.unwrap()[0].clone();

    assert!(
        !members.iter().any(|m| m.member == bob_key),
        "Bob should not appear in get_group_members after leaving"
    );
}

/// `log_work` and `get_work_logs` round-trip correctly.
#[tokio::test(flavor = "multi_thread")]
async fn log_work_and_get_work_logs() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let group_input = GroupProfileInput {
        name: "Work Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", group_input)
        .await;

    let group_hash = group_record.action_address().clone();

    let work_input = WorkLogInput {
        group_hash: group_hash.clone(),
        description: "Testing the work log feature".to_string(),
        hours: 2.5,
    };

    let _log_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "log_work", work_input)
        .await;

    let logs: Vec<WorkLogOutput> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_work_logs", group_hash)
        .await;

    assert_eq!(logs.len(), 1, "should have exactly one work log");
    assert_eq!(logs[0].description, "Testing the work log feature");
    assert!(
        (logs[0].hours - 2.5).abs() < f32::EPSILON,
        "hours should be 2.5"
    );
}

/// `create_soft_link` and `get_soft_links` round-trip correctly.
#[tokio::test(flavor = "multi_thread")]
async fn create_soft_link_and_get_soft_links() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let group_input = GroupProfileInput {
        name: "Soft Link Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", group_input)
        .await;

    let group_hash = group_record.action_address().clone();

    // Use the group hash itself as a dummy NDO target hash for test isolation
    let soft_link_input = SoftLinkInput {
        group_hash: group_hash.clone(),
        target_ndo_hash: group_hash.clone(),
        description: Some("Planning link to an NDO".to_string()),
    };

    let _sl_record: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "create_soft_link",
            soft_link_input,
        )
        .await;

    let soft_links: Vec<SoftLinkOutput> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_soft_links",
            group_hash,
        )
        .await;

    assert_eq!(soft_links.len(), 1, "should have exactly one soft link");
    assert_eq!(
        soft_links[0].description,
        Some("Planning link to an NDO".to_string())
    );
}
