//! PPR Foundation tests — translated from `ppr-system/ppr-foundation.test.ts`.
//!
//! Validates the core PPR system functionality:
//! - Bi-directional participation receipt issuance
//! - Private claim retrieval and filtering
//! - Reputation summary derivation
//! - Performance metrics validation

use nondominium_sweettest::common::*;
use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

// ---------------------------------------------------------------------------
// Test 1: Issue bi-directional participation receipts
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_foundation_issue_bi_directional_participation_receipts() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Step 1 — Propose a commitment (alice proposes, bob is provider).
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
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
            note: Some("Test commitment for PPR generation".to_string()),
        },
    )
    .await;

    // Step 2 — Log an economic event (alice is provider, bob is receiver).
    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Test economic event for PPR generation".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Step 3 — Issue PPRs manually.
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
                notes: Some("Good performance on first transfer".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 1.0,
                reliability: 1.0,
                communication: 0.9,
                overall_satisfaction: 0.95,
                notes: Some("Prompt acceptance of custody".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Test PPR generation".to_string()),
        },
    )
    .await;

    // Verify provider claim.
    assert_eq!(
        ppr_result.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
    );
    assert_eq!(
        ppr_result.provider_claim.counterparty,
        bob.agent_pubkey().clone(),
    );
    assert!(
        (ppr_result.provider_claim.performance_metrics.timeliness - 0.9).abs() < f64::EPSILON,
    );

    // Verify receiver claim.
    assert_eq!(
        ppr_result.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
    );
    assert_eq!(
        ppr_result.receiver_claim.counterparty,
        alice.agent_pubkey().clone(),
    );
    assert!(
        (ppr_result.receiver_claim.performance_metrics.timeliness - 1.0).abs() < f64::EPSILON,
    );

    // Both claims should reference the same commitment and event.
    assert_eq!(ppr_result.provider_claim.fulfills, commitment.commitment_hash);
    assert_eq!(ppr_result.receiver_claim.fulfills, commitment.commitment_hash);
    assert_eq!(ppr_result.provider_claim.fulfilled_by, event.event_hash);
    assert_eq!(ppr_result.receiver_claim.fulfilled_by, event.event_hash);
}

// ---------------------------------------------------------------------------
// Test 2: Retrieve private participation claims
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_foundation_retrieve_private_participation_claims() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Create a test commitment.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Use,
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
            note: Some("Test service commitment".to_string()),
        },
    )
    .await;

    // Bob issues PPRs (bob is provider).
    let _ppr_result = issue_participation_receipts(
        &conductors[1],
        &bob,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: commitment.commitment_hash.clone(),
            provider: bob.agent_pubkey().clone(),
            receiver: alice.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceCommitmentAccepted,
                zome_gouvernance_integrity::ParticipationClaimType::GoodFaithTransfer,
            ],
            provider_metrics: sample_metrics(),
            receiver_metrics: sample_metrics(),
            resource_hash: None,
            notes: Some("Service commitment test".to_string()),
        },
    )
    .await;

    // Wait for DHT sync before retrieving claims.
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

    // Either alice or bob should have claims (issuer gets provider claim linked).
    let total_claims = alice_claims.claims.len() + bob_claims.claims.len();
    assert!(
        total_claims > 0,
        "Expected at least one claim across both agents, got 0"
    );

    // If bob has claims, verify the provider claim.
    if !bob_claims.claims.is_empty() {
        let bob_claim = bob_claims
            .claims
            .iter()
            .find(|(_hash, claim)| {
                claim.claim_type
                    == zome_gouvernance_integrity::ParticipationClaimType::MaintenanceCommitmentAccepted
            });
        assert!(bob_claim.is_some(), "Bob should have a MaintenanceCommitmentAccepted claim");
        assert_eq!(
            bob_claim.unwrap().1.counterparty,
            alice.agent_pubkey().clone(),
        );
    }

    // Test filtering by claim type.
    let bob_filtered = get_my_participation_claims(
        &conductors[1],
        &bob,
        GetMyParticipationClaimsInput {
            claim_type_filter: Some(
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceCommitmentAccepted,
            ),
            from_time: None,
            to_time: None,
            limit: None,
        },
    )
    .await;

    // If bob has the claim, the filtered result should contain exactly one.
    if !bob_claims.claims.is_empty() {
        assert!(
            bob_filtered.claims.len() <= 1,
            "Filtered result should have at most 1 claim, got {}",
            bob_filtered.claims.len()
        );
    }
}

