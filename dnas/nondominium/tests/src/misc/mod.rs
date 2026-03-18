//! Misc zome tests — translated from `misc/misc.test.ts`.

use nondominium_sweettest::common::*;
use holochain::prelude::*;

#[tokio::test(flavor = "multi_thread")]
async fn ping() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let result: String = conductors[0]
        .call(&alice.zome("misc"), "ping", ())
        .await;

    assert_eq!(result, "Pong");
}
