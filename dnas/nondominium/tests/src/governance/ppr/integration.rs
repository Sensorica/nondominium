//! PPR Integration tests — translated from `ppr-system/ppr-integration.test.ts`.
//!
//! Covers PPR integration with economic processes:
//! - Manual PPR generation after economic events
//! - Claim retrieval and reputation calculation
//! - Signing participation claims
//! - Complete multi-interaction workflow

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Local mirror for sign_participation_claim (not yet in common wrappers).
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SignParticipationClaimInput {
    data_to_sign: Vec<u8>,
    counterparty: AgentPubKey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SignParticipationClaimOutput {
    signature: Signature,
    signed_data_hash: [u8; 32],
}

async fn sign_participation_claim(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: SignParticipationClaimInput,
) -> SignParticipationClaimOutput {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "sign_participation_claim",
            input,
        )
        .await
}

// ---------------------------------------------------------------------------
// Test 1: Manual PPR generation after economic events
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_integration_manual_ppr_generation_after_economic_events() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create commitment and economic event.
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
            note: Some("Test commitment for PPR integration".to_string()),
        },
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
            note: Some("Test economic event for PPR integration".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Manually issue PPRs.
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
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.95,
                reliability: 1.0,
                communication: 0.85,
                overall_satisfaction: 0.9,
                notes: Some("Good integration test performance".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 1.0,
                reliability: 1.0,
                communication: 0.9,
                overall_satisfaction: 0.95,
                notes: Some("Prompt acceptance".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Integration test PPR generation".to_string()),
        },
    )
    .await;

    // Verify claim types.
    assert_eq!(
        ppr_result.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
    );
    assert_eq!(
        ppr_result.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
    );

    // Verify both claims reference the correct commitment and event.
    assert_eq!(ppr_result.provider_claim.fulfills, commitment.commitment_hash);
    assert_eq!(ppr_result.receiver_claim.fulfills, commitment.commitment_hash);
    assert_eq!(ppr_result.provider_claim.fulfilled_by, event.event_hash);
    assert_eq!(ppr_result.receiver_claim.fulfilled_by, event.event_hash);
}

// ---------------------------------------------------------------------------
// Test 2: Retrieve claims and calculate reputation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_integration_retrieve_claims_and_calculate_reputation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create commitment, event, and PPRs (bob is provider).
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: bob.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: Timestamp::from_micros(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_micros() as i64
                    + 24 * 60 * 60 * 1_000_000,
            ),
            note: Some("Work commitment for reputation test".to_string()),
        },
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: bob.agent_pubkey().clone(),
            receiver: alice.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Work completed".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Bob issues PPRs (bob as provider).
    let ppr_result = issue_participation_receipts(
        &conductors[1],
        &bob,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: bob.agent_pubkey().clone(),
            receiver: alice.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
                zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.95,
                quality: 0.9,
                reliability: 0.95,
                communication: 0.9,
                overall_satisfaction: 0.92,
                notes: Some("Excellent work performance".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 1.0,
                reliability: 1.0,
                communication: 1.0,
                overall_satisfaction: 1.0,
                notes: Some("Very satisfied with service".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Service completion PPRs".to_string()),
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

    // Wait for DHT sync.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Retrieve claims for both agents.
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
    assert!(total > 0, "Expected at least one claim across agents");

    // Verify counterparties.
    if !alice_claims.claims.is_empty() {
        let alice_claim = alice_claims.claims.iter().find(|(_h, c)| {
            c.claim_type == zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance
        });
        if let Some((_hash, claim)) = alice_claim {
            assert_eq!(claim.counterparty, bob.agent_pubkey().clone());
        }
    }
    if !bob_claims.claims.is_empty() {
        let bob_claim = bob_claims.claims.iter().find(|(_h, c)| {
            c.claim_type == zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer
        });
        if let Some((_hash, claim)) = bob_claim {
            assert_eq!(claim.counterparty, alice.agent_pubkey().clone());
        }
    }

    // Derive alice's reputation summary.
    let now_micros = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as i64;
    let one_day = 24 * 60 * 60 * 1_000_000_i64;

    let reputation = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: Timestamp::from_micros(now_micros - one_day),
            period_end: Timestamp::from_micros(now_micros + one_day),
            claim_type_filter: None,
        },
    )
    .await;

    // If alice has claims, her reputation should reflect them.
    if !alice_claims.claims.is_empty() {
        assert!(reputation.summary.total_claims > 0);
        assert_eq!(reputation.summary.agent, alice.agent_pubkey().clone());
        assert!(reputation.claims_included > 0);
    }
}

