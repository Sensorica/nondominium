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

// ─── Mirror structs ───────────────────────────────────────────────────────────
// These must match the serialized form of their counterparts in the zomes.
// VfAction, NdoLinkType, BenefitType are unit/newtype enums with PascalCase
// variant names (serde default — no rename attribute in the integrity zomes).

/// Mirrors `BeneficiaryRef` from `zome_gouvernance_integrity`.
/// Externally-tagged serde format: {"Agent": <AgentPubKey>}.
#[derive(Debug, Serialize, Deserialize)]
enum BeneficiaryRef {
    Agent(AgentPubKey),
}

/// Mirrors `BenefitType` from `zome_gouvernance_integrity`.
#[derive(Debug, Serialize, Deserialize)]
enum BenefitType {
    Monetary,
}

/// Mirrors `BenefitClause` from `zome_gouvernance_integrity`.
#[derive(Debug, Serialize, Deserialize)]
struct BenefitClause {
    pub receiver: BeneficiaryRef,
    pub share_percent: f64,
    pub benefit_type: BenefitType,
    pub note: Option<String>,
}

/// Mirrors `CreateAgreementInput` from `zome_gouvernance/agreement.rs`.
#[derive(Debug, Serialize, Deserialize)]
struct CreateAgreementInput {
    pub ndo_identity_hash: ActionHash,
    pub clauses: Vec<BenefitClause>,
    pub primary_accountable: Vec<AgentPubKey>,
}

/// Mirrors `UpdateAgreementInput` from `zome_gouvernance/agreement.rs`.
#[derive(Debug, Serialize, Deserialize)]
struct UpdateAgreementInput {
    pub original_action_hash: ActionHash,
    pub clauses: Vec<BenefitClause>,
    pub primary_accountable: Vec<AgentPubKey>,
}

/// Minimal `Agreement` fields asserted in tests.
#[derive(Debug, Serialize, Deserialize)]
struct AgreementOutput {
    pub version: u32,
    pub ndo_identity_hash: ActionHash,
}

/// Mirrors `AgreementRecord` from `zome_gouvernance/agreement.rs`.
#[derive(Debug, Serialize, Deserialize)]
struct AgreementRecord {
    pub action_hash: ActionHash,
    pub entry: AgreementOutput,
}

/// Mirrors `ValidateContributionInput` from `zome_gouvernance/contribution.rs`.
/// `action` is a String matching the PascalCase `VfAction` variant name.
#[derive(Debug, Serialize, Deserialize)]
struct ValidateContributionInput {
    pub provider: AgentPubKey,
    pub action: String, // "Work" | "Modify" | "Cite"
    pub work_log_group_dna_hash: Option<DnaHash>,
    pub work_log_action_hash: Option<ActionHash>,
    pub ndo_identity_hash: ActionHash,
    pub input_of: Option<ActionHash>,
    pub note: String,
    pub effort_quantity: Option<f64>,
    pub fulfills: Option<ActionHash>,
    pub has_point_in_time: Timestamp,
}

/// Minimal asserted fields for a returned Contribution.
#[derive(Debug, Serialize, Deserialize)]
struct ContributionOutput {
    pub note: String,
    pub provider: AgentPubKey,
}

/// Mirrors `ContributionRecord`.
#[derive(Debug, Serialize, Deserialize)]
struct ContributionRecord {
    pub action_hash: ActionHash,
    pub entry: ContributionOutput,
}

/// Mirrors `NdoLinkType` from `zome_gouvernance_integrity`.
/// PascalCase variant names (serde default).
#[derive(Debug, Serialize, Deserialize)]
enum NdoLinkType {
    Component,
    DerivedFrom,
    Supersedes,
}

/// Mirrors `CreateNdoHardLinkInput` from `zome_gouvernance/hard_link.rs`.
#[derive(Debug, Serialize, Deserialize)]
struct CreateNdoHardLinkInput {
    pub from_ndo_identity_hash: ActionHash,
    pub to_ndo_dna_hash: DnaHash,
    pub to_ndo_identity_hash: ActionHash,
    pub link_type: NdoLinkType,
    pub fulfillment_hash: ActionHash,
}

/// Minimal asserted fields for a returned NdoHardLink.
#[derive(Debug, Serialize, Deserialize)]
struct NdoHardLinkOutput {
    pub from_ndo_identity_hash: ActionHash,
    pub to_ndo_identity_hash: ActionHash,
}

/// Mirrors `NdoHardLinkRecord`.
#[derive(Debug, Serialize, Deserialize)]
struct NdoHardLinkRecord {
    pub action_hash: ActionHash,
    pub entry: NdoHardLinkOutput,
}

/// Mirrors `GetNdoHardLinksByTypeInput`.
#[derive(Debug, Serialize, Deserialize)]
struct GetNdoHardLinksByTypeInput {
    pub ndo_identity_hash: ActionHash,
    pub link_type: NdoLinkType,
}

/// Mirrors `LogEconomicEventInput` for creating a stub EconomicEvent.
#[derive(Debug, Serialize, Deserialize)]
struct LogEconomicEventInput {
    pub action: String,           // VfAction variant name e.g. "Use"
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: ActionHash,
    pub resource_quantity: f64,
    pub note: Option<String>,
    pub commitment_hash: Option<ActionHash>,
    pub generate_pprs: Option<bool>,
}

/// Minimal asserted fields from LogEconomicEventOutput.
#[derive(Debug, Serialize, Deserialize)]
struct LogEconomicEventOutput {
    pub event_hash: ActionHash,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// Create an Agreement (v1), then update it to v2, then verify get_current_agreement
/// resolves the update chain to the latest version.
#[tokio::test(flavor = "multi_thread")]
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
#[tokio::test(flavor = "multi_thread")]
async fn validate_and_get_contributions() {
    let (conductors, cell_alice, _cell_bob) = setup_two_agents().await;

    let ndo_hash = ActionHash::from_raw_36(vec![2u8; 36]);
    let alice_key = cell_alice.agent_pubkey().clone();
    let now = Timestamp::now();

    let input = ValidateContributionInput {
        provider: alice_key.clone(),
        action: "Work".to_string(),
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
    let from_ndo = ActionHash::from_raw_36(vec![3u8; 36]);
    let to_ndo = ActionHash::from_raw_36(vec![4u8; 36]);
    let to_dna = DnaHash::from_raw_36(vec![5u8; 36]);
    let stub_resource = ActionHash::from_raw_36(vec![6u8; 36]);

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
