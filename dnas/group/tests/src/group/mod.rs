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
use holochain::sweettest::*;
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

// Mirror structs reflect the lean entry shapes after removing action-header-redundant fields.
// Author and timestamp are read from the Record's action (record.action().author() /
// record.action().timestamp()), not from entry fields.

#[derive(Debug, Serialize, Deserialize)]
struct GroupProfileOutput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GroupMembershipOutput {
    pub group_hash: ActionHash,
    pub role: Option<String>,
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
    pub description: String,
    pub hours: f32,
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

/// `get_group` retrieves a group profile by its action hash.
#[tokio::test(flavor = "multi_thread")]
async fn get_group_by_hash() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Retrievable Group".to_string(),
        description: Some("Fetched by hash".to_string()),
    };

    let created: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let group_hash = created.action_address().clone();

    let fetched: Option<Record> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_group", group_hash)
        .await;

    let profile: GroupProfileOutput =
        decode_record_entry(&fetched.expect("get_group should return Some for a valid hash"));

    assert_eq!(profile.name, "Retrievable Group");
    assert_eq!(profile.description, Some("Fetched by hash".to_string()));
}

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

// get_all_groups_returns_created_group removed: get_all_groups was removed because it is
// semantically misleading in the one-group-per-cell model. Use get_my_group instead.

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
    await_consistency_s(20, [&cell_alice, &cell_bob])
        .await
        .unwrap();

    // get_group_members returns Vec<AgentPubKey> read from each GroupToMembers
    // link's author (the joining agent). Membership identity no longer depends on
    // a per-member `get` of the GroupMembership record, which could be absent from
    // the local DHT shard before full sync.
    let members: Vec<AgentPubKey> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_group_members",
            group_hash,
        )
        .await;

    let bob_key = cell_bob.agent_pubkey().clone();

    assert!(
        members.iter().any(|m| *m == bob_key),
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

    await_consistency_s(20, [&cell_alice, &cell_bob])
        .await
        .unwrap();

    let _: () = conductors[1]
        .call(
            &cell_bob.zome("zome_group"),
            "leave_group",
            group_hash.clone(),
        )
        .await;

    await_consistency_s(20, [&cell_alice, &cell_bob])
        .await
        .unwrap();

    let members: Vec<AgentPubKey> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_group_members",
            group_hash,
        )
        .await;

    let bob_key = cell_bob.agent_pubkey().clone();

    assert!(
        !members.iter().any(|m| *m == bob_key),
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

    // get_work_logs returns Vec<Record>; decode entry for content assertions
    let log_records: Vec<Record> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_work_logs", group_hash)
        .await;

    assert_eq!(log_records.len(), 1, "should have exactly one work log");
    let log: WorkLogOutput = decode_record_entry(&log_records[0]);
    assert_eq!(log.description, "Testing the work log feature");
    assert!(
        (log.hours - 2.5).abs() < f32::EPSILON,
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

    // get_soft_links returns Vec<Record>; decode entry for content assertions
    let sl_records: Vec<Record> = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "get_soft_links",
            group_hash,
        )
        .await;

    assert_eq!(sl_records.len(), 1, "should have exactly one soft link");
    let sl: SoftLinkOutput = decode_record_entry(&sl_records[0]);
    assert_eq!(
        sl.description,
        Some("Planning link to an NDO".to_string())
    );
}

/// `get_my_group` returns the GroupProfile created in this cell.
#[tokio::test(flavor = "multi_thread")]
async fn get_my_group_returns_created_group() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "My Group".to_string(),
        description: Some("Testing get_my_group".to_string()),
    };

    let _record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let maybe_record: Option<Record> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_my_group", ())
        .await;

    assert!(maybe_record.is_some(), "get_my_group should return the group created in this cell");
    let profile: GroupProfileOutput = decode_record_entry(&maybe_record.unwrap());
    assert_eq!(profile.name, "My Group");
}

/// `is_member` returns true after join and false for a non-member.
#[tokio::test(flavor = "multi_thread")]
async fn is_member_reflects_membership_state() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Membership Test Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let group_hash = group_record.action_address().clone();
    let bob_key = cell_bob.agent_pubkey().clone();

    // Before join: bob is not a member
    let is_member_before: bool = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "is_member",
            (bob_key.clone(), group_hash.clone()),
        )
        .await;
    assert!(!is_member_before, "bob should not be a member before joining");

    // Bob joins
    let _: Record = conductors[1]
        .call(&cell_bob.zome("zome_group"), "join_group", group_hash.clone())
        .await;

    await_consistency_s(20, [&cell_alice, &cell_bob])
        .await
        .unwrap();

    // After join: bob is a member
    let is_member_after: bool = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "is_member",
            (bob_key, group_hash),
        )
        .await;
    assert!(is_member_after, "bob should be a member after joining");
}

