//! PPR Scenario tests — translated from `ppr-system/ppr-scenarios.test.ts`.
//!
//! Complete workflow scenarios for the PPR system:
//! - Resource exchange workflow (service provision + signing + reputation)
//! - Knowledge sharing and community impact
//! - Governance participation and decision making
//! - Quality service exchange with validation

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

/// Helper — current time in microseconds plus an offset in microseconds.
fn now_micros_offset(offset_micros: i64) -> Timestamp {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as i64;
    Timestamp::from_micros(now + offset_micros)
}

const ONE_HOUR_MICROS: i64 = 60 * 60 * 1_000_000;
const ONE_DAY_MICROS: i64 = 24 * ONE_HOUR_MICROS;

// ---------------------------------------------------------------------------
// Scenario 1: Complete Resource Exchange Workflow
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_scenario_complete_resource_exchange_workflow() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Step 1 — Alice provides a web development service to bob.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: now_micros_offset(ONE_DAY_MICROS),
            note: Some("Web development service commitment".to_string()),
        },
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Web development service completed".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Step 2 — Issue PPRs for the service exchange.
    let web_dev_pprs = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
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
                notes: Some("High-quality web development service".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.95,
                reliability: 1.0,
                communication: 0.95,
                overall_satisfaction: 0.97,
                notes: Some("Very satisfied with the service".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Web development service PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    assert_eq!(
        web_dev_pprs.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
    );
    assert_eq!(
        web_dev_pprs.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::GoodFaithTransfer,
    );

    // Step 3 — Bob signs acknowledgment of service reception.
    let bob_sig = sign_participation_claim(
        &conductors[1],
        &bob,
        SignParticipationClaimInput {
            data_to_sign: b"Service received satisfactorily".to_vec(),
            counterparty: alice.agent_pubkey().clone(),
        },
    )
    .await;

    assert_eq!(bob_sig.signed_data_hash.len(), 32);

    // Step 4 — Verify reputation building.
    let alice_rep = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: now_micros_offset(-ONE_HOUR_MICROS),
            period_end: now_micros_offset(ONE_HOUR_MICROS),
            claim_type_filter: None,
        },
    )
    .await;

    assert!(alice_rep.summary.total_claims > 0);
    assert_eq!(alice_rep.summary.agent, alice.agent_pubkey().clone());
    assert!(alice_rep.claims_included > 0);

    // Step 5 — Verify participation history retrieval with filter.
    let alice_claims = get_my_participation_claims(
        &conductors[0],
        &alice,
        GetMyParticipationClaimsInput {
            claim_type_filter: Some(
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
            ),
            from_time: None,
            to_time: None,
            limit: None,
        },
    )
    .await;

    assert!(
        !alice_claims.claims.is_empty(),
        "Alice should have at least one MaintenanceFulfillmentCompleted claim"
    );

    let provision_claim = alice_claims.claims.iter().find(|(_h, c)| {
        c.claim_type
            == zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted
    });
    assert!(provision_claim.is_some());
    assert_eq!(
        provision_claim.unwrap().1.counterparty,
        bob.agent_pubkey().clone(),
    );
}

// ---------------------------------------------------------------------------
// Scenario 2: Knowledge Sharing and Community Impact
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_scenario_knowledge_sharing_and_community_impact() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice facilitates a knowledge sharing workshop for bob.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: now_micros_offset(ONE_DAY_MICROS),
            note: Some("Governance workshop facilitation".to_string()),
        },
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some("Interactive workshop on decentralized governance patterns".to_string()),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Issue governance-category PPRs.
    let workshop_pprs = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::ValidationActivity,
                zome_gouvernance_integrity::ParticipationClaimType::RuleCompliance,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.95,
                reliability: 0.98,
                communication: 0.95,
                overall_satisfaction: 0.97,
                notes: Some("Excellent knowledge sharing session".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.92,
                reliability: 1.0,
                communication: 0.9,
                overall_satisfaction: 0.95,
                notes: Some("Valuable learning experience".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Knowledge sharing workshop PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    assert_eq!(
        workshop_pprs.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::ValidationActivity,
    );
    assert_eq!(
        workshop_pprs.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::RuleCompliance,
    );

    // Verify knowledge sharing impact on reputation.
    let alice_rep = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: now_micros_offset(-ONE_HOUR_MICROS),
            period_end: now_micros_offset(ONE_HOUR_MICROS),
            claim_type_filter: None,
        },
    )
    .await;

    assert!(alice_rep.summary.total_claims > 0);
    assert!(
        alice_rep.summary.average_performance > 0.9,
        "Expected high average performance for excellent workshop, got {}",
        alice_rep.summary.average_performance
    );
}

