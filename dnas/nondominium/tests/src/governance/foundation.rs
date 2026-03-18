//! Governance foundation tests — translated from `governance/governance-foundation-tests.test.ts`.
//!
//! Validates that the governance zome is accessible and returns sensible defaults
//! before any commitments have been created.

use nondominium_sweettest::common::*;
use holochain::prelude::*;

#[tokio::test(flavor = "multi_thread")]
async fn governance_zome_is_accessible_and_returns_empty_commitments() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    // Call get_all_commitments on a fresh network — should return an empty Vec.
    let commitments = get_all_commitments(&conductors[0], &alice).await;

    assert!(
        commitments.is_empty(),
        "Initially no commitments should exist, got {}",
        commitments.len()
    );
}
