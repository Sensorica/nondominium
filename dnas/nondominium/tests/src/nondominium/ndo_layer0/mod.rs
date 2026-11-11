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
    Public,
    Nondominium,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum ResourceNature {
    Physical,
    Digital,
    Hybrid,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum Rivalry {
    Rivalrous,
    NonRivalrous,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum EconomicMode {
    Use,
    Consume,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum UseKind {
    Unit,
    Capacity,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum IdentificationPattern {
    Serialized,
    LotControlled,
    Stock,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum ClosureReason {
    Depleted,
    Spoiled,
    Withdrawn,
    WrittenOff,
    DonatedRemainder,
    Other,
}

/// Mirrors `zome_resource_coordinator::NdoInput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoInput {
    pub name: String,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub description: Option<String>,
    pub rivalry_override: Option<Rivalry>,
    #[serde(default)]
    pub economic_mode: Option<EconomicMode>,
    #[serde(default)]
    pub use_kind: Option<UseKind>,
    #[serde(default)]
    pub default_unit: Option<String>,
    #[serde(default)]
    pub identification_pattern: Option<IdentificationPattern>,
    #[serde(default)]
    pub unique_id: Option<String>,
    #[serde(default)]
    pub max_concurrent_users: Option<u32>,
    #[serde(default)]
    pub initial_quantity: Option<f64>,
}

/// Mirrors `zome_resource_integrity::NondominiumIdentity`.
///
/// `#[serde(default)]` on additive fields matches the production struct so
/// entries serialized before those fields existed still deserialize correctly.
#[derive(Debug, Serialize, Deserialize)]
struct NdoEntry {
    pub name: String,
    pub initiator: AgentPubKey,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub created_at: Timestamp,
    pub description: Option<String>,
    pub rivalry_override: Option<Rivalry>,
    #[serde(default)]
    pub successor_ndo_hash: Option<ActionHash>,
    #[serde(default)]
    pub hibernation_origin: Option<LifecycleStage>,
    #[serde(default)]
    pub economic_mode: Option<EconomicMode>,
    #[serde(default)]
    pub use_kind: Option<UseKind>,
    #[serde(default)]
    pub default_unit: Option<String>,
    #[serde(default)]
    pub identification_pattern: Option<IdentificationPattern>,
    #[serde(default)]
    pub unique_id: Option<String>,
    #[serde(default)]
    pub max_concurrent_users: Option<u32>,
    #[serde(default)]
    pub initial_quantity: Option<f64>,
    #[serde(default)]
    pub closure_reason: Option<ClosureReason>,
    #[serde(default)]
    pub closure_note: Option<String>,
}

/// Mirrors `zome_resource_coordinator::NdoOutput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoOutput {
    pub action_hash: ActionHash,
    pub entry: NdoEntry,
    #[serde(default)]
    pub specification_action_hash: Option<ActionHash>,
    #[serde(default)]
    pub economic_resource_action_hash: Option<ActionHash>,
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
    #[serde(default)]
    pub closure_reason: Option<ClosureReason>,
    #[serde(default)]
    pub closure_note: Option<String>,
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
        rivalry_override: None,
        economic_mode: None,
        use_kind: None,
        default_unit: None,
        identification_pattern: None,
        unique_id: None,
        max_concurrent_users: None,
        initial_quantity: None,
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
        closure_reason: None,
        closure_note: None,
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

/// Create NDO with `Stable` lifecycle at registration (mature/tool-style anchor).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_create_at_stable_stage() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Stable Tool NDO",
                PropertyRegime::Commons,
                ResourceNature::Physical,
                LifecycleStage::Stable,
            ),
        )
        .await;

    assert_eq!(output.entry.lifecycle_stage, LifecycleStage::Stable);
    assert!(output.entry.hibernation_origin.is_none());
}

/// `Hibernating` is not a valid initial stage — must enter via transition after create.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_create_rejects_hibernating_initial_stage() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let result: Result<NdoOutput, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Invalid Hibernating",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Hibernating,
            ),
        )
        .await;

    assert!(
        result.is_err(),
        "create_ndo must reject Hibernating at registration (integrity REQ-NDO-LC-01)"
    );
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
                ResourceNature::Hybrid,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    // MANDATORY: wait for all ops to propagate before cross-agent reads
    await_consistency_s(20, [&alice, &bob]).await.unwrap();

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

