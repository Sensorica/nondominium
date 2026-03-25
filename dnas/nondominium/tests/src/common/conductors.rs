use holochain::prelude::*;
use holochain::sweettest::*;

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

/// Spin up two conductors, each with the nondominium DNA installed.
///
/// Returns `(conductors, cell_alice, cell_bob)`.
pub async fn setup_two_agents() -> (SweetConductorBatch, SweetCell, SweetCell) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let dna = SweetDnaFile::from_bundle(std::path::Path::new(NONDOMINIUM_DNA_PATH))
        .await
        .expect("Failed to load nondominium DNA bundle. Did you run `bun run build:happ`?");

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
        .expect("Failed to load nondominium DNA bundle. Did you run `bun run build:happ`?");

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

    let dna_nd = SweetDnaFile::from_bundle(std::path::Path::new(NONDOMINIUM_DNA_PATH))
        .await
        .expect("Failed to load nondominium DNA bundle");

    let dna_hrea = SweetDnaFile::from_bundle(std::path::Path::new(HREA_DNA_PATH))
        .await
        .expect("Failed to load hREA DNA bundle");

    let apps = conductors
        .setup_app("dual", &[dna_nd, dna_hrea])
        .await
        .expect("Failed to install dual-DNA app on conductors");

    conductors.exchange_peer_info().await;

    let ((nd_alice, hrea_alice), (nd_bob, hrea_bob)) = apps.into_tuples();
    (conductors, nd_alice, hrea_alice, nd_bob, hrea_bob)
}
