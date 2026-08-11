//! NDO-per-cell Sweettest integration tests (issue #112, ADR-010/ADR-011/ADR-012).
//!
//! Covers: DNA-hash-as-identity derivation, NDO cell genesis identity,
//! NdoAnchor round trip in the group cell, cached descriptor sync, and the
//! full join-via-anchor-coordinates flow.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds group.dna and ndo.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --package group_sweettest --test ndo_anchor

use holochain::prelude::*;
use holochain::sweettest::*;
use holochain_serialized_bytes::prelude::SerializedBytes;
use serde::{Deserialize, Serialize};

use group_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror types
//
// The test binary cannot import WASM-compiled zome crates. These types must
// match the serialized form of their counterparts in the zomes.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
enum LifecycleStage {
    Ideation,
    Active,
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
}

/// Immutable Layer 0 fields bound into the NDO clone's DNA properties (ADR-010).
/// Changing any field yields a different DnaHash, i.e. a different network —
/// immutability enforced by hash physics, not validation code.
#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
struct NdoCellProperties {
    pub name: String,
    pub initiator: AgentPubKey,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub created_at: Timestamp,
}

/// Mirrors `zome_resource_coordinator::NdoInput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoInput {
    pub name: String,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub description: Option<String>,
    pub rivalry_override: Option<String>,
}

/// Mirrors `zome_resource_integrity::NondominiumIdentity`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoEntry {
    pub name: String,
    pub initiator: AgentPubKey,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,
    pub created_at: Timestamp,
    pub description: Option<String>,
    pub rivalry_override: Option<String>,
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

/// Mirrors `zome_group_coordinator::NdoAnchorInput`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoAnchorInput {
    pub group_hash: ActionHash,
    pub name: String,
    pub description: Option<String>,
    pub ndo_dna_hash: DnaHash,
    pub network_seed: String,
    pub identity_action_hash: ActionHash,
    pub initiator: AgentPubKey,
    pub ndo_created_at: Timestamp,
    pub lifecycle_stage: LifecycleStage,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
}

/// Mirrors `zome_group_integrity::NdoAnchor`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoAnchorEntry {
    pub group_hash: ActionHash,
    pub name: String,
    pub description: Option<String>,
    pub ndo_dna_hash: DnaHash,
    pub network_seed: String,
    pub identity_action_hash: ActionHash,
    pub initiator: AgentPubKey,
    pub ndo_created_at: Timestamp,
    pub lifecycle_stage: LifecycleStage,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
}

/// Mirrors `zome_group_coordinator::UpdateNdoAnchorInput`.
#[derive(Debug, Serialize, Deserialize)]
struct UpdateNdoAnchorInput {
    pub original_action_hash: ActionHash,
    pub previous_action_hash: ActionHash,
    pub updated_name: String,
    pub updated_description: Option<String>,
    pub updated_lifecycle_stage: LifecycleStage,
}

