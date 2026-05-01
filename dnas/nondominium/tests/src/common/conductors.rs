use holochain::prelude::*;
use holochain::sweettest::*;
use std::sync::atomic::{AtomicU64, Ordering};

/// Path to the compiled nondominium DNA bundle, resolved relative to this crate's Cargo.toml.
pub const NONDOMINIUM_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../workdir/nondominium.dna"
);

/// Path to the compiled hREA DNA bundle (from the vendored submodule).
///
/// Only used by [`setup_dual_dna_two_agents`]. Requires the hREA submodule to be
/// initialized (`git submodule update --init --recursive`) and the hREA DNA to be
/// built (`bun run build:happ`). Accessing this path without those prerequisites
/// will cause a runtime panic in the conductor setup, not a compile error.
pub const HREA_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../vendor/hrea/dnas/hrea/workdir/hrea.dna"
);

// Each test invocation gets a unique monotonic ID. Combined with the process PID this
// guarantees distinct network seeds even when multiple test processes run in parallel
// (e.g. `cargo test -j N` at the binary level). A unique network seed means each test
// gets a different DNA hash → completely isolated DHT shard → tests can run in parallel
// without global anchor cross-contamination.
static TEST_INSTANCE: AtomicU64 = AtomicU64::new(0);

fn unique_seed() -> NetworkSeed {
    let id = TEST_INSTANCE.fetch_add(1, Ordering::SeqCst);
    format!("test-{}-{}", std::process::id(), id).into()
}

/// Spin up two conductors, each with the nondominium DNA installed.
///
/// Returns `(conductors, cell_alice, cell_bob)`.
pub async fn setup_two_agents() -> (SweetConductorBatch, SweetCell, SweetCell) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let dna = SweetDnaFile::from_bundle(std::path::Path::new(NONDOMINIUM_DNA_PATH))
        .await
        .expect("Failed to load nondominium DNA bundle. Did you run `bun run build:happ`?")
        .with_network_seed(unique_seed())
        .await;

    let apps = conductors
        .setup_app("nondominium", &[dna])
        .await
        .expect("Failed to install nondominium app on conductors");

    conductors.exchange_peer_info().await;

    let ((cell_alice,), (cell_bob,)) = apps.into_tuples();
    (conductors, cell_alice, cell_bob)
}

/// Spin up three conductors, each with the nondominium DNA installed.
///
/// Returns `(conductors, cell_alice, cell_bob, cell_carol)`.
pub async fn setup_three_agents() -> (SweetConductorBatch, SweetCell, SweetCell, SweetCell) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(3, SweetConductorConfig::standard()).await;

    let dna = SweetDnaFile::from_bundle(std::path::Path::new(NONDOMINIUM_DNA_PATH))
        .await
        .expect("Failed to load nondominium DNA bundle. Did you run `bun run build:happ`?")
        .with_network_seed(unique_seed())
        .await;

    let apps = conductors
        .setup_app("nondominium", &[dna])
        .await
        .expect("Failed to install nondominium app on conductors");

    conductors.exchange_peer_info().await;

    let ((cell_alice,), (cell_bob,), (cell_carol,)) = apps.into_tuples();
    (conductors, cell_alice, cell_bob, cell_carol)
}

/// Spin up two conductors, each with **both** the nondominium DNA and the hREA DNA installed.
///
/// Returns `(conductors, nd_alice, hrea_alice, nd_bob, hrea_bob)`.
pub async fn setup_dual_dna_two_agents() -> (
    SweetConductorBatch,
    SweetCell,
    SweetCell,
    SweetCell,
    SweetCell,
) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let seed = unique_seed();
    let dna_nd = SweetDnaFile::from_bundle(std::path::Path::new(NONDOMINIUM_DNA_PATH))
        .await
        .expect("Failed to load nondominium DNA bundle")
        .with_network_seed(seed.clone())
        .await;

    let dna_hrea = SweetDnaFile::from_bundle(std::path::Path::new(HREA_DNA_PATH))
        .await
        .expect("Failed to load hREA DNA bundle")
        .with_network_seed(seed)
        .await;

    // Explicit role names (RoleName = String) are required so that
    // `CallTargetCell::OtherRole("hrea")` resolves correctly inside the nondominium zomes.
    let role_nd: (RoleName, DnaFile) = (RoleName::from("nondominium"), dna_nd);
    let role_hrea: (RoleName, DnaFile) = (RoleName::from("hrea"), dna_hrea);
    let apps = conductors
        .setup_app("dual", &[role_nd, role_hrea])
        .await
        .expect("Failed to install dual-DNA app on conductors");

    conductors.exchange_peer_info().await;

    let ((nd_alice, hrea_alice), (nd_bob, hrea_bob)) = apps.into_tuples();
    (conductors, nd_alice, hrea_alice, nd_bob, hrea_bob)
}