/// Create NDOs under Collective, Pool, and Public regimes and verify
/// `get_ndos_by_property_regime` returns each via its immutable regime anchor.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_property_regime_anchors_collective_pool_public() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let cases = [
        ("Collective Tool Share", PropertyRegime::Collective),
        ("Pool 3D Printer", PropertyRegime::Pool),
        ("Public Library Catalog", PropertyRegime::Public),
    ];

    for (name, regime) in cases {
        let output: NdoOutput = conductors[0]
            .call(
                &alice.zome("zome_resource"),
                "create_ndo",
                ndo_input(
                    name,
                    regime.clone(),
                    ResourceNature::Physical,
                    LifecycleStage::Ideation,
                ),
            )
            .await;
        assert_eq!(output.entry.property_regime, regime);

        let by_regime: GetAllNdosOutput = conductors[0]
            .call(
                &alice.zome("zome_resource"),
                "get_ndos_by_property_regime",
                regime.clone(),
            )
            .await;
        assert_eq!(
            by_regime.ndos.len(),
            1,
            "NdoByPropertyRegime must index {:?} NDOs",
            regime
        );
        assert_eq!(by_regime.ndos[0].entry.property_regime, regime);
        assert_eq!(by_regime.ndos[0].action_hash, output.action_hash);
    }
}

// ---------------------------------------------------------------------------
// Transition history (REQ-UI-NDO-04)
// ---------------------------------------------------------------------------

/// Mirrors `NdoTransitionHistoryEvent` in `zome_resource`.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct NdoTransitionHistoryEvent {
    pub from_stage: LifecycleStage,
    pub to_stage: LifecycleStage,
    pub agent: AgentPubKey,
    pub timestamp: Timestamp,
    pub event_hash: ActionHash,
}

/// An NDO that has never transitioned reports no history, rather than erroring.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_transition_history_is_empty_before_any_transition() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Untransitioned NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;

    let history: Vec<NdoTransitionHistoryEvent> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_transition_history",
            output.action_hash,
        )
        .await;

    assert!(
        history.is_empty(),
        "a freshly created NDO has no transitions, got {}",
        history.len()
    );
}

/// Every lifecycle transition is reported in order, with the stage it came from,
/// the stage it went to, and the agent and time that recorded it (REQ-UI-NDO-04).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_transition_history_reports_every_step_in_order() {
    let (conductors, alice, _bob) = setup_two_agents().await;
    let alice_key = alice.agent_pubkey().clone();

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "History NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Ideation,
            ),
        )
        .await;
    let original_hash = output.action_hash.clone();

    for stage in [
        LifecycleStage::Specification,
        LifecycleStage::Development,
        LifecycleStage::Prototype,
    ] {
        let _: ActionHash = conductors[0]
            .call(
                &alice.zome("zome_resource"),
                "update_lifecycle_stage",
                update_stage(original_hash.clone(), stage, None),
            )
            .await;
    }

    let history: Vec<NdoTransitionHistoryEvent> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_transition_history",
            original_hash,
        )
        .await;

    assert_eq!(history.len(), 3, "three transitions were performed");

    let expected = [
        (LifecycleStage::Ideation, LifecycleStage::Specification),
        (LifecycleStage::Specification, LifecycleStage::Development),
        (LifecycleStage::Development, LifecycleStage::Prototype),
    ];
    for (i, (from, to)) in expected.iter().enumerate() {
        assert_eq!(&history[i].from_stage, from, "from_stage of transition {i}");
        assert_eq!(&history[i].to_stage, to, "to_stage of transition {i}");
        assert_eq!(history[i].agent, alice_key, "agent of transition {i}");
    }

    // Each entry must carry a distinct, real on-chain hash for the copy-to-clipboard
    // affordance, and timestamps must not go backwards.
    assert_ne!(history[0].event_hash, history[1].event_hash);
    assert_ne!(history[1].event_hash, history[2].event_hash);
    assert!(history[0].timestamp <= history[1].timestamp);
    assert!(history[1].timestamp <= history[2].timestamp);
}