// ---------------------------------------------------------------------------
// Test 3: Sign participation claims
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_integration_sign_participation_claims() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create PPR setup.
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
            note: Some("Test transfer for signing".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    let _ppr_result = issue_participation_receipts(
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
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.9,
                reliability: 0.9,
                communication: 0.9,
                overall_satisfaction: 0.9,
                notes: Some("Standard transfer".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.9,
                reliability: 0.9,
                communication: 0.9,
                overall_satisfaction: 0.9,
                notes: Some("Standard reception".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("PPRs for signing test".to_string()),
        },
    )
    .await;

    // Wait for DHT sync.
    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Bob signs to verify receipt.
    let test_data = b"Test signature data for PPR integration".to_vec();
    let signature_result = sign_participation_claim(
        &conductors[1],
        &bob,
        SignParticipationClaimInput {
            data_to_sign: test_data,
            counterparty: alice.agent_pubkey().clone(),
        },
    )
    .await;

    assert_eq!(
        signature_result.signed_data_hash.len(),
        32,
        "BLAKE3-256 hash should be 32 bytes"
    );
    assert_eq!(
        signature_result.signature.0.len(),
        64,
        "Ed25519 signature should be 64 bytes"
    );
}

// ---------------------------------------------------------------------------
// Test 4: Complete workflow with multiple interactions
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_integration_complete_workflow_with_multiple_interactions() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // --- First interaction: Resource contribution (alice -> bob) ---

    let commitment1 = propose_commitment(
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
            note: Some("First resource contribution".to_string()),
        },
    )
    .await;

    let event1 = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment1.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("First transfer".to_string()),
            commitment_hash: Some(commitment1.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment1.commitment_hash.clone(),
            fulfilled_by: event1.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::ResourceCreation,
                zome_gouvernance_integrity::ParticipationClaimType::ResourceValidation,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.9,
                reliability: 0.9,
                communication: 0.9,
                overall_satisfaction: 0.9,
                notes: Some("First contribution".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.9,
                reliability: 0.9,
                communication: 0.9,
                overall_satisfaction: 0.9,
                notes: Some("First reception".to_string()),
            },
            resource_hash: Some(commitment1.commitment_hash.clone()),
            notes: Some("First interaction PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // --- Second interaction: Service exchange (bob -> alice) ---

    let commitment2 = propose_commitment(
        &conductors[1],
        &bob,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: bob.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: Timestamp::from_micros(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_micros() as i64
                    + 24 * 60 * 60 * 1_000_000,
            ),
            note: Some("Service provision".to_string()),
        },
    )
    .await;

    let event2 = log_economic_event(
        &conductors[1],
        &bob,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: bob.agent_pubkey().clone(),
            receiver: alice.agent_pubkey().clone(),
            resource_inventoried_as: commitment2.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Service completed".to_string()),
            commitment_hash: Some(commitment2.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    issue_participation_receipts(
        &conductors[1],
        &bob,
        IssueParticipationReceiptsInput {
            fulfills: commitment2.commitment_hash.clone(),
            fulfilled_by: event2.event_hash.clone(),
            provider: bob.agent_pubkey().clone(),
            receiver: alice.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
                zome_gouvernance_integrity::ParticipationClaimType::GoodFaithTransfer,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.95,
                quality: 0.92,
                reliability: 0.95,
                communication: 0.9,
                overall_satisfaction: 0.93,
                notes: Some("Quality service provision".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.95,
                reliability: 1.0,
                communication: 0.95,
                overall_satisfaction: 0.97,
                notes: Some("Satisfied with service".to_string()),
            },
            resource_hash: Some(commitment2.commitment_hash.clone()),
            notes: Some("Service interaction PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // --- Verify accumulated claims ---

    let alice_final = get_my_participation_claims(
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

    let bob_final = get_my_participation_claims(
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

    // Each agent should have claims from their respective interactions.
    // Alice issued the first set (gets provider claim), bob issued the second (gets provider claim).
    // The receiver claims are linked to the respective receiver agents.
    let total = alice_final.claims.len() + bob_final.claims.len();
    assert!(
        total >= 2,
        "Expected at least 2 total claims from two interactions, got {}",
        total
    );

    // --- Verify reputation summaries ---

    let now_micros = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as i64;
    let one_day = 24 * 60 * 60 * 1_000_000_i64;

    let alice_rep = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: Timestamp::from_micros(now_micros - one_day),
            period_end: Timestamp::from_micros(now_micros + one_day),
            claim_type_filter: None,
        },
    )
    .await;

    let bob_rep = derive_reputation_summary(
        &conductors[1],
        &bob,
        DeriveReputationSummaryInput {
            period_start: Timestamp::from_micros(now_micros - one_day),
            period_end: Timestamp::from_micros(now_micros + one_day),
            claim_type_filter: None,
        },
    )
    .await;

    // Both agents should have non-zero reputation from their participation.
    let rep_total = alice_rep.summary.total_claims + bob_rep.summary.total_claims;
    assert!(
        rep_total >= 2,
        "Expected combined reputation claims >= 2, got {}",
        rep_total
    );
}