#[derive(Debug, Serialize, Deserialize)]
struct GroupProfileInput {
    pub name: String,
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// Helpers
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

fn sample_properties(initiator: AgentPubKey) -> NdoCellProperties {
    NdoCellProperties {
        name: "Community 3D Printer".to_string(),
        initiator,
        property_regime: PropertyRegime::Nondominium,
        resource_nature: ResourceNature::Physical,
        created_at: Timestamp::from_micros(1_752_900_000_000_000),
    }
}

fn properties_bytes(props: &NdoCellProperties) -> SerializedBytes {
    SerializedBytes::try_from(props.clone()).expect("properties serialization failed")
}

async fn create_group(conductor: &SweetConductor, cell: &SweetCell, name: &str) -> ActionHash {
    let record: Record = conductor
        .call(
            &cell.zome("zome_group"),
            "create_group",
            GroupProfileInput {
                name: name.to_string(),
                description: None,
            },
        )
        .await;
    record.action_address().clone()
}

fn anchor_input_from(
    group_hash: ActionHash,
    dna_hash: DnaHash,
    seed: &str,
    identity_action_hash: ActionHash,
    props: &NdoCellProperties,
) -> NdoAnchorInput {
    NdoAnchorInput {
        group_hash,
        name: props.name.clone(),
        description: None,
        ndo_dna_hash: dna_hash,
        network_seed: seed.to_string(),
        identity_action_hash,
        initiator: props.initiator.clone(),
        ndo_created_at: props.created_at,
        lifecycle_stage: LifecycleStage::Ideation,
        property_regime: props.property_regime.clone(),
        resource_nature: props.resource_nature.clone(),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// ADR-010 identity by physics: the same (seed, properties) coordinates always
/// derive the same DnaHash; different properties derive a different one.
#[tokio::test(flavor = "multi_thread")]
async fn same_coordinates_derive_same_dna_hash() {
    let seed = unique_seed();
    let fake_initiator = AgentPubKey::from_raw_36(vec![7; 36]);
    let props = sample_properties(fake_initiator.clone());

    let dna_a = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;
    let dna_b = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;
    assert_eq!(
        dna_a.dna_hash(),
        dna_b.dna_hash(),
        "identical coordinates must derive identical DNA hashes"
    );

    let mut other_props = props.clone();
    other_props.name = "A Different NDO".to_string();
    let dna_c = ndo_dna_with_coordinates(seed, properties_bytes(&other_props)).await;
    assert_ne!(
        dna_a.dna_hash(),
        dna_c.dna_hash(),
        "changing an immutable Layer 0 property must yield a different network"
    );
}

/// The NDO cell hosts the existing zome_resource code: the genesis
/// NondominiumIdentity is created inside the cell and both members of the
/// NDO network can read it.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_cell_genesis_identity_round_trip() {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let fake_initiator = AgentPubKey::from_raw_36(vec![9; 36]);
    let props = sample_properties(fake_initiator);
    let dna = ndo_dna_with_coordinates(unique_seed(), properties_bytes(&props)).await;

    let apps = conductors
        .setup_app("ndo", &[dna])
        .await
        .expect("Failed to install ndo app on conductors");
    conductors.exchange_peer_info().await;
    let ((cell_alice,), (cell_bob,)) = apps.into_tuples();

    let created: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Community 3D Printer".to_string(),
                property_regime: PropertyRegime::Nondominium,
                resource_nature: ResourceNature::Physical,
                lifecycle_stage: LifecycleStage::Ideation,
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    await_consistency_20_s([&cell_alice, &cell_bob])
        .await
        .unwrap();

    let fetched: Option<NdoEntry> = conductors[1]
        .call(
            &cell_bob.zome("zome_resource"),
            "get_ndo",
            created.action_hash.clone(),
        )
        .await;

    let fetched = fetched.expect("bob should read the genesis identity from the NDO cell");
    assert_eq!(fetched.name, "Community 3D Printer");
    assert_eq!(fetched.lifecycle_stage, LifecycleStage::Ideation);
}

/// Anchor round trip: alice anchors an NDO in the group cell; bob reads the
/// anchor with the full clone coordinates, without joining any NDO cell.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_anchor_round_trip() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;
    let group_hash = create_group(&conductors[0], &cell_alice, "Fablab").await;

    let seed = unique_seed();
    let props = sample_properties(cell_alice.agent_pubkey().clone());
    let dna = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;
    let fake_identity_hash = ActionHash::from_raw_36(vec![1; 36]);

    let created: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "create_ndo_anchor",
            anchor_input_from(
                group_hash.clone(),
                dna.dna_hash().clone(),
                seed.as_ref(),
                fake_identity_hash.clone(),
                &props,
            ),
        )
        .await;
    let created_entry: NdoAnchorEntry = decode_record_entry(&created);
    assert_eq!(created_entry.name, "Community 3D Printer");

    await_consistency_20_s([&cell_alice, &cell_bob])
        .await
        .unwrap();

    let anchors: Vec<Record> = conductors[1]
        .call(
            &cell_bob.zome("zome_group"),
            "get_ndo_anchors",
            group_hash.clone(),
        )
        .await;
    assert_eq!(anchors.len(), 1, "bob should see exactly one anchor");

    let anchor: NdoAnchorEntry = decode_record_entry(&anchors[0]);
    assert_eq!(anchor.group_hash, group_hash);
    assert_eq!(anchor.ndo_dna_hash, dna.dna_hash().clone());
    assert_eq!(anchor.network_seed, String::from(seed.clone()));
    assert_eq!(anchor.identity_action_hash, fake_identity_hash);
    assert_eq!(anchor.lifecycle_stage, LifecycleStage::Ideation);
}

