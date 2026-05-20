use holochain::prelude::*;
use holochain::sweettest::*;

/// Path to the compiled Lobby DNA bundle, resolved relative to this crate's Cargo.toml.
pub const LOBBY_DNA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../workdir/lobby.dna"
);

/// Spin up two conductors, each with the Lobby DNA installed.
///
/// Requires `bun run build:happ` (or `hc dna pack dnas/lobby/workdir`) to have been run first.
pub async fn setup_two_lobby_agents() -> (SweetConductorBatch, SweetCell, SweetCell) {
    let mut conductors =
        SweetConductorBatch::from_config_rendezvous(2, SweetConductorConfig::standard()).await;

    let dna = SweetDnaFile::from_bundle(std::path::Path::new(LOBBY_DNA_PATH))
        .await
        .expect("Failed to load Lobby DNA bundle. Did you run `bun run build:happ`?");

    let apps = conductors
        .setup_app("lobby", &[dna])
        .await
        .expect("Failed to install Lobby app on conductors");

    conductors.exchange_peer_info().await;

    let ((cell_alice,), (cell_bob,)) = apps.into_tuples();
    (conductors, cell_alice, cell_bob)
}
