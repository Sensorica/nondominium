//! Resource zome Sweettest integration tests.
//!
//! Covers `get_all_resource_specifications` — specifically that the new
//! `action_hashes` field is returned in parallel with `specifications` and
//! that both vectors have the same length and order.
//!
//! Covers `OperationalState` on `EconomicResource`: default on create,
//! `update_operational_state`, and `get_resources_by_operational_state`.
//!
//! Phase B: Layer 1 activation requires an eligible NDO + typed governance rules.
//!
//! Prerequisites (runtime — not compile-time):
//!   bun run build:happ   # builds nondominium.dna
//!
//! Run:
//!   CARGO_TARGET_DIR=target/native-tests cargo test --test resource

use holochain::prelude::*;
use holochain::sweettest::{SweetCell, SweetConductorBatch};
use nondominium_shared::types::OperationalState;
use serde::{Deserialize, Serialize};

use nondominium_sweettest::common::*;

// ---------------------------------------------------------------------------
// Local mirror structs — avoids importing zome crates into the test binary.
// These must match the serialized form of their counterparts in the zomes.
// ---------------------------------------------------------------------------

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

#[derive(Debug, Serialize, Deserialize)]
struct NestedGovernanceRuleInput {
    pub rule_data: RuleDataMirror,
    pub enforced_by: Option<String>,
}