/// Hibernation and resume are ordinary transitions and must both be reported,
/// including the resume back to the stage that was paused.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_transition_history_reports_hibernation_and_resume() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let output: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            ndo_input(
                "Hibernating History NDO",
                PropertyRegime::Commons,
                ResourceNature::Digital,
                LifecycleStage::Active,
            ),
        )
        .await;
    let original_hash = output.action_hash.clone();

    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(original_hash.clone(), LifecycleStage::Hibernating, None),
        )
        .await;
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(original_hash.clone(), LifecycleStage::Active, None),
        )
        .await;

    let history: Vec<NdoTransitionHistoryEvent> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_ndo_transition_history",
            original_hash,
        )
        .await;

    assert_eq!(history.len(), 2, "hibernate then resume is two transitions");
    assert_eq!(history[0].from_stage, LifecycleStage::Active);
    assert_eq!(history[0].to_stage, LifecycleStage::Hibernating);
    assert_eq!(history[1].from_stage, LifecycleStage::Hibernating);
    assert_eq!(history[1].to_stage, LifecycleStage::Active);
}

/// Minimal mirror of GetAllResourceSpecificationsOutput for dual-create checks.
#[derive(Debug, Serialize, Deserialize)]
struct SpecListing {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SpecsForNdoOutput {
    pub specifications: Vec<SpecListing>,
    pub action_hashes: Vec<ActionHash>,
}

#[tokio::test(flavor = "multi_thread")]
async fn consume_ndo_hard_dual_create_at_specification() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let mut input = ndo_input(
        "Harvest Batch",
        PropertyRegime::CommonPool,
        ResourceNature::Physical,
        LifecycleStage::Specification,
    );
    input.economic_mode = Some(EconomicMode::Consume);
    input.default_unit = Some("kg".to_string());
    input.initial_quantity = Some(250.0);
    input.identification_pattern = Some(IdentificationPattern::LotControlled);

    let output: NdoOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_ndo", input)
        .await;

    assert_eq!(output.entry.economic_mode, Some(EconomicMode::Consume));
    assert_eq!(output.entry.default_unit.as_deref(), Some("kg"));
    assert_eq!(
        output.entry.identification_pattern,
        Some(IdentificationPattern::LotControlled)
    );
    let spec_hash = output
        .specification_action_hash
        .clone()
        .expect("hard dual create must return specification_action_hash");
    assert!(
        output.economic_resource_action_hash.is_some(),
        "hard dual create must return economic_resource_action_hash"
    );

    let specs: SpecsForNdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            output.action_hash.clone(),
        )
        .await;
    assert_eq!(
        specs.action_hashes.len(),
        1,
        "hard dual create must activate Layer 1"
    );
    assert_eq!(specs.action_hashes[0], spec_hash);

    let resources: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            spec_hash,
        )
        .await;
    assert_eq!(resources.len(), 1, "hard dual create must seed EconomicResource");
}