/// Anchor round trip for PropertyRegime::Public — verifies Public is a
/// first-class regime on NdoAnchor (seven-variant PropertyRegime).
#[tokio::test(flavor = "multi_thread")]
async fn ndo_anchor_round_trip_public_regime() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;
    let group_hash = create_group(&conductors[0], &cell_alice, "Municipal Fab").await;

    let seed = unique_seed();
    let props = NdoCellProperties {
        name: "Public Workshop Access".to_string(),
        initiator: cell_alice.agent_pubkey().clone(),
        property_regime: PropertyRegime::Public,
        resource_nature: ResourceNature::Physical,
        created_at: Timestamp::from_micros(1_752_900_000_000_000),
    };
    let dna = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;
    let fake_identity_hash = ActionHash::from_raw_36(vec![7; 36]);

    let created: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "create_ndo_anchor",
            anchor_input_from(
                group_hash.clone(),
                dna.dna_hash().clone(),
                seed.as_ref(),
                fake_identity_hash.clone(),
                &props,
            ),
        )
        .await;
    let created_entry: NdoAnchorEntry = decode_record_entry(&created);
    assert_eq!(created_entry.property_regime, PropertyRegime::Public);

    await_consistency_20_s([&cell_alice, &cell_bob])
        .await
        .unwrap();

    let anchors: Vec<Record> = conductors[1]
        .call(
            &cell_bob.zome("zome_group"),
            "get_ndo_anchors",
            group_hash.clone(),
        )
        .await;
    assert_eq!(anchors.len(), 1);
    let anchor: NdoAnchorEntry = decode_record_entry(&anchors[0]);
    assert_eq!(anchor.property_regime, PropertyRegime::Public);
    assert_eq!(anchor.name, "Public Workshop Access");
}

/// update_ndo_anchor refreshes the cached descriptor (lifecycle stage) while
/// the identity coordinates stay immutable, and get_ndo_anchors resolves the
/// update chain to the latest version.
#[tokio::test(flavor = "multi_thread")]
async fn ndo_anchor_update_refreshes_cache() {
    let (conductors, cell_alice, cell_bob) = setup_two_agents().await;
    let group_hash = create_group(&conductors[0], &cell_alice, "Fablab").await;

    let seed = unique_seed();
    let props = sample_properties(cell_alice.agent_pubkey().clone());
    let dna = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;

    let created: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "create_ndo_anchor",
            anchor_input_from(
                group_hash.clone(),
                dna.dna_hash().clone(),
                seed.as_ref(),
                ActionHash::from_raw_36(vec![2; 36]),
                &props,
            ),
        )
        .await;
    let original_hash = created.action_address().clone();

    let _updated: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "update_ndo_anchor",
            UpdateNdoAnchorInput {
                original_action_hash: original_hash.clone(),
                previous_action_hash: original_hash.clone(),
                updated_name: "Community 3D Printer".to_string(),
                updated_description: Some("Now in active use".to_string()),
                updated_lifecycle_stage: LifecycleStage::Active,
            },
        )
        .await;

    await_consistency_20_s([&cell_alice, &cell_bob])
        .await
        .unwrap();

    let anchors: Vec<Record> = conductors[1]
        .call(
            &cell_bob.zome("zome_group"),
            "get_ndo_anchors",
            group_hash,
        )
        .await;
    assert_eq!(anchors.len(), 1);

    let anchor: NdoAnchorEntry = decode_record_entry(&anchors[0]);
    assert_eq!(
        anchor.lifecycle_stage,
        LifecycleStage::Active,
        "get_ndo_anchors must resolve to the latest cached descriptor"
    );
    assert_eq!(anchor.description, Some("Now in active use".to_string()));
    assert_eq!(
        anchor.ndo_dna_hash,
        dna.dna_hash().clone(),
        "identity coordinates must survive cache updates unchanged"
    );
}

/// Integrity validation rejects an anchor with an empty name.
#[tokio::test(flavor = "multi_thread")]
#[should_panic]
async fn ndo_anchor_validation_rejects_empty_name() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;
    let group_hash = create_group(&conductors[0], &cell_alice, "Fablab").await;

    let seed = unique_seed();
    let props = sample_properties(cell_alice.agent_pubkey().clone());
    let dna = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;

    let mut input = anchor_input_from(
        group_hash,
        dna.dna_hash().clone(),
        seed.as_ref(),
        ActionHash::from_raw_36(vec![3; 36]),
        &props,
    );
    input.name = "   ".to_string();

    // Sweettest panics on zome-call error — the Invalid validation result.
    let _record: Record = conductors[0]
        .call(&cell_alice.zome("zome_group"), "create_ndo_anchor", input)
        .await;
}