/// Externally-tagged RuleData mirror (serde default for Rust enums).
#[derive(Debug, Serialize, Deserialize)]
enum RuleDataMirror {
    AccessRequirement {
        accessibility: String,
        required_role: Option<String>,
        min_affiliation: Option<String>,
    },
    UsageLimit {
        max_duration_hours: Option<f64>,
        max_quantity_per_period: Option<f64>,
        period_days: Option<u32>,
    },
    TransferCondition {
        transfer_type: String,
        requires_validation: bool,
        validator_role: Option<String>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct ResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub scope: String,
    pub ndo_identity_hash: ActionHash,
    pub governance_rules: Vec<NestedGovernanceRuleInput>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
    pub scope: String,
    pub ndo_identity_hash: ActionHash,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateResourceSpecificationOutput {
    pub spec_hash: ActionHash,
    pub spec: ResourceSpecification,
    pub governance_rule_hashes: Vec<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GetAllResourceSpecificationsOutput {
    pub specifications: Vec<ResourceSpecification>,
    pub action_hashes: Vec<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EconomicResource {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,
    pub current_location: Option<String>,
    pub operational_state: OperationalState,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResource,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateOperationalStateInput {
    pub resource_hash: ActionHash,
    pub new_operational_state: OperationalState,
}

#[derive(Debug, Serialize, Deserialize)]
struct GovernanceRuleInput {
    pub rule_data: RuleDataMirror,
    pub enforced_by: Option<String>,
    pub ndo_identity_hash: ActionHash,
    pub property_regime: String,
    pub resource_nature: String,
    pub rivalry_override: Option<String>,
    pub specification_hash: Option<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CheckRuleDataConstraintsInput {
    pub property_regime: String,
    pub resource_nature: String,
    pub rivalry_override: Option<String>,
    pub rule_data: RuleDataMirror,
}

#[derive(Debug, Serialize, Deserialize)]
struct ConstraintViolation {
    pub rule_id: String,
    pub message: String,
    pub severity: String,
}

async fn create_ndo_at_stage(
    conductors: &SweetConductorBatch,
    cell: &SweetCell,
    name: &str,
    stage: &str,
) -> ActionHash {
    let ndo: NdoOutput = conductors[0]
        .call(
            &cell.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: name.to_string(),
                property_regime: "Commons".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: stage.to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;
    ndo.action_hash
}

fn spec_input(name: &str, category: &str, ndo: ActionHash) -> ResourceSpecificationInput {
    ResourceSpecificationInput {
        name: name.to_string(),
        description: format!("Description for {name}"),
        category: category.to_string(),
        image_url: None,
        tags: vec![category.to_string()],
        scope: "Public".to_string(),
        ndo_identity_hash: ndo,
        governance_rules: vec![],
    }
}

// ---------------------------------------------------------------------------
// Helpers for Present App entry extraction (economic resource tests)
// ---------------------------------------------------------------------------

fn extract_economic_resource(record: &Record) -> EconomicResource {
    match record.entry().as_option() {
        Some(Entry::App(app_bytes)) => holochain_serialized_bytes::decode(app_bytes.bytes())
            .expect("decode EconomicResource"),
        _ => panic!("expected Present App entry"),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// `get_all_resource_specifications` returns both `specifications` and
/// `action_hashes` as parallel vectors of the same length.
#[tokio::test(flavor = "multi_thread")]
async fn get_all_resource_specifications_returns_parallel_hashes() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo1 = create_ndo_at_stage(&conductors, &alice, "NDO for Bicycle", "Specification").await;
    let ndo2 = create_ndo_at_stage(&conductors, &alice, "NDO for Helmet", "Specification").await;

    let _: CreateResourceSpecificationOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input("Shared Bicycle", "Transportation", ndo1),
        )
        .await;

    let _: CreateResourceSpecificationOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input("Safety Helmet", "Safety", ndo2),
        )
        .await;

    let output: GetAllResourceSpecificationsOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_all_resource_specifications",
            (),
        )
        .await;

    assert!(
        output.specifications.len() >= 2,
        "expected at least 2 specifications, got {}",
        output.specifications.len()
    );
    assert_eq!(
        output.specifications.len(),
        output.action_hashes.len(),
        "specifications and action_hashes must have the same length"
    );

    let names: Vec<&str> = output
        .specifications
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    assert!(names.contains(&"Shared Bicycle"));
    assert!(names.contains(&"Safety Helmet"));

    for (i, hash) in output.action_hashes.iter().enumerate() {
        assert_eq!(
            hash.get_raw_39().len(),
            39,
            "action_hash at index {} is not 39 bytes",
            i
        );
    }
}

/// New economic resources default to `PendingValidation`; custodian can update
/// operational state and query by operational state anchor.
#[tokio::test(flavor = "multi_thread")]
async fn economic_resource_operational_state_lifecycle() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo = create_ndo_at_stage(&conductors, &alice, "NDO for Drill", "Active").await;

    let spec_out: CreateResourceSpecificationOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input("Operational Drill", "tools", ndo),
        )
        .await;

    let resource_out: CreateEconomicResourceOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_economic_resource",
            EconomicResourceInput {
                spec_hash: spec_out.spec_hash,
                quantity: 1.0,
                unit: "each".to_string(),
                current_location: Some("workshop".to_string()),
            },
        )
        .await;

    assert_eq!(
        resource_out.resource.operational_state,
        OperationalState::PendingValidation
    );

    let updated_record: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "update_operational_state",
            UpdateOperationalStateInput {
                resource_hash: resource_out.resource_hash.clone(),
                new_operational_state: OperationalState::Available,
            },
        )
        .await;

    let record: Option<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_latest_economic_resource_record",
            resource_out.resource_hash,
        )
        .await;
    let record = record.expect("updated resource record");
    let resource = extract_economic_resource(&record);
    assert_eq!(resource.operational_state, OperationalState::Available);
    assert_eq!(updated_record.action_address().get_raw_39().len(), 39);

    let by_state: Vec<Record> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_resources_by_operational_state",
            OperationalState::Available,
        )
        .await;
    assert!(
        !by_state.is_empty(),
        "expected at least one Available resource"
    );
}

/// `get_specifications_for_ndo` returns only specs linked via `NdoToSpecification`.
#[tokio::test(flavor = "multi_thread")]
async fn get_specifications_for_ndo_returns_linked_specs_only() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo_a = create_ndo_at_stage(&conductors, &alice, "NDO A for specs", "Specification").await;
    let ndo_b = create_ndo_at_stage(&conductors, &alice, "NDO B empty", "Specification").await;

    let created: CreateResourceSpecificationOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input("Spec for NDO A", "tools", ndo_a.clone()),
        )
        .await;

    let for_a: GetAllResourceSpecificationsOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            ndo_a,
        )
        .await;

    assert_eq!(for_a.specifications.len(), 1);
    assert_eq!(for_a.action_hashes.len(), 1);
    assert_eq!(for_a.specifications[0].name, "Spec for NDO A");
    assert_eq!(for_a.action_hashes[0], created.spec_hash);

    let for_b: GetAllResourceSpecificationsOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "get_specifications_for_ndo",
            ndo_b,
        )
        .await;

    assert!(
        for_b.specifications.is_empty(),
        "unrelated NDO must return no specs"
    );
    assert!(for_b.action_hashes.is_empty());
}

