//! NDO Layer 0 Sweettest integration tests.
//!
//! Covers the complete `NondominiumIdentity` (Layer 0 anchor) lifecycle:
//! creation, retrieval, forward progression, hibernation, deprecation,
//! discovery anchors, and validation enforcement.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ
//!
//! Run all NDO tests:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test nondominium
//!
//! Run a single test:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test nondominium ndo_create_and_get

use holochain::prelude::*;
use holochain::sweettest::*;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror types
//
// The test binary cannot import WASM-compiled zome crates. These types must
// match the serialized form of their counterparts in the zomes.
// Field names and enum variant names must be identical; order does not matter.
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

/// Mirrors `zome_resource_integrity::NondominiumIdentity`.
///
/// `#[serde(default)]` on `successor_ndo_hash` and `hibernation_origin` matches
/// the production struct so entries serialized before those fields existed
/// still deserialize correctly.
#[derive(Debug, Serialize, Deserialize)]
struct NdoEntry {
    pub name: String,
    pub initiator: AgentPubKey,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub created_at: Timestamp,
    pub description: Option<String>,
    #[serde(default)]
    pub successor_ndo_hash: Option<ActionHash>,
    #[serde(default)]
    pub hibernation_origin: Option<LifecycleStage>,
}

/// Mirrors `zome_resource_coordinator::NdoOutput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoOutput {
    pub action_hash: ActionHash,
    pub entry: NdoEntry,
}

/// Mirrors `zome_resource_coordinator::GetAllNdosOutput`.
#[derive(Debug, Serialize, Deserialize)]
struct GetAllNdosOutput {
    pub ndos: Vec<NdoOutput>,
}

/// Mirrors `zome_resource_coordinator::UpdateLifecycleStageInput`.
#[derive(Debug, Serialize, Deserialize)]
struct UpdateLifecycleStageInput {
    pub original_action_hash: ActionHash,
    pub new_stage: LifecycleStage,
    pub successor_ndo_hash: Option<ActionHash>,
    pub transition_event_hash: Option<ActionHash>,
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn ndo_input(
    name: &str,
    regime: PropertyRegime,
    nature: ResourceNature,
    stage: LifecycleStage,
) -> NdoInput {
    NdoInput {
        name: name.to_string(),
        property_regime: regime,
        resource_nature: nature,
        lifecycle_stage: stage,
        description: None,
    }
}

fn update_stage(
    hash: ActionHash,
    stage: LifecycleStage,
    successor: Option<ActionHash>,
) -> UpdateLifecycleStageInput {
    UpdateLifecycleStageInput {
        original_action_hash: hash,
        new_stage: stage,
        successor_ndo_hash: successor,
        transition_event_hash: None,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Create a NondominiumIdentity and retrieve it via the original action hash.
///
/// Verifies that `create_ndo` returns a stable `action_hash` as the permanent
/// Layer 0 identity, and that `get_ndo` resolves the update chain back to
/// the same entry (REQ-NDO-L0-01, REQ-NDO-L0-07).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_create_and_get() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Test NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    assert_eq!(output.entry.name, "Test NDO");
    assert_eq!(output.entry.lifecycle_stage, LifecycleStage::Ideation);
    assert_eq!(output.entry.property_regime, PropertyRegime::Commons);
    assert_eq!(output.entry.resource_nature, ResourceNature::Digital);
    assert!(
        output.entry.successor_ndo_hash.is_none(),
        "successor_ndo_hash must be None at creation"
    );
    assert!(
        output.entry.hibernation_origin.is_none(),
        "hibernation_origin must be None at creation"
    );

    // get_ndo returns Option<NondominiumIdentity> (bare entry, not NdoOutput).
    // It resolves the HDK update chain; same hash works before and after updates.
    let retrieved: Option<NdoEntry> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo",
            output.action_hash.clone(),
        )
        .await;

    let entry = retrieved.expect("get_ndo should return Some for a created NDO");
    assert_eq!(entry.name, "Test NDO");
    assert_eq!(entry.lifecycle_stage, LifecycleStage::Ideation);
}

/// Advance a NondominiumIdentity through multiple lifecycle stages and verify
/// that the original action hash remains the stable Layer 0 identity.
///
/// Also verifies that immutable fields (name, property_regime, resource_nature)
/// are unchanged after lifecycle updates (REQ-NDO-L0-04, REQ-NDO-LC-01).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_lifecycle_forward_progression() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Progression NDO",
                PropertyRegime::Nondominium,
                ResourceNature::Physical,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let original_hash = output.action_hash.clone();

