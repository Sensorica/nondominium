//! Governance zome Sweettest integration tests.
//!
//! Covers the NDO federation extensions added in issue #100:
//!   - Agreement: create_agreement, update_agreement, get_current_agreement
//!   - Contribution: validate_contribution, get_ndo_contributions, get_agent_contributions
//!   - NdoHardLink: create_ndo_hard_link, get_ndo_hard_links, get_ndo_hard_links_by_type
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds nondominium.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test governance

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;
// Shared types — imported directly, no mirror needed.
use nondominium_shared::io::governance::{
    CreateAgreementInput, CreateNdoHardLinkInput, GetNdoHardLinksByTypeInput,
    UpdateAgreementInput, ValidateContributionInput,
};
use nondominium_shared::types::{BeneficiaryRef, BenefitClause, BenefitType, NdoLinkType, VfAction};

// ─── Local output types (partial views for assertion — reference entry types
//     from integrity zomes which cannot be imported in native test crates) ──────

/// Minimal Agreement fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct AgreementOutput {
    pub version: u32,
    pub ndo_identity_hash: ActionHash,
}

/// Record wrapper matching `AgreementRecord` in the coordinator.
#[derive(Debug, Serialize, Deserialize)]
struct AgreementRecord {
    pub action_hash: ActionHash,
    pub entry: AgreementOutput,
}

/// Minimal Contribution fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct ContributionOutput {
    pub note: String,
    pub provider: AgentPubKey,
}

/// Record wrapper matching `ContributionRecord` in the coordinator.
#[derive(Debug, Serialize, Deserialize)]
struct ContributionRecord {
    pub action_hash: ActionHash,
    pub entry: ContributionOutput,
}

/// Minimal NdoHardLink fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct NdoHardLinkOutput {
    pub from_ndo_identity_hash: ActionHash,
    pub to_ndo_identity_hash: ActionHash,
}

/// Record wrapper matching `NdoHardLinkRecord` in the coordinator.
#[derive(Debug, Serialize, Deserialize)]
struct NdoHardLinkRecord {
    pub action_hash: ActionHash,
    pub entry: NdoHardLinkOutput,
}

/// Mirrors `LogEconomicEventInput` for creating a stub EconomicEvent.
#[derive(Debug, Serialize, Deserialize)]
struct LogEconomicEventInput {
    pub action: String, // VfAction variant name e.g. "Use"
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: ActionHash,
    pub resource_quantity: f64,
    pub note: Option<String>,
    pub commitment_hash: Option<ActionHash>,
    pub generate_pprs: Option<bool>,
    pub ndo_identity_hash: ActionHash,
}

/// Minimal asserted fields from LogEconomicEventOutput.
#[derive(Debug, Serialize, Deserialize)]
struct LogEconomicEventOutput {
    pub event_hash: ActionHash,
}

/// Mirrors create_ndo input/output for Layer 0 setup in governance tests.
#[derive(Debug, Serialize, Deserialize)]
struct NdoInput {
    pub name: String,
    pub property_regime: String,
    pub resource_nature: String,
    pub lifecycle_stage: String,
    pub description: Option<String>,
    pub rivalry_override: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NdoOutput {
    pub action_hash: ActionHash,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// Create an Agreement (v1), then update it to v2, then verify get_current_agreement
/// resolves the update chain to the latest version.
/// TODO: Requires AccountableAgent role. Test needs create_person + assign_person_role
/// setup before calling create_agreement. See governance/role.rs assign_person_role.
#[tokio::test(flavor = "multi_thread")]
#[ignore]
async fn create_and_get_agreement() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let ndo_hash = ActionHash::from_raw_36(vec![1u8; 36]);
    let alice_key = cell_alice.agent_pubkey().clone();

    let clause = BenefitClause {
        receiver: BeneficiaryRef::Agent(alice_key.clone()),
        share_percent: 100.0,
        benefit_type: BenefitType::Monetary,
        note: None,
    };

    // Create Agreement v1
    let v1_hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "create_agreement",
            CreateAgreementInput {
                ndo_identity_hash: ndo_hash.clone(),
                clauses: vec![clause.clone()],
                primary_accountable: vec![alice_key.clone()],
            },
        )
        .await;