#[tokio::test(flavor = "multi_thread")]
async fn use_capacity_ndo_hard_dual_create() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let mut input = ndo_input(
        "Workshop Bay",
        PropertyRegime::Pool,
        ResourceNature::Physical,
        LifecycleStage::Active,
    );
    input.economic_mode = Some(EconomicMode::Use);
    input.use_kind = Some(UseKind::Capacity);
    input.max_concurrent_users = Some(4);

    let output: NdoOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_ndo", input)
        .await;

    assert_eq!(output.entry.economic_mode, Some(EconomicMode::Use));
    assert_eq!(output.entry.use_kind, Some(UseKind::Capacity));
    assert_eq!(output.entry.max_concurrent_users, Some(4));
    assert!(
        output.specification_action_hash.is_some(),
        "Use/capacity hard dual create returns spec hash"
    );

    let specs: SpecsForNdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            output.action_hash,
        )
        .await;
    assert_eq!(specs.action_hashes.len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn consume_ideation_stores_mode_without_inventory() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let mut input = ndo_input(
        "Future Batch Stub",
        PropertyRegime::CommonPool,
        ResourceNature::Physical,
        LifecycleStage::Ideation,
    );
    input.economic_mode = Some(EconomicMode::Consume);
    input.default_unit = Some("L".to_string());
    input.initial_quantity = Some(10.0);
    input.identification_pattern = Some(IdentificationPattern::Stock);

    let output: NdoOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_ndo", input)
        .await;

    assert_eq!(output.entry.economic_mode, Some(EconomicMode::Consume));
    assert!(
        output.specification_action_hash.is_none(),
        "Ideation must not return a dual-create spec hash"
    );

    let specs: SpecsForNdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            output.action_hash,
        )
        .await;
    assert!(
        specs.action_hashes.is_empty(),
        "Ideation must not activate Layer 1 / inventory"
    );
    assert_eq!(
        output.entry.initial_quantity,
        Some(10.0),
        "Ideation must foreshadow initial_quantity for deferred dual create"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn consume_ideation_dual_creates_on_first_layer1_transition() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let mut input = ndo_input(
        "Deferred Batch",
        PropertyRegime::CommonPool,
        ResourceNature::Physical,
        LifecycleStage::Ideation,
    );
    input.economic_mode = Some(EconomicMode::Consume);
    input.default_unit = Some("L".to_string());
    input.initial_quantity = Some(42.0);
    input.identification_pattern = Some(IdentificationPattern::Stock);

    let created: NdoOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_ndo", input)
        .await;
    assert!(created.specification_action_hash.is_none());

    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(
                created.action_hash.clone(),
                LifecycleStage::Specification,
                None,
            ),
        )
        .await;

    let specs: SpecsForNdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            created.action_hash.clone(),
        )
        .await;
    assert_eq!(
        specs.action_hashes.len(),
        1,
        "first Layer-1-eligible transition must dual-create the ResourceSpecification"
    );

    let resources: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_specification",
            specs.action_hashes[0].clone(),
        )
        .await;
    assert_eq!(
        resources.len(),
        1,
        "deferred dual create must seed the EconomicResource"
    );

    // Second Layer-1 transition must not create another kind.
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(
                created.action_hash.clone(),
                LifecycleStage::Development,
                None,
            ),
        )
        .await;
    let specs_again: SpecsForNdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            created.action_hash,
        )
        .await;
    assert_eq!(
        specs_again.action_hashes.len(),
        1,
        "subsequent transitions must not dual-create again"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn consume_end_of_life_requires_closure_reason_depleted() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let mut input = ndo_input(
        "Depletable Lot",
        PropertyRegime::CommonPool,
        ResourceNature::Physical,
        LifecycleStage::Active,
    );
    input.economic_mode = Some(EconomicMode::Consume);
    input.default_unit = Some("units".to_string());
    input.initial_quantity = Some(5.0);
    input.identification_pattern = Some(IdentificationPattern::Stock);

    let output: NdoOutput = conductors[0]
        .call(&alice.zome("zome_resource"), "create_ndo", input)
        .await;
    let hash = output.action_hash.clone();

    // Without closure_reason — must fail for Consume
    let missing: Result<ActionHash, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            update_stage(hash.clone(), LifecycleStage::EndOfLife, None),
        )
        .await;
    assert!(
        missing.is_err(),
        "Consume EndOfLife without closure_reason must fail"
    );

    let with_reason = UpdateLifecycleStageInput {
        original_action_hash: hash.clone(),
        new_stage: LifecycleStage::EndOfLife,
        successor_ndo_hash: None,
        transition_event_hash: None,
        closure_reason: Some(ClosureReason::Depleted),
        closure_note: Some("qty reached zero".to_string()),
    };
    let _: ActionHash = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_lifecycle_stage",
            with_reason,
        )
        .await;

    let entry: Option<NdoEntry> = conductors[0]
        .call(&alice.zome("zome_resource"), "get_ndo", hash)
        .await;
    let entry = entry.expect("ndo exists");
    assert_eq!(entry.lifecycle_stage, LifecycleStage::EndOfLife);
    assert_eq!(entry.closure_reason, Some(ClosureReason::Depleted));
    assert_eq!(entry.closure_note.as_deref(), Some("qty reached zero"));
}