    // Ideation → Specification
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(original_hash.clone(), LifecycleStage::Specification, None),
        )
        .await;

    // Specification → Development
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(original_hash.clone(), LifecycleStage::Development, None),
        )
        .await;

    // get_ndo with the ORIGINAL hash must resolve the update chain to latest
    let entry: Option<NdoEntry> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo",
            original_hash,
        )
        .await;

    let entry = entry.expect("get_ndo must still resolve from the original hash after updates");
    assert_eq!(
        entry.lifecycle_stage,
        LifecycleStage::Development,
        "lifecycle_stage must reflect the latest update"
    );
    // Immutable fields must be unchanged after lifecycle transitions
    assert_eq!(
        entry.name, "Progression NDO",
        "name must not change after lifecycle update (REQ-NDO-L0-04)"
    );
    assert_eq!(
        entry.property_regime,
        PropertyRegime::Nondominium,
        "property_regime must not change after lifecycle update (REQ-NDO-L0-04)"
    );
    assert_eq!(
        entry.resource_nature,
        ResourceNature::Physical,
        "resource_nature must not change after lifecycle update (REQ-NDO-L0-04)"
    );
}

/// Verify that the lifecycle state machine rejects invalid transitions.
///
/// Tests: skipping forward steps and Hibernating self-loops are rejected
/// by integrity validation (REQ-NDO-LC-04).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_invalid_lifecycle_transitions() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Validation NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let hash = output.action_hash.clone();

    // Skip multiple forward steps: Ideation → Active (must follow monotonic chain)
    let skip_result: Result<ActionHash, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Active, None),
        )
        .await;
    assert!(
        skip_result.is_err(),
        "Ideation → Active must be rejected (REQ-NDO-LC-04: monotonic chain)"
    );

    // Valid transition: Ideation → Hibernating is allowed from any non-terminal stage
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Hibernating, None),
        )
        .await;

    // Hibernating → Hibernating self-loop must be rejected
    let self_loop_result: Result<ActionHash, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Hibernating, None),
        )
        .await;
    assert!(
        self_loop_result.is_err(),
        "Hibernating → Hibernating self-loop must be rejected (REQ-NDO-LC-04)"
    );

    // TODO(#76-immutability): Direct mutation of immutable fields (name, property_regime,
    // resource_nature) cannot be triggered through the current coordinator API because
    // update_lifecycle_stage never passes changed immutable fields to update_entry.
    // Testing this path requires either a test-only coordinator function that calls
    // update_entry with a modified entry, or inline zomes. Tracked as future work.
}

/// Verify the Hibernating ↔ origin cycle (REQ-NDO-LC-04, reversible suspension).
///
/// Hibernating must record `hibernation_origin`, and resuming must clear it.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_hibernation_cycle() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Hibernation NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let hash = output.action_hash.clone();

    // Advance to Development so hibernation_origin is meaningful
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Specification, None),
        )
        .await;
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Development, None),
        )
        .await;

    // Suspend: Development → Hibernating
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Hibernating, None),
        )
        .await;

    let entry: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash.clone())
        .await;
    let entry = entry.unwrap();
    assert_eq!(entry.lifecycle_stage, LifecycleStage::Hibernating);
    assert_eq!(
        entry.hibernation_origin,
        Some(LifecycleStage::Development),
        "hibernation_origin must record the paused stage (REQ-NDO-LC-04)"
    );

    // Resume: Hibernating → Development (must match hibernation_origin)
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Development, None),
        )
        .await;

    let entry: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash.clone())
        .await;
    let entry = entry.unwrap();
    assert_eq!(
        entry.lifecycle_stage,
        LifecycleStage::Development,
        "stage must return to the origin after resuming from Hibernating"
    );
    assert!(
        entry.hibernation_origin.is_none(),
        "hibernation_origin must be cleared after resuming (REQ-NDO-LC-04)"
    );
}

/// Verify that transitioning to Deprecated without a successor_ndo_hash is rejected.
///
/// This is enforced by the coordinator pre-flight check (REQ-NDO-LC-06).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_deprecated_requires_successor() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "To Deprecate",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    // Deprecated without successor_ndo_hash must be rejected (REQ-NDO-LC-06)
    let result: Result<ActionHash, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(output.action_hash, LifecycleStage::Deprecated, None),
        )
        .await;

    assert!(
        result.is_err(),
        "Transitioning to Deprecated without successor_ndo_hash must be rejected (REQ-NDO-LC-06)"
    );
}