    // Retrieve via get_current_agreement — should be v1
    let record_v1: Option<AgreementRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_current_agreement",
            ndo_hash.clone(),
        )
        .await;

    let record_v1 = record_v1.expect("v1 agreement should exist");
    assert_eq!(record_v1.entry.version, 1);
    assert_eq!(record_v1.entry.ndo_identity_hash, ndo_hash);

    // Update to v2
    let _v2_hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "update_agreement",
            UpdateAgreementInput {
                original_action_hash: v1_hash,
                clauses: vec![clause],
                primary_accountable: vec![alice_key],
            },
        )
        .await;

    // get_current_agreement should now resolve to v2
    let record_v2: Option<AgreementRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_current_agreement",
            ndo_hash,
        )
        .await;

    let record_v2 = record_v2.expect("v2 agreement should exist");
    assert_eq!(record_v2.entry.version, 2, "version should increment to 2 after update");
}

/// Record a Work contribution for an NDO, then retrieve it by NDO hash and by
/// provider agent key, verifying both discovery paths return the contribution.
/// TODO: Requires AccountableAgent role. Test needs create_person + assign_person_role
/// setup before calling validate_contribution. See governance/role.rs assign_person_role.
#[tokio::test(flavor = "multi_thread")]
#[ignore]
async fn validate_and_get_contributions() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let ndo_hash = ActionHash::from_raw_36(vec![2u8; 36]);
    let alice_key = cell_alice.agent_pubkey().clone();
    let now = Timestamp::now();

    let input = ValidateContributionInput {
        provider: alice_key.clone(),
        action: VfAction::Work,
        work_log_group_dna_hash: None,
        work_log_action_hash: None,
        ndo_identity_hash: ndo_hash.clone(),
        input_of: None,
        note: "Designed the housing component".to_string(),
        effort_quantity: Some(4.5),
        fulfills: None,
        has_point_in_time: now,
    };

    let contrib_hash: ActionHash = conductors[0]
        .call(&cell_alice.zome("zome_gouvernance"), "validate_contribution", input)
        .await;

    assert_ne!(contrib_hash, ActionHash::from_raw_36(vec![0u8; 36]));

    // get_ndo_contributions should find it
    let by_ndo: Vec<ContributionRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_ndo_contributions",
            ndo_hash,
        )
        .await;

    assert_eq!(by_ndo.len(), 1, "one contribution expected for this NDO");
    assert_eq!(by_ndo[0].entry.note, "Designed the housing component");

    // get_agent_contributions should find it via provider key
    let by_provider: Vec<ContributionRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_agent_contributions",
            alice_key,
        )
        .await;

    assert_eq!(by_provider.len(), 1, "one contribution expected for this provider");
    assert_eq!(by_provider[0].action_hash, contrib_hash);
}