/// Layer 1 creation is rejected while the NDO is still in Ideation.
#[tokio::test(flavor = "multi_thread")]
async fn resource_spec_rejected_at_ideation_stage() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo = create_ndo_at_stage(&conductors, &alice, "Ideation NDO", "Ideation").await;

    let result = conductors[0]
        .call_fallible::<_, CreateResourceSpecificationOutput>(
            &alice.zome("zome_resource"),
            "create_resource_specification",
            spec_input("Should Fail Spec", "tools", ndo),
        )
        .await;

    assert!(
        result.is_err(),
        "creating a ResourceSpecification on an Ideation NDO must fail"
    );
}

/// Ownership-transfer rule on Nondominium is a Hard violation via dry-run query.
#[tokio::test(flavor = "multi_thread")]
async fn check_rule_data_constraints_blocks_nondominium_ownership_transfer() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let violations: Vec<ConstraintViolation> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_rule_data_constraints",
            CheckRuleDataConstraintsInput {
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                rule_data: RuleDataMirror::AccessRequirement {
                    // Use TransferCondition via a second call below
                    accessibility: "Free".to_string(),
                    required_role: None,
                    min_affiliation: None,
                },
            },
        )
        .await;
    // Free access on Nondominium → no violations
    assert!(violations.is_empty());

    #[derive(Debug, Serialize, Deserialize)]
    enum TransferRuleData {
        TransferCondition {
            transfer_type: String,
            requires_validation: bool,
            validator_role: Option<String>,
        },
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct CheckTransferInput {
        pub property_regime: String,
        pub resource_nature: String,
        pub rivalry_override: Option<String>,
        pub rule_data: TransferRuleData,
    }

    let hard: Vec<ConstraintViolation> = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "check_rule_data_constraints",
            CheckTransferInput {
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                rule_data: TransferRuleData::TransferCondition {
                    transfer_type: "Ownership".to_string(),
                    requires_validation: false,
                    validator_role: None,
                },
            },
        )
        .await;

    assert!(
        hard.iter().any(|v| v.severity == "Hard"
            && v.rule_id == "ownership_transfer_not_permitted_by_regime"),
        "expected Hard ownership_transfer violation, got {:?}",
        hard
    );
}

// ---------------------------------------------------------------------------
// Layer 0 → Layer 1 trust boundary
//
// `check_rule_data_constraints` above proves the *predicate* works, but it
// takes the classification as a parameter — it says nothing about whether the
// integrity zome binds a rule's denormalized classification to the NDO it
// claims to describe. These tests cover that binding, which is what makes the
// Nondominium guarantees enforceable rather than self-declared.
// ---------------------------------------------------------------------------

/// A rule whose denormalized `property_regime` contradicts its Layer 0 NDO is
/// rejected. Without this, every classification-driven constraint is advisory:
/// the writer picks the classification the validator will judge them against.
#[tokio::test(flavor = "multi_thread")]
async fn governance_rule_rejects_classification_drift_from_layer0() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo = create_ndo_at_stage(
        &conductors,
        &alice,
        "Nondominium NDO for drift test",
        "Active",
    )
    .await;

    // create_ndo_at_stage pins property_regime to Commons; declare Private.
    let result = conductors[0]
        .call_fallible::<_, Record>(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            GovernanceRuleInput {
                rule_data: RuleDataMirror::UsageLimit {
                    max_duration_hours: Some(4.0),
                    max_quantity_per_period: None,
                    period_days: None,
                },
                enforced_by: None,
                ndo_identity_hash: ndo,
                property_regime: "Private".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                specification_hash: None,
            },
        )
        .await;

    assert!(
        result.is_err(),
        "a GovernanceRule declaring Private against a Commons NDO must be rejected; \
         otherwise the denormalized classification is attacker-controlled"
    );
}