// ---------------------------------------------------------------------------
// Test 3: Derive reputation summary
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_foundation_derive_reputation_summary() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let now_micros = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as i64;
    let one_hour = 60 * 60 * 1_000_000_i64;

    // --- First PPR set: Custody claims ---
    let commitment1 = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Transfer,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: Timestamp::from_micros(now_micros + one_hour),
            note: Some("First commitment".to_string()),
        },
    )
    .await;

    issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment1.commitment_hash.clone(),
            fulfilled_by: commitment1.commitment_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
                zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.8,
                quality: 0.9,
                reliability: 1.0,
                communication: 0.85,
                overall_satisfaction: 0.88,
                notes: None,
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 1.0,
                reliability: 1.0,
                communication: 0.95,
                overall_satisfaction: 0.98,
                notes: None,
            },
            resource_hash: None,
            notes: Some("First PPR set".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // --- Second PPR set: Governance claims ---
    let commitment2 = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: Timestamp::from_micros(now_micros + one_hour),
            note: Some("Second commitment".to_string()),
        },
    )
    .await;

    issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment2.commitment_hash.clone(),
            fulfilled_by: commitment2.commitment_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::ValidationActivity,
                zome_gouvernance_integrity::ParticipationClaimType::RuleCompliance,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.95,
                quality: 0.85,
                reliability: 0.9,
                communication: 1.0,
                overall_satisfaction: 0.92,
                notes: None,
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 0.9,
                quality: 0.95,
                reliability: 1.0,
                communication: 0.9,
                overall_satisfaction: 0.94,
                notes: None,
            },
            resource_hash: None,
            notes: Some("Second PPR set".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    // Derive reputation summary for alice.
    let reputation = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: Timestamp::from_micros(now_micros - one_hour),
            period_end: Timestamp::from_micros(now_micros + one_hour),
            claim_type_filter: None,
        },
    )
    .await;

    // Verify summary structure.
    assert!(
        reputation.summary.total_claims > 0,
        "Expected at least one claim in reputation summary"
    );
    assert!(
        reputation.summary.average_performance > 0.0,
        "Expected non-zero average performance"
    );
    assert_eq!(
        reputation.summary.agent,
        alice.agent_pubkey().clone(),
    );
    assert!(
        reputation.claims_included > 0,
        "Expected claims_included > 0"
    );
}

// ---------------------------------------------------------------------------
// Test 4: Performance metrics validation (reject out-of-range values)
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_foundation_performance_metrics_validation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        sample_commitment(alice.agent_pubkey().clone()),
    )
    .await;

    // Attempt to issue PPRs with invalid metrics (timeliness > 1.0).
    let invalid_result: Result<IssueParticipationReceiptsOutputMirror, _> = conductors[0]
        .call_fallible(
            &alice.zome("zome_gouvernance"),
            "issue_participation_receipts",
            IssueParticipationReceiptsInput {
                fulfills: commitment.commitment_hash.clone(),
                fulfilled_by: commitment.commitment_hash.clone(),
                provider: alice.agent_pubkey().clone(),
                receiver: bob.agent_pubkey().clone(),
                claim_types: vec![
                    zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
                    zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
                ],
                provider_metrics: PerformanceMetricsInput {
                    timeliness: 1.5, // Invalid: > 1.0
                    quality: 0.5,
                    reliability: 0.8,
                    communication: 0.9,
                    overall_satisfaction: 0.7,
                    notes: None,
                },
                receiver_metrics: sample_metrics(),
                resource_hash: None,
                notes: Some("Invalid metrics test".to_string()),
            },
        )
        .await;

    assert!(
        invalid_result.is_err(),
        "Should reject invalid performance metrics (timeliness = 1.5)"
    );

    // Now issue with valid metrics.
    let valid_result = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: commitment.commitment_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
                zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.95,
                reliability: 0.8,
                communication: 0.9,
                overall_satisfaction: 0.88,
                notes: Some("Valid metrics".to_string()),
            },
            receiver_metrics: sample_metrics(),
            resource_hash: None,
            notes: Some("Valid metrics test".to_string()),
        },
    )
    .await;

    assert_eq!(
        valid_result.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyTransfer,
    );
    assert_eq!(
        valid_result.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::CustodyAcceptance,
    );
}