/// Create an NdoHardLink backed by a real EconomicEvent, then verify
/// get_ndo_hard_links and get_ndo_hard_links_by_type both find it.
#[tokio::test(flavor = "multi_thread")]
async fn create_and_get_ndo_hard_link() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let alice_key = cell_alice.agent_pubkey().clone();
    let to_ndo = ActionHash::from_raw_36(vec![4u8; 36]);
    let to_dna = DnaHash::from_raw_36(vec![5u8; 36]);
    let stub_resource = ActionHash::from_raw_36(vec![6u8; 36]);

    // Real Layer 0 NDO — EconomicEvent integrity requires a resolvable ndo_identity_hash
    let ndo: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "HardLink Source NDO".to_string(),
                property_regime: "Commons".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;
    let from_ndo = ndo.action_hash.clone();

    // Create a real EconomicEvent to use as fulfillment_hash
    let event_output: LogEconomicEventOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "log_economic_event",
            LogEconomicEventInput {
                action: "Use".to_string(),
                provider: alice_key.clone(),
                receiver: alice_key.clone(),
                resource_inventoried_as: stub_resource,
                resource_quantity: 1.0,
                note: Some("link fulfillment event".to_string()),
                commitment_hash: None,
                generate_pprs: Some(false),
                ndo_identity_hash: from_ndo.clone(),
            },
        )
        .await;

    let fulfillment_hash = event_output.event_hash;

    // Create the hard link
    let link_hash: ActionHash = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "create_ndo_hard_link",
            CreateNdoHardLinkInput {
                from_ndo_identity_hash: from_ndo.clone(),
                to_ndo_dna_hash: to_dna,
                to_ndo_identity_hash: to_ndo.clone(),
                link_type: NdoLinkType::Component,
                fulfillment_hash,
            },
        )
        .await;

    // get_ndo_hard_links should find it
    let all_links: Vec<NdoHardLinkRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_ndo_hard_links",
            from_ndo.clone(),
        )
        .await;

    assert_eq!(all_links.len(), 1, "one hard link expected");
    assert_eq!(all_links[0].action_hash, link_hash);
    assert_eq!(all_links[0].entry.from_ndo_identity_hash, from_ndo);
    assert_eq!(all_links[0].entry.to_ndo_identity_hash, to_ndo);

    // get_ndo_hard_links_by_type(Component) should also find it
    let component_links: Vec<NdoHardLinkRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_ndo_hard_links_by_type",
            GetNdoHardLinksByTypeInput {
                ndo_identity_hash: from_ndo.clone(),
                link_type: NdoLinkType::Component,
            },
        )
        .await;

    assert_eq!(component_links.len(), 1, "Component type filter should return 1 link");

    // get_ndo_hard_links_by_type(DerivedFrom) should return empty
    let derived_links: Vec<NdoHardLinkRecord> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_ndo_hard_links_by_type",
            GetNdoHardLinksByTypeInput {
                ndo_identity_hash: from_ndo,
                link_type: NdoLinkType::DerivedFrom,
            },
        )
        .await;

    assert_eq!(derived_links.len(), 0, "DerivedFrom filter should return 0 links");
}

/// Phase B: Transfer on a Nondominium NDO is Hard-rejected at integrity.
#[tokio::test(flavor = "multi_thread")]
async fn nondominium_transfer_event_is_hard_rejected() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;
    let alice_key = cell_alice.agent_pubkey().clone();
    let stub_resource = ActionHash::from_raw_36(vec![7u8; 36]);

    let ndo: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Uncapturable Tool".to_string(),
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    let result = conductors[0]
        .call_fallible::<_, LogEconomicEventOutput>(
            &cell_alice.zome("zome_gouvernance"),
            "log_economic_event",
            LogEconomicEventInput {
                action: "Transfer".to_string(),
                provider: alice_key.clone(),
                receiver: alice_key.clone(),
                resource_inventoried_as: stub_resource,
                resource_quantity: 1.0,
                note: Some("should fail".to_string()),
                commitment_hash: None,
                generate_pprs: Some(false),
                ndo_identity_hash: ndo.action_hash,
            },
        )
        .await;

    assert!(
        result.is_err(),
        "Transfer on a Nondominium NDO must be Hard-rejected"
    );
}