// ---------------------------------------------------------------------------
// Scenario 3: Governance Participation and Decision Making
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_scenario_governance_participation_and_decision_making() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // Alice participates in community governance with bob.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: now_micros_offset(ONE_DAY_MICROS),
            note: Some("Community governance facilitation".to_string()),
        },
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some(
                "Led consensus building for new resource allocation policies".to_string(),
            ),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Issue governance participation PPRs.
    let gov_pprs = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::DisputeResolutionParticipation,
                zome_gouvernance_integrity::ParticipationClaimType::ValidationActivity,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.95,
                quality: 0.9,
                reliability: 0.95,
                communication: 0.98,
                overall_satisfaction: 0.94,
                notes: Some("Effective governance leadership".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 0.95,
                quality: 0.92,
                reliability: 1.0,
                communication: 0.95,
                overall_satisfaction: 0.95,
                notes: Some("Constructive governance participation".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Governance decision facilitation PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    assert_eq!(
        gov_pprs.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::DisputeResolutionParticipation,
    );
    assert_eq!(
        gov_pprs.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::ValidationActivity,
    );

    // Bob signs governance validation.
    let gov_sig = sign_participation_claim(
        &conductors[1],
        &bob,
        SignParticipationClaimInput {
            data_to_sign: b"Consensus decision validated".to_vec(),
            counterparty: alice.agent_pubkey().clone(),
        },
    )
    .await;

    assert_eq!(gov_sig.signed_data_hash.len(), 32);

    // Verify governance participation impact on reputation.
    let alice_rep = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: now_micros_offset(-ONE_HOUR_MICROS),
            period_end: now_micros_offset(ONE_HOUR_MICROS),
            claim_type_filter: None,
        },
    )
    .await;

    assert!(alice_rep.summary.total_claims > 0);
    assert!(
        alice_rep.summary.governance_claims > 0,
        "Expected governance_claims > 0, got {}",
        alice_rep.summary.governance_claims
    );
}

// ---------------------------------------------------------------------------
// Scenario 4: Quality Service Exchange with Validation
// ---------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread")]
async fn ppr_scenario_quality_service_exchange_with_validation() {
    let (conductors, alice, bob) = setup_two_agents().await;

    // High-quality service provision with detailed validation.
    let commitment = propose_commitment(
        &conductors[0],
        &alice,
        ProposeCommitmentInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            resource_hash: None,
            resource_spec_hash: None,
            due_date: now_micros_offset(ONE_DAY_MICROS),
            note: Some("Premium development service commitment".to_string()),
        },
    )
    .await;

    let event = log_economic_event(
        &conductors[0],
        &alice,
        LogEconomicEventInput {
            action: zome_gouvernance_integrity::VfAction::Work,
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            resource_inventoried_as: commitment.commitment_hash.clone(),
            resource_quantity: 1.0,
            note: Some(
                "Full-stack application development with testing and deployment".to_string(),
            ),
            commitment_hash: Some(commitment.commitment_hash.clone()),
            generate_pprs: Some(false),
        },
    )
    .await;

    // Issue premium service PPRs with high metrics.
    let service_pprs = issue_participation_receipts(
        &conductors[0],
        &alice,
        IssueParticipationReceiptsInput {
            fulfills: commitment.commitment_hash.clone(),
            fulfilled_by: event.event_hash.clone(),
            provider: alice.agent_pubkey().clone(),
            receiver: bob.agent_pubkey().clone(),
            claim_types: vec![
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
                zome_gouvernance_integrity::ParticipationClaimType::GoodFaithTransfer,
            ],
            provider_metrics: PerformanceMetricsInput {
                timeliness: 0.98,
                quality: 0.96,
                reliability: 0.98,
                communication: 0.94,
                overall_satisfaction: 0.96,
                notes: Some("Premium quality development service".to_string()),
            },
            receiver_metrics: PerformanceMetricsInput {
                timeliness: 1.0,
                quality: 0.95,
                reliability: 1.0,
                communication: 0.96,
                overall_satisfaction: 0.97,
                notes: Some("Excellent service delivery".to_string()),
            },
            resource_hash: Some(commitment.commitment_hash.clone()),
            notes: Some("Premium service exchange PPRs".to_string()),
        },
    )
    .await;

    await_consistency(Duration::from_secs(60), [&alice, &bob])
        .await
        .unwrap();

    assert_eq!(
        service_pprs.provider_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
    );
    assert_eq!(
        service_pprs.receiver_claim.claim_type,
        zome_gouvernance_integrity::ParticipationClaimType::GoodFaithTransfer,
    );

    // Quality validation signature from bob.
    let quality_sig = sign_participation_claim(
        &conductors[1],
        &bob,
        SignParticipationClaimInput {
            data_to_sign: b"Quality validated - deliverables complete".to_vec(),
            counterparty: alice.agent_pubkey().clone(),
        },
    )
    .await;

    assert_eq!(quality_sig.signed_data_hash.len(), 32);

    // Verify high-quality service impact on reputation.
    let alice_rep = derive_reputation_summary(
        &conductors[0],
        &alice,
        DeriveReputationSummaryInput {
            period_start: now_micros_offset(-ONE_HOUR_MICROS),
            period_end: now_micros_offset(ONE_HOUR_MICROS),
            claim_type_filter: None,
        },
    )
    .await;

    assert!(alice_rep.summary.total_claims > 0);
    assert!(
        alice_rep.summary.average_performance > 0.95,
        "Expected average_performance > 0.95 for premium service, got {}",
        alice_rep.summary.average_performance
    );

    // Verify service provision claims via filter.
    let alice_claims = get_my_participation_claims(
        &conductors[0],
        &alice,
        GetMyParticipationClaimsInput {
            claim_type_filter: Some(
                zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted,
            ),
            from_time: None,
            to_time: None,
            limit: None,
        },
    )
    .await;

    assert!(
        !alice_claims.claims.is_empty(),
        "Alice should have MaintenanceFulfillmentCompleted claims"
    );

    let service_claim = alice_claims.claims.iter().find(|(_h, c)| {
        c.claim_type
            == zome_gouvernance_integrity::ParticipationClaimType::MaintenanceFulfillmentCompleted
    });
    assert!(service_claim.is_some());
}