/// A rule whose denormalized `resource_nature` contradicts its Layer 0 NDO is
/// rejected. Nature drives rivalry defaults, so it is load-bearing too.
#[tokio::test(flavor = "multi_thread")]
async fn governance_rule_rejects_nature_drift_from_layer0() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    // create_ndo_at_stage pins resource_nature to Physical.
    let ndo = create_ndo_at_stage(&conductors, &alice, "NDO for nature drift", "Active").await;

    let result = conductors[0]
        .call_fallible::<_, Record>(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            GovernanceRuleInput {
                rule_data: RuleDataMirror::UsageLimit {
                    max_duration_hours: Some(1.0),
                    max_quantity_per_period: None,
                    period_days: None,
                },
                enforced_by: None,
                ndo_identity_hash: ndo,
                property_regime: "Commons".to_string(),
                resource_nature: "Digital".to_string(),
                rivalry_override: None,
                specification_hash: None,
            },
        )
        .await;

    assert!(
        result.is_err(),
        "a GovernanceRule declaring Digital against a Physical NDO must be rejected"
    );
}

/// The capture-resistance gate holds against a misdeclared classification.
///
/// This is the attack the drift binding exists to stop: an ownership-transfer
/// rule on a Nondominium NDO, smuggled past `check_rule_data_permitted` by
/// declaring `Private` on the rule entry. REQ-RES-03.
#[tokio::test(flavor = "multi_thread")]
async fn nondominium_ownership_transfer_not_bypassable_by_misdeclared_regime() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo: NdoOutput = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_ndo",
            NdoInput {
                name: "Uncapturable NDO".to_string(),
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                lifecycle_stage: "Active".to_string(),
                description: None,
                rivalry_override: None,
            },
        )
        .await;

    let honest = conductors[0]
        .call_fallible::<_, Record>(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            GovernanceRuleInput {
                rule_data: RuleDataMirror::TransferCondition {
                    transfer_type: "Ownership".to_string(),
                    requires_validation: false,
                    validator_role: None,
                },
                enforced_by: None,
                ndo_identity_hash: ndo.action_hash.clone(),
                property_regime: "Nondominium".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                specification_hash: None,
            },
        )
        .await;

    assert!(
        honest.is_err(),
        "ownership-transfer rule on a Nondominium NDO must be rejected (REQ-RES-03)"
    );

    let smuggled = conductors[0]
        .call_fallible::<_, Record>(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            GovernanceRuleInput {
                rule_data: RuleDataMirror::TransferCondition {
                    transfer_type: "Ownership".to_string(),
                    requires_validation: false,
                    validator_role: None,
                },
                enforced_by: None,
                ndo_identity_hash: ndo.action_hash,
                // The bypass: claim a regime that permits ownership transfer.
                property_regime: "Private".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                specification_hash: None,
            },
        )
        .await;

    assert!(
        smuggled.is_err(),
        "ownership-transfer rule on a Nondominium NDO must stay rejected even when \
         the rule entry declares Private — capture resistance cannot be self-declared"
    );
}

/// An honest rule on a matching NDO still succeeds. Guards the drift binding
/// against being over-tight and breaking the happy path.
#[tokio::test(flavor = "multi_thread")]
async fn governance_rule_accepts_classification_matching_layer0() {
    let (conductors, alice, _bob) = setup_two_agents().await;

    let ndo = create_ndo_at_stage(&conductors, &alice, "NDO for honest rule", "Active").await;

    let _: Record = conductors[0]
        .call(
            &alice.zome("zome_resource"),
            "create_governance_rule",
            GovernanceRuleInput {
                rule_data: RuleDataMirror::UsageLimit {
                    max_duration_hours: Some(8.0),
                    max_quantity_per_period: None,
                    period_days: Some(7),
                },
                enforced_by: None,
                ndo_identity_hash: ndo,
                // Matches create_ndo_at_stage: Commons / Physical.
                property_regime: "Commons".to_string(),
                resource_nature: "Physical".to_string(),
                rivalry_override: None,
                specification_hash: None,
            },
        )
        .await;
}
