use holochain::prelude::*;
use holochain::sweettest::*;
use std::sync::atomic::{AtomicU64, Ordering};

/// Path to the compiled group DNA bundle, resolved relative to this crate's Cargo.toml.
pub const GROUP_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../workdir/group.dna"
);

/// Path to the compiled NDO DNA bundle (one clone per NDO, ADR-010/ADR-012).
/// Bundles the existing zome_resource and zome_gouvernance WASMs.
pub const NDO_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../ndo/workdir/ndo.dna"
);

// Each test invocation gets a unique monotonic ID. Combined with the process PID this
// guarantees distinct network seeds even when multiple test processes run in parallel.
static TEST_INSTANCE: AtomicU64 = AtomicU64::new(0);

pub fn unique_seed() -> NetworkSeed {
    let id = TEST_INSTANCE.fetch_add(1, Ordering::SeqCst);
    format!("test-{}-{}", std::process::id(), id).into()
}

/// Load the NDO DNA with explicit clone coordinates: a network seed plus the
/// serialized immutable Layer 0 properties. The same `(seed, properties)` pair
/// always derives the same DnaHash — that hash IS the NDO's permanent identity
/// (ADR-010). Different properties yield a different network by construction.
pub async fn ndo_dna_with_coordinates(
    seed: NetworkSeed,
    properties: SerializedBytes,
) -> DnaFile {
    SweetDnaFile::from_bundle_with_overrides(
        std::path::Path::new(NDO_DNA_PATH),
        DnaModifiersOpt::none()
            .with_network_seed(seed)
            .with_properties(properties),
    )
    .await
    .expect("Failed to load ndo DNA bundle. Did you run `bun run build:happ`?")
}

/// Spin up two conductors, each with the group DNA installed.
///
/// Returns `(conductors, cell_alice, cell_bob)`.
pub async fn setup_two_agents() -> (SweetConductorBatch, SweetCell, SweetCell) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let dna = SweetDnaFile::from_bundle(std::path::Path::new(GROUP_DNA_PATH))
        .await
        .expect("Failed to load group DNA bundle. Did you run `bun run build:happ`?")
        .with_network_seed(unique_seed())
        .await;

    let apps = conductors
        .setup_app("group", &[dna])
        .await
        .expect("Failed to install group app on conductors");

    conductors.exchange_peer_info().await;

    let ((cell_alice,), (cell_bob,)) = apps.into_tuples();
    (conductors, cell_alice, cell_bob)
}