/// Full deprecation–EndOfLife lifecycle with successor link, plus terminal state enforcement.
///
/// Verifies: successor_ndo_hash is set on Deprecated entry, transition to EndOfLife works,
/// and EndOfLife is truly terminal (REQ-NDO-LC-05, REQ-NDO-LC-06, REQ-NDO-L0-06).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_deprecation_with_successor() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo_a: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "NDO A (to deprecate)",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let ndo_b: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "NDO B (successor)",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let hash_a = ndo_a.action_hash.clone();
    let hash_b = ndo_b.action_hash.clone();

    // Deprecate A with B as successor
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash_a.clone(), LifecycleStage::Deprecated, Some(hash_b.clone())),
        )
        .await;

    let entry: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash_a.clone())
        .await;
    let entry = entry.unwrap();
    assert_eq!(entry.lifecycle_stage, LifecycleStage::Deprecated);
    assert_eq!(
        entry.successor_ndo_hash,
        Some(hash_b),
        "successor_ndo_hash must be set when entering Deprecated (REQ-NDO-LC-06)"
    );

    // Deprecated → EndOfLife (the only exit from Deprecated)
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash_a.clone(), LifecycleStage::EndOfLife, None),
        )
        .await;

    let entry: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash_a.clone())
        .await;
    let entry = entry.unwrap();
    assert_eq!(
        entry.lifecycle_stage,
        LifecycleStage::EndOfLife,
        "EndOfLife must be reachable from Deprecated"
    );

    // EndOfLife entry must still be retrievable via original hash (tombstone guarantee)
    // REQ-NDO-L0-06: Layer 0 is permanent; EndOfLife entries remain as tombstones
    let tombstone: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash_a.clone())
        .await;
    assert!(
        tombstone.is_some(),
        "EndOfLife entry must remain retrievable (REQ-NDO-L0-06 tombstone guarantee)"
    );

    // EndOfLife is terminal — no further transitions are allowed
    let terminal_result: Result<ActionHash, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash_a.clone(), LifecycleStage::Deprecated, None),
        )
        .await;
    assert!(
        terminal_result.is_err(),
        "EndOfLife must be terminal — no transitions allowed (REQ-NDO-LC-04)"
    );

    // TODO(#76-immutability): Delete enforcement — no delete_ndo coordinator function
    // is exposed, so ValidateCallbackResult::Invalid for delete cannot be triggered
    // through the current API. Tracked as future work.
}