/// Second `join_group` call by the same agent must return `AlreadyMember` error.
#[tokio::test(flavor = "multi_thread")]
async fn duplicate_join_returns_already_member_error() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Duplicate Join Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let group_hash = group_record.action_address().clone();

    // First join — should succeed
    let _: Record = conductors[1]
        .call(&cell_bob.zome("zome_group"), "join_group", group_hash.clone())
        .await;

    // Second join — should error with AlreadyMember
    let second_join_result: Result<Record, _> = conductors[1]
        .call_fallible(&cell_bob.zome("zome_group"), "join_group", group_hash)
        .await;

    assert!(
        second_join_result.is_err(),
        "second join_group call should return an error (AlreadyMember)"
    );
}

/// `create_group` with an empty name must be rejected by the integrity zome.
#[tokio::test(flavor = "multi_thread")]
async fn empty_group_name_rejected() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "".to_string(),
        description: None,
    };

    let result: Result<Record, _> = conductors[0]
        .call_fallible(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    assert!(
        result.is_err(),
        "creating a group with an empty name should be rejected"
    );
}

/// `log_work` with `hours = 0` must be rejected by the integrity zome.
#[tokio::test(flavor = "multi_thread")]
async fn work_log_zero_hours_rejected() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let group_input = GroupProfileInput {
        name: "Zero Hours Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", group_input)
        .await;

    let group_hash = group_record.action_address().clone();

    let work_input = WorkLogInput {
        group_hash,
        description: "Should fail due to zero hours".to_string(),
        hours: 0.0,
    };

    let result: Result<Record, _> = conductors[0]
        .call_fallible(&cell_alice.zome("zome_group"), "log_work", work_input)
        .await;

    assert!(
        result.is_err(),
        "log_work with hours = 0 should be rejected"
    );
}

/// `get_my_work_logs` returns only the logs authored by the calling agent.
#[tokio::test(flavor = "multi_thread")]
async fn get_my_work_logs_returns_own_logs() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;

    let group_input = GroupProfileInput {
        name: "My Work Logs Group".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", group_input)
        .await;

    let group_hash = group_record.action_address().clone();

    // Alice logs work
    let alice_work = WorkLogInput {
        group_hash: group_hash.clone(),
        description: "Alice's contribution".to_string(),
        hours: 3.0,
    };
    let _: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "log_work", alice_work)
        .await;

    // Bob also logs work (requires bob to have the group hash — we pass it directly)
    let bob_work = WorkLogInput {
        group_hash,
        description: "Bob's contribution".to_string(),
        hours: 1.5,
    };
    let _: Record = conductors[1]
        .call(&cell_bob.zome("zome_group"), "log_work", bob_work)
        .await;

    // Alice queries her own logs — should see only her own entry
    // get_my_work_logs returns Vec<Record>; decode entry for content assertions
    let alice_log_records: Vec<Record> = conductors[0]
        .call(&cell_alice.zome("zome_group"), "get_my_work_logs", ())
        .await;

    assert_eq!(alice_log_records.len(), 1, "alice should see exactly one work log");
    let alice_log: WorkLogOutput = decode_record_entry(&alice_log_records[0]);
    assert_eq!(alice_log.description, "Alice's contribution");
}

/// `update_group` changes the name and creates a `GroupUpdates` link.
#[tokio::test(flavor = "multi_thread")]
async fn update_group_changes_name() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let input = GroupProfileInput {
        name: "Original Name".to_string(),
        description: None,
    };

    let group_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_group", input)
        .await;

    let original_hash = group_record.action_address().clone();

    #[derive(Debug, Serialize, Deserialize)]
    struct UpdateGroupInput {
        pub previous_action_hash: ActionHash,
        pub original_action_hash: ActionHash,
        pub updated_name: String,
        pub updated_description: Option<String>,
    }

    let update_input = UpdateGroupInput {
        previous_action_hash: original_hash.clone(),
        original_action_hash: original_hash,
        updated_name: "Updated Name".to_string(),
        updated_description: Some("Now with a description".to_string()),
    };

    let updated_record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "update_group", update_input)
        .await;

    let updated_profile: GroupProfileOutput = decode_record_entry(&updated_record);

    assert_eq!(updated_profile.name, "Updated Name");
    assert_eq!(
        updated_profile.description,
        Some("Now with a description".to_string())
    );
}