/// Phase B: dry-run action constraints surface Soft Move warning for Digital.
#[tokio::test(flavor = "multi_thread")]
async fn check_action_constraints_soft_for_digital_move() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    #[derive(Debug, Serialize, Deserialize)]
    struct CheckActionInput {
        pub property_regime: String,
        pub resource_nature: String,
        pub rivalry_override: Option<String>,
        pub action: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct ConstraintViolation {
        pub rule_id: String,
        pub message: String,
        pub severity: String,
    }

    let violations: Vec<ConstraintViolation> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "check_action_constraints",
            CheckActionInput {
                property_regime: "Commons".to_string(),
                resource_nature: "Digital".to_string(),
                rivalry_override: None,
                action: "Move".to_string(),
            },
        )
        .await;

    assert!(
        violations.iter().any(|v| v.severity == "Soft"
            && v.rule_id == "no_transport_for_non_physical_nature"),
        "expected Soft transport warning, got {:?}",
        violations
    );
}

/// Phase B: evaluate_state_transition Hard-rejects Transfer on Nondominium;
/// Soft-advises Move on Digital (parallel path, no write).
#[tokio::test(flavor = "multi_thread")]
async fn evaluate_state_transition_hard_and_soft_paths() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;
    let alice_key = cell_alice.agent_pubkey().clone();

    let ndo_nd: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Nondominium Gate NDO".to_string(),
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    let ndo_digital: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Digital Design NDO".to_string(),
                property_regime: "Commons".to_string(),
                resource_nature: "Digital".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct EconomicResourceView {
        pub quantity: f64,
        pub unit: String,
        pub custodian: AgentPubKey,
        pub current_location: Option<String>,
        pub operational_state: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct TransitionContext {
        pub target_location: Option<String>,
        pub quantity_change: Option<f64>,
        pub target_custodian: Option<AgentPubKey>,
        pub process_notes: Option<String>,
        pub process_context: Option<ActionHash>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct GovernanceTransitionRequest {
        pub action: String,
        pub resource: EconomicResourceView,
        pub ndo_identity_hash: ActionHash,
        pub requesting_agent: AgentPubKey,
        pub context: TransitionContext,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct GovernanceTransitionResult {
        pub success: bool,
        pub rejection_reasons: Option<Vec<String>>,
        pub advisory_warnings: Option<Vec<String>>,
    }

    let resource = EconomicResourceView {
        quantity: 1.0,
        unit: "each".to_string(),
        custodian: alice_key.clone(),
        current_location: None,
        operational_state: "Available".to_string(),
    };
    let context = TransitionContext {
        target_location: None,
        quantity_change: None,
        target_custodian: None,
        process_notes: None,
        process_context: None,
    };

    let hard: GovernanceTransitionResult = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "evaluate_state_transition",
            GovernanceTransitionRequest {
                action: "Transfer".to_string(),
                resource: resource.clone(),
                ndo_identity_hash: ndo_nd.action_hash,
                requesting_agent: alice_key.clone(),
                context: TransitionContext {
                    target_location: None,
                    quantity_change: None,
                    target_custodian: None,
                    process_notes: None,
                    process_context: None,
                },
            },
        )
        .await;

    assert!(!hard.success, "Transfer on Nondominium must fail evaluation");
    assert!(
        hard
            .rejection_reasons
            .as_ref()
            .map(|r| r.iter().any(|s| s.contains("nondominium_no_unilateral_capture")))
            .unwrap_or(false),
        "expected capture-resistance rejection, got {:?}",
        hard.rejection_reasons
    );

    let soft: GovernanceTransitionResult = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "evaluate_state_transition",
            GovernanceTransitionRequest {
                action: "Move".to_string(),
                resource,
                ndo_identity_hash: ndo_digital.action_hash,
                requesting_agent: alice_key,
                context,
            },
        )
        .await;

    assert!(soft.success, "Move on Digital is Soft-only; must still succeed");
    assert!(
        soft
            .advisory_warnings
            .as_ref()
            .map(|w| w.iter().any(|s| s.contains("no_transport_for_non_physical_nature")))
            .unwrap_or(false),
        "expected Soft transport advisory, got {:?}",
        soft.advisory_warnings
    );
}

// ─── Layer 2 discovery (F3) ───────────────────────────────────────────────────