/// Cross-agent discovery: multiple agents creating NDOs, verifying DHT propagation.
///
/// Verifies `get_all_ndos`, `get_ndos_by_lifecycle_stage`, and `get_my_ndos`
/// across two agents after DHT consistency (REQ-NDO-L0-07).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_cross_agent_discovery() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice creates two NDOs; one stays at Ideation, one advances to Specification
    let alice_ndo_1: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Alice NDO 1",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let _: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Alice NDO 2",
                PropertyRegime::Commons,
                ResourceNature::Physical,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    // Advance NDO 1 to Specification so we have two distinct stages
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(
                alice_ndo_1.action_hash.clone(),
                LifecycleStage::Specification,
                None,
            ),
        )
        .await;

    // Bob creates one NDO at Ideation
    let _: NdoOutput = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Bob NDO",
                PropertyRegime::Nondominium,
                ResourceNature::Service,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    // MANDATORY: wait for all ops to propagate before cross-agent reads
    await_consistency_20_s([&alice, &bob]).await.unwrap();

    // Bob sees all 3 NDOs via the global anchor
    let all_ndos: GetAllNdosOutput = conductors[1]
        .call(&bob.zome("zome_resource"), "get_all_ndos", ())
        .await;
    assert_eq!(
        all_ndos.ndos.len(),
        3,
        "Bob should see all 3 NDOs via the global anchor after DHT sync"
    );
    assert!(
        all_ndos.ndos.iter().any(|n| n.entry.name == "Alice NDO 1"),
        "get_all_ndos must include Alice NDO 1"
    );
    assert!(
        all_ndos.ndos.iter().any(|n| n.entry.name == "Alice NDO 2"),
        "get_all_ndos must include Alice NDO 2"
    );
    assert!(
        all_ndos.ndos.iter().any(|n| n.entry.name == "Bob NDO"),
        "get_all_ndos must include Bob NDO"
    );

    // Bob filters by Ideation: Alice NDO 2 + Bob NDO (Alice NDO 1 moved to Specification)
    let at_ideation: GetAllNdosOutput = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_ndos_by_lifecycle_stage",
            LifecycleStage::Ideation,
        )
        .await;
    assert_eq!(
        at_ideation.ndos.len(),
        2,
        "Two NDOs should be at Ideation stage (Alice NDO 1 moved out)"
    );
    assert!(
        at_ideation.ndos.iter().any(|n| n.entry.name == "Alice NDO 2"),
        "Ideation filter must include Alice NDO 2"
    );
    assert!(
        at_ideation.ndos.iter().any(|n| n.entry.name == "Bob NDO"),
        "Ideation filter must include Bob NDO"
    );

    // Bob filters by Specification: only Alice NDO 1
    let at_specification: GetAllNdosOutput = conductors[1]
        .call(
            &bob.zome("zome_resource"),
            "get_ndos_by_lifecycle_stage",
            LifecycleStage::Specification,
        )
        .await;
    assert_eq!(
        at_specification.ndos.len(),
        1,
        "One NDO should be at Specification stage"
    );
    assert_eq!(
        at_specification.ndos[0].entry.name, "Alice NDO 1",
        "Specification filter must return Alice NDO 1"
    );

    // get_my_ndos is agent-scoped — Bob sees only his own
    let bob_mine: GetAllNdosOutput = conductors[1]
        .call(&bob.zome("zome_resource"), "get_my_ndos", ())
        .await;
    assert_eq!(
        bob_mine.ndos.len(),
        1,
        "get_my_ndos must return only Bob's NDO"
    );
    assert_eq!(
        bob_mine.ndos[0].entry.name, "Bob NDO",
        "Bob's get_my_ndos must return Bob NDO"
    );

    // Alice sees only her two NDOs
    let alice_mine: GetAllNdosOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "get_my_ndos", ())
        .await;
    assert_eq!(
        alice_mine.ndos.len(),
        2,
        "get_my_ndos must return only Alice's 2 NDOs"
    );
    assert!(
        alice_mine.ndos.iter().any(|n| n.entry.name == "Alice NDO 1"),
        "Alice's get_my_ndos must include Alice NDO 1"
    );
    assert!(
        alice_mine.ndos.iter().any(|n| n.entry.name == "Alice NDO 2"),
        "Alice's get_my_ndos must include Alice NDO 2"
    );
}

/// Verify that the NdoByLifecycleStage anchor moves when a stage transition occurs,
/// while the immutable NdoByNature and NdoByPropertyRegime anchors remain in place.
///
/// REQ-NDO-L0-05 (issue #75): categorization anchors for filtered discovery.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_lifecycle_anchor_moves_on_update() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Anchor NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let hash = output.action_hash.clone();

    // Entry should appear in the Ideation anchor immediately after creation
    let at_ideation: GetAllNdosOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndos_by_lifecycle_stage",
            LifecycleStage::Ideation,
        )
        .await;
    assert_eq!(at_ideation.ndos.len(), 1, "NDO must appear in Ideation anchor after creation");

    // Advance stage — the lifecycle anchor must move
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::Specification, None),
        )
        .await;

    // Ideation anchor must now be empty
    let old_anchor: GetAllNdosOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndos_by_lifecycle_stage",
            LifecycleStage::Ideation,
        )
        .await;
    assert_eq!(
        old_anchor.ndos.len(),
        0,
        "lifecycle anchor must be removed from the old stage after transition"
    );

    // Specification anchor must now hold the entry
    let new_anchor: GetAllNdosOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndos_by_lifecycle_stage",
            LifecycleStage::Specification,
        )
        .await;
    assert_eq!(
        new_anchor.ndos.len(),
        1,
        "lifecycle anchor must appear at the new stage after transition"
    );

    // NdoByNature is immutable — must still hold the entry regardless of stage change
    let by_nature: GetAllNdosOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndos_by_nature",
            ResourceNature::Digital,
        )
        .await;
    assert_eq!(
        by_nature.ndos.len(),
        1,
        "NdoByNature anchor must be unchanged after lifecycle transition (immutable)"
    );

    // NdoByPropertyRegime is immutable — must still hold the entry
    let by_regime: GetAllNdosOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndos_by_property_regime",
            PropertyRegime::Commons,
        )
        .await;
    assert_eq!(
        by_regime.ndos.len(),
        1,
        "NdoByPropertyRegime anchor must be unchanged after lifecycle transition (immutable)"
    );
}