/// The full fractal flow (design doc section 4.4): alice provisions an NDO
/// cell, writes the genesis identity inside, and anchors it in the group cell.
/// Bob reads the anchor, re-derives the clone from the anchor's coordinates,
/// verifies the DnaHash pinning check, joins the NDO network, and reads the
/// genesis identity — proving the anchor alone is sufficient to engage an NDO.
#[tokio::test(flavor = "multi_thread")]
async fn second_agent_joins_ndo_via_anchor_coordinates() {
    let (mut conductors, cell_alice, cell_bob) = setup_two_agents().await;
    let group_hash = create_group(&conductors[0], &cell_alice, "Fablab").await;

    // Alice provisions the NDO cell with immutable Layer 0 fields in DNA properties.
    let seed = unique_seed();
    let props = sample_properties(cell_alice.agent_pubkey().clone());
    let ndo_dna = ndo_dna_with_coordinates(seed.clone(), properties_bytes(&props)).await;
    let ndo_dna_hash = ndo_dna.dna_hash().clone();

    let alice_ndo_app = conductors
        .iter_mut()
        .next()
        .unwrap()
        .setup_app("ndo-alice", &[ndo_dna])
        .await
        .expect("alice failed to install the NDO cell");
    let (alice_ndo_cell,) = alice_ndo_app.into_tuple();

    // Genesis identity inside the NDO cell (existing zome_resource code path).
    let genesis: NdoOutput = conductors[0]
        .call(
            &alice_ndo_cell.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: props.name.clone(),
                property_regime: props.property_regime.clone(),
                resource_nature: props.resource_nature.clone(),
                lifecycle_stage: LifecycleStage::Ideation,
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    // Anchor in the group cell, carrying the full clone coordinates.
    let _anchor: Record = conductors[0]
        .call(
            &cell_alice.zome("zome_group"),
            "create_ndo_anchor",
            anchor_input_from(
                group_hash.clone(),
                ndo_dna_hash.clone(),
                seed.as_ref(),
                genesis.action_hash.clone(),
                &props,
            ),
        )
        .await;

    await_consistency_20_s([&cell_alice, &cell_bob])
        .await
        .unwrap();

    // Bob reads the anchor from the group cell.
    let anchors: Vec<Record> = conductors[1]
        .call(&cell_bob.zome("zome_group"), "get_ndo_anchors", group_hash)
        .await;
    let anchor: NdoAnchorEntry = decode_record_entry(&anchors[0]);

    // Bob reconstructs the DNA properties from the anchor fields and re-derives
    // the clone. The pinning check: the derived DnaHash must equal the anchored one.
    let reconstructed = NdoCellProperties {
        name: anchor.name.clone(),
        initiator: anchor.initiator.clone(),
        property_regime: anchor.property_regime.clone(),
        resource_nature: anchor.resource_nature.clone(),
        created_at: anchor.ndo_created_at,
    };
    let bob_ndo_dna = ndo_dna_with_coordinates(
        anchor.network_seed.clone().into(),
        properties_bytes(&reconstructed),
    )
    .await;
    assert_eq!(
        bob_ndo_dna.dna_hash().clone(),
        anchor.ndo_dna_hash,
        "pinning check failed: derived DnaHash does not match the anchored identity"
    );

    let bob_ndo_app = conductors
        .iter_mut()
        .nth(1)
        .unwrap()
        .setup_app("ndo-bob", &[bob_ndo_dna])
        .await
        .expect("bob failed to join the NDO cell from anchor coordinates");
    let (bob_ndo_cell,) = bob_ndo_app.into_tuple();

    conductors.exchange_peer_info().await;
    await_consistency_20_s([&alice_ndo_cell, &bob_ndo_cell])
        .await
        .unwrap();

    // Bob reads the genesis identity inside the NDO network he joined.
    let fetched: Option<NdoEntry> = conductors[1]
        .call(
            &bob_ndo_cell.zome("zome_resource"),
            "get_ndo",
            anchor.identity_action_hash.clone(),
        )
        .await;
    let fetched = fetched.expect("bob should read the genesis identity via anchor coordinates");
    assert_eq!(fetched.name, props.name);
    // Sweettest generates a fresh agent key per installed app, so the genesis
    // initiator is the NDO cell's agent, not the group cell's. In production the
    // clone shares the app's agent key, so both would be the same key.
    assert_eq!(fetched.initiator, *alice_ndo_cell.agent_pubkey());
}
