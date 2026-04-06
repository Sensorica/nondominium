//! Person zome Sweettest integration tests.
//!
//! Covers the hREA bridge: creating a Person entry triggers a cross-DNA
//! `create_rea_agent` call into the hREA DNA, and the resulting ActionHash
//! is stored in `Person.hrea_agent_hash`.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds both nondominium.dna and hrea.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test person

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror structs — avoids importing zome crates into the test binary.
// These must match the serialized form of their counterparts in the zomes.
// ---------------------------------------------------------------------------

/// Mirrors `zome_person_coordinator::PersonInput`.
#[derive(Debug, Serialize, Deserialize)]
struct PersonInput {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

/// Mirrors `zome_person_integrity::Person`.
/// `#[serde(default)]` on `hrea_agent_hash` matches the zome field — required
/// so that entries serialized before the field existed still deserialize.
#[derive(Debug, Serialize, Deserialize)]
struct PersonOutput {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    #[serde(default)]
    pub hrea_agent_hash: Option<ActionHash>,
}

/// Mirrors the ReaAgent entry type from the hREA coordinator zome.
/// Only the fields asserted in these tests are included.
#[derive(Debug, Serialize, Deserialize)]
struct ReaAgent {
    pub id: Option<ActionHash>,
    pub name: String,
    pub agent_type: String,
    pub image: Option<String>,
    pub classified_as: Option<Vec<String>>,
    pub note: Option<String>,
}

// ---------------------------------------------------------------------------
// Decode helper
// ---------------------------------------------------------------------------

/// Extract and msgpack-deserialize the App entry from a Holochain Record.
///
/// Panics if the record has no entry, or if the entry is not an `App` entry,
/// or if deserialization fails. All three cases indicate a programming error
/// (wrong return type annotation on the `conductor.call` site).
fn decode_record_entry<T: serde::de::DeserializeOwned + std::fmt::Debug>(record: &Record) -> T {
    match record.entry().as_option() {
        Some(Entry::App(app_bytes)) => {
            // app_bytes: &AppEntryBytes; Deref<Target=SerializedBytes> gives .bytes() -> &[u8]
            holochain_serialized_bytes::decode(app_bytes.bytes())
                .expect("entry deserialization failed")
        }
        _ => panic!("expected Present App entry"),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Creating a Person in the dual-DNA environment populates `hrea_agent_hash`.
///
/// Verifies that the cross-DNA bridge (`create_rea_agent_bridge`) runs
/// successfully and stores the resulting ActionHash on the Person entry.
#[tokio::test(flavor = "multi_thread")]
async fn person_create_populates_hrea_agent_hash() {
    let (conductors, nd_alice, _hrea_alice, _nd_bob, _hrea_bob) =
        setup_dual_dna_two_agents().await;

    let input = PersonInput {
        name: "Alice".to_string(),
        avatar_url: None,
        bio: None,
    };

    let record: Record = conductors[0]
        .call(&nd_alice.zome("zome_person"), "create_person", input)
        .await;

    let person: PersonOutput = decode_record_entry(&record);

    assert!(
        person.hrea_agent_hash.is_some(),
        "Person.hrea_agent_hash should be populated after dual-DNA creation. \
         If None, the cross-DNA bridge call failed — check hREA DNA is built \
         and both DNA bundles are present in workdir/."
    );
}

/// `get_hrea_agents` retrieves the ReaAgent that was created by `create_person`.
///
/// Verifies the full round-trip:
///   create_person → hrea_agent_hash populated
///   → get_hrea_agents([hash]) → ReaAgent.name matches input
///   → ReaAgent.agent_type == "Person"
///   → ReaAgent.image matches avatar_url input
#[tokio::test(flavor = "multi_thread")]
async fn get_hrea_agents_returns_matching_rea_agent() {
    let (conductors, nd_alice, _hrea_alice, _nd_bob, _hrea_bob) =
        setup_dual_dna_two_agents().await;

    let avatar = "https://example.com/avatar.jpg".to_string();
    let input = PersonInput {
        name: "Bob".to_string(),
        avatar_url: Some(avatar.clone()),
        bio: None,
    };

    let person_record: Record = conductors[0]
        .call(&nd_alice.zome("zome_person"), "create_person", input)
        .await;

    let person: PersonOutput = decode_record_entry(&person_record);
    let hrea_hash = person
        .hrea_agent_hash
        .expect("hrea_agent_hash must be set to test cross-DNA read");

    // Retrieve the ReaAgent from hREA via the cross-DNA read function.
    // No await_consistency needed here — the read goes through the same
    // conductor that just wrote the entry.
    let agents: Vec<Option<Record>> = conductors[0]
        .call(
            &nd_alice.zome("zome_person"),
            "get_hrea_agents",
            vec![hrea_hash],
        )
        .await;

    assert_eq!(agents.len(), 1, "get_hrea_agents should return one entry");

    let agent_record = agents
        .into_iter()
        .next()
        .unwrap()
        .expect("agent record should not be None");

    let rea_agent: ReaAgent = decode_record_entry(&agent_record);

    assert_eq!(
        rea_agent.name, "Bob",
        "ReaAgent.name should match Person.name"
    );
    assert_eq!(
        rea_agent.agent_type, "Person",
        "ReaAgent.agent_type should be 'Person'"
    );
    assert_eq!(
        rea_agent.image,
        Some(avatar),
        "ReaAgent.image should match Person.avatar_url"
    );
}
