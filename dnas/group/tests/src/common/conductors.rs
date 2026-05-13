use holochain::prelude::*;
use holochain::sweettest::*;
use std::sync::atomic::{AtomicU64, Ordering};

/// Path to the compiled group DNA bundle, resolved relative to this crate's Cargo.toml.
pub const GROUP_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../workdir/group.dna"
);

// Each test invocation gets a unique monotonic ID. Combined with the process PID this
// guarantees distinct network seeds even when multiple test processes run in parallel.
static TEST_INSTANCE: AtomicU64 = AtomicU64::new(0);

pub fn unique_seed() -> NetworkSeed {
    let id = TEST_INSTANCE.fetch_add(1, Ordering::SeqCst);
    format!("test-{}-{}", std::process::id(), id).into()
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
