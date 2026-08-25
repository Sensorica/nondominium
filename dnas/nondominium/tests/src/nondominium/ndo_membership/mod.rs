//! NDO membership Sweettest integration tests.
//!
//! Covers `join_ndo` / `get_ndo_members` / `is_ndo_member`: the round trip, the
//! idempotency guard, cross-agent convergence, and rejection of a membership that
//! points at an identity this cell does not hold.
//!
//! Membership records *participation*, not access. Under the per-NDO-cell model an
//! agent already holds the cell to read the NDO at all, so nothing here asserts that
//! a non-member is denied a read — that would encode a guarantee the design does not
//! make (see ndo_membership.rs module docs).
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test nondominium ndo_membership -- --test-threads 6

use holochain::prelude::*;
use holochain::sweettest::*;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror types — the test binary cannot import WASM-compiled zome crates.
// Field and variant names must match the zome types; order does not matter.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum LifecycleStage {
    Ideation,
    Specification,
    Development,
    Prototype,
    Stable,
    Distributed,
    Active,
    Hibernating,
    Deprecated,
    EndOfLife,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum PropertyRegime {
    Private,
    Commons,
    Collective,
    Pool,
    CommonPool,
    Nondominium,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum ResourceNature {
    Physical,
    Digital,
    Service,
    Hybrid,
    Information,
}

/// Mirrors `zome_resource_coordinator::NdoInput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoInput {
    pub name: String,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub description: Option<String>,
}

/// Mirrors `zome_resource_coordinator::NdoOutput` (only the field we need).
#[derive(Debug, Deserialize)]
struct NdoOutput {
    pub action_hash: ActionHash,
}

/// Mirrors `zome_resource_coordinator::JoinNdoInput`.
#[derive(Debug, Serialize)]
struct JoinNdoInput {
    pub ndo_identity_hash: ActionHash,
    pub role: Option<String>,
}

fn ndo_input(name: &str) -> NdoInput {
    NdoInput {
        name: name.to_string(),
        property_regime: PropertyRegime::Commons,
        resource_nature: ResourceNature::Digital,
        lifecycle_stage: LifecycleStage::Ideation,
        description: None,
    }
}

fn join_input(hash: ActionHash) -> JoinNdoInput {
    JoinNdoInput {
        ndo_identity_hash: hash,
        role: None,
    }
}

// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ndo_membership_join_round_trip() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input("Round Trip NDO"),
        )
        .await;

    // Creating an NDO does not join it — participation is an explicit act.
    let members_before: Vec<AgentPubKey> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_members",
            ndo.action_hash.clone(),
        )
        .await;
    assert!(
        members_before.is_empty(),
        "creating an NDO must not implicitly create membership"
    );

    let alice_key = alice.agent_pubkey().clone();
    let is_member_before: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "is_ndo_member",
            (alice_key.clone(), ndo.action_hash.clone()),
        )
        .await;
    assert!(!is_member_before, "initiator is not a member until joining");

    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "join_ndo",
            join_input(ndo.action_hash.clone()),
        )
        .await;

    let members: Vec<AgentPubKey> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_members",
            ndo.action_hash.clone(),
        )
        .await;
    assert_eq!(members, vec![alice_key.clone()], "joiner must be listed");

    let is_member: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "is_ndo_member",
            (alice_key, ndo.action_hash),
        )
        .await;
    assert!(is_member, "is_ndo_member must be true after join");
}

#[tokio::test(flavor = "multi_thread")]
async fn ndo_membership_double_join_is_rejected() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input("Double Join NDO"),
        )
        .await;

    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "join_ndo",
            join_input(ndo.action_hash.clone()),
        )
        .await;

    let second: Result<Record, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "join_ndo",
            join_input(ndo.action_hash.clone()),
        )
        .await;
    assert!(
        second.is_err(),
        "a second join from the same agent must be rejected (AlreadyMember)"
    );

    // The rejection must leave exactly one membership, not a duplicate.
    let members: Vec<AgentPubKey> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_members",
            ndo.action_hash,
        )
        .await;
    assert_eq!(members.len(), 1, "double join must not duplicate membership");
}

#[tokio::test(flavor = "multi_thread")]
async fn ndo_membership_join_unknown_identity_rejected() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    // A syntactically valid ActionHash that is not a NondominiumIdentity in this cell.
    // Using a real-but-wrong hash (an NDO's own membership record would also do) proves
    // the check is about identity existence, not hash shape.
    let bogus = ActionHash::from_raw_36(vec![0xdb; 36]);

    let result: Result<Record, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "join_ndo",
            join_input(bogus),
        )
        .await;
    assert!(
        result.is_err(),
        "joining an identity this cell does not hold must be rejected"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn ndo_membership_two_agents_converge() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let ndo: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input("Shared NDO"),
        )
        .await;

    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "join_ndo",
            join_input(ndo.action_hash.clone()),
        )
        .await;

    await_consistency_20_s([&alice, &bob]).await.unwrap();

    let _: Record = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "join_ndo",
            join_input(ndo.action_hash.clone()),
        )
        .await;

    await_consistency_20_s([&alice, &bob]).await.unwrap();

    // Both agents must see both members. This is the claim that would fail if
    // get_ndo_members did a per-link `get` instead of reading the link author:
    // the peer's membership record may not be held by this shard yet.
    for (conductor_idx, cell, who) in [(0usize, &alice, "alice"), (1usize, &bob, "bob")] {
        let members: Vec<AgentPubKey> = conductors[conductor_idx]
            .call(
                &cell.zome("zome_resource"),
                "get_ndo_members",
                ndo.action_hash.clone(),
            )
            .await;
        assert_eq!(
            members.len(),
            2,
            "{who} must see both members, saw {members:?}"
        );
        assert!(
            members.contains(alice.agent_pubkey()) && members.contains(bob.agent_pubkey()),
            "{who} must see alice and bob, saw {members:?}"
        );
    }

    // Cross-agent is_ndo_member: alice can confirm bob is taking part.
    let bob_is_member: bool = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "is_ndo_member",
            (bob.agent_pubkey().clone(), ndo.action_hash),
        )
        .await;
    assert!(bob_is_member, "alice must see bob as a member");
}