/// Mirrors `ProposeCommitmentInput` in the commitment coordinator.
#[derive(Debug, Serialize, Deserialize)]
struct ProposeCommitmentInput {
    pub action: String, // VfAction variant name
    pub resource_hash: Option<ActionHash>,
    pub resource_spec_hash: Option<ActionHash>,
    pub provider: AgentPubKey,
    pub due_date: Timestamp,
    pub note: Option<String>,
    pub ndo_identity_hash: ActionHash,
}

/// Minimal asserted fields from `ProposeCommitmentOutput`.
#[derive(Debug, Serialize, Deserialize)]
struct ProposeCommitmentOutput {
    pub commitment_hash: ActionHash,
}

/// Minimal Commitment fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct CommitmentOutput {
    pub note: Option<String>,
    pub ndo_identity_hash: ActionHash,
}

/// Minimal EconomicEvent fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct EconomicEventOutput {
    pub note: Option<String>,
    pub ndo_identity_hash: ActionHash,
}

/// A commitment written by an agent must be discoverable by that same agent,
/// in the same cell, in the same call sequence. This is the Layer 2 read path
/// the Activity tab depends on: without it the tab can never render what it
/// just wrote (F3, PR #132 round 1).
#[tokio::test(flavor = "multi_thread")]
async fn commitment_is_discoverable_by_its_author() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;
    let alice_key = cell_alice.agent_pubkey().clone();

    let ndo: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Layer 2 Discovery NDO".to_string(),
                property_regime: "Commons".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    let output: ProposeCommitmentOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "propose_commitment",
            ProposeCommitmentInput {
                action: "Use".to_string(),
                resource_hash: None,
                resource_spec_hash: None,
                provider: alice_key.clone(),
                due_date: Timestamp::now(),
                note: Some("discoverable commitment".to_string()),
                ndo_identity_hash: ndo.action_hash.clone(),
            },
        )
        .await;

    assert_ne!(output.commitment_hash, ActionHash::from_raw_36(vec![0u8; 36]));

    let commitments: Vec<CommitmentOutput> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_all_commitments",
            (),
        )
        .await;

    assert_eq!(
        commitments.len(),
        1,
        "the author must be able to read back the commitment it just wrote"
    );
    assert_eq!(
        commitments[0].note.as_deref(),
        Some("discoverable commitment")
    );
    assert_eq!(commitments[0].ndo_identity_hash, ndo.action_hash);
}

/// Same contract as `commitment_is_discoverable_by_its_author`, for the other
/// half of the Activity tab: an economic event must be readable by its author.
#[tokio::test(flavor = "multi_thread")]
async fn economic_event_is_discoverable_by_its_author() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;
    let alice_key = cell_alice.agent_pubkey().clone();
    let stub_resource = ActionHash::from_raw_36(vec![8u8; 36]);

    let ndo: NdoOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Layer 2 Event Discovery NDO".to_string(),
                property_regime: "Commons".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    let _event: LogEconomicEventOutput = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "log_economic_event",
            LogEconomicEventInput {
                action: "Use".to_string(),
                provider: alice_key.clone(),
                receiver: alice_key.clone(),
                resource_inventoried_as: stub_resource,
                resource_quantity: 1.0,
                note: Some("discoverable event".to_string()),
                commitment_hash: None,
                generate_pprs: Some(false),
                ndo_identity_hash: ndo.action_hash.clone(),
            },
        )
        .await;

    let events: Vec<EconomicEventOutput> = conductors[0]
        .call(
            &cell_alice.zome("zome_gouvernance"),
            "get_all_economic_events",
            (),
        )
        .await;

    assert_eq!(
        events.len(),
        1,
        "the author must be able to read back the economic event it just wrote"
    );
    assert_eq!(events[0].note.as_deref(), Some("discoverable event"));
    assert_eq!(events[0].ndo_identity_hash, ndo.action_hash);
}
