//! PPR Debug tests — translated from `ppr-system/ppr-debug.test.ts`.
//!
//! Simple diagnostic tests that isolate each step of the PPR workflow
//! to help identify where failures or timeouts occur.

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// Test 1: Minimal scenario setup — verifies conductors and cells start
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_debug_minimal_scenario_setup() {
    let (_conductors, _alice, _bob) = setup_two_agents().await;
    // If we reach here, conductor setup, DNA installation, and peer exchange all succeeded.
}

// ---------------------------------------------------------------------------
// Test 2: Simple zome call — commitment creation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_debug_simple_zome_call() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: Timestamp::from_micros(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_micros() as i64
                    + 24 * 60 * 60 * 1_000_000,
            ),
            note: Some("Debug test commitment".to_string()),
        },
    )
    .await;

    // Just verify we got a non-default hash back.
    assert_ne!(
        commitment.commitment_hash,
        ActionHash::from_raw_36(vec![0u8; 36]),
        "Commitment hash should be a real hash, not zeros"
    );
}

// ---------------------------------------------------------------------------
// Test 3: Economic event creation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_debug_economic_event_creation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        sample_commitment(alice.agent_pubkey().clone()),
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Debug test economic event".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    assert_ne!(
        event.event_hash,
        ActionHash::from_raw_36(vec![0u8; 36]),
        "Event hash should be a real hash, not zeros"
    );
}

// ---------------------------------------------------------------------------
// Test 4: PPR creation (potential hang point in the original TS suite)
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_debug_ppr_creation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create prerequisite data.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        sample_commitment(alice.agent_pubkey().clone()),
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Debug test economic event".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Issue PPRs — this is where the TS tests sometimes hung.
    let ppr_result = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
                zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
            ],
            provider_metrics: sample_metrics(),
            receiver_metrics: sample_metrics(),
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Debug test PPR".to_string()),
        },
    )
    .await;

    assert_eq!(
        ppr_result.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
    );
    assert_eq!(
        ppr_result.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
    );

    // Wait for DHT sync, then verify claim retrieval.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    let alice_claims = get_my_participation_claims(
        &conductors[0],
        &alice,
        GetMyParticipationClaimsInput {
            claim_type_filter: None,
            from_time: None,
            to_time: None,
            limit: None,
        },
    )
    .await;

    let bob_claims = get_my_participation_claims(
        &conductors[1],
        &bob,
        GetMyParticipationClaimsInput {
            claim_type_filter: None,
            from_time: None,
            to_time: None,
            limit: None,
        },
    )
    .await;

    let total = alice_claims.claims.len() + bob_claims.claims.len();
    assert!(
        total > 0,
        "Expected at least one claim linked after PPR issuance, got 0"
    );
}
