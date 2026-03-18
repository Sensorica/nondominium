//! Typed wrapper functions for all zome calls.
//!
//! Each wrapper eliminates boilerplate by encoding the zome name, function name,
//! and payload/return types so test files can call, e.g.,
//! `create_person(&conductors[0], &cell, input).await` instead of repeating
//! `conductor.call(cell.zome("zome_person"), "create_person", input).await`.
//!
//! Naming follows the actual `#[hdk_extern]` function names in the coordinator crates.

use holochain::prelude::*;
use holochain::sweettest::*;
use std::time::Duration;

use super::fixtures::*;
use super::mirrors::*;

// ── Person zome ──────────────────────────────────────────────

pub async fn create_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: PersonInput,
) -> Record {
    conductor
        .call(&cell.zome("zome_person"), "create_person", input)
        .await
}

pub async fn get_my_person_profile(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> PersonProfileOutput {
    conductor
        .call(&cell.zome("zome_person"), "get_my_person_profile", ())
        .await
}

pub async fn get_person_profile(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
) -> PersonProfileOutput {
    conductor
        .call(&cell.zome("zome_person"), "get_person_profile", agent)
        .await
}

pub async fn get_latest_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    hash: ActionHash,
) -> PersonMirror {
    conductor
        .call(&cell.zome("zome_person"), "get_latest_person", hash)
        .await
}

pub async fn get_all_persons(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> GetAllPersonsOutput {
    conductor
        .call(&cell.zome("zome_person"), "get_all_persons", ())
        .await
}

pub async fn store_private_person_data(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: PrivatePersonDataInput,
) -> Record {
    conductor
        .call(
            &cell.zome("zome_person"),
            "store_private_person_data",
            input,
        )
        .await
}

pub async fn get_my_private_person_data(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> Option<PrivatePersonDataMirror> {
    conductor
        .call(
            &cell.zome("zome_person"),
            "get_my_private_person_data",
            (),
        )
        .await
}

// ── Person roles ─────────────────────────────────────────────

pub async fn assign_person_role(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: PersonRoleInput,
) -> Record {
    conductor
        .call(&cell.zome("zome_person"), "assign_person_role", input)
        .await
}

pub async fn get_person_roles(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
) -> GetPersonRolesOutput {
    conductor
        .call(&cell.zome("zome_person"), "get_person_roles", agent)
        .await
}

pub async fn get_my_person_roles(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> GetPersonRolesOutput {
    conductor
        .call(&cell.zome("zome_person"), "get_my_person_roles", ())
        .await
}

pub async fn has_person_role_capability(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
    role: &str,
) -> bool {
    conductor
        .call(
            &cell.zome("zome_person"),
            "has_person_role_capability",
            (agent, role.to_string()),
        )
        .await
}

pub async fn get_person_capability_level(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
) -> String {
    conductor
        .call(
            &cell.zome("zome_person"),
            "get_person_capability_level",
            agent,
        )
        .await
}

// ── Person multi-device ──────────────────────────────────────

pub async fn add_agent_to_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    new_agent: AgentPubKey,
    person_hash: ActionHash,
) -> bool {
    conductor
        .call(
            &cell.zome("zome_person"),
            "add_agent_to_person",
            (new_agent, person_hash),
        )
        .await
}

pub async fn remove_agent_from_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
    person_hash: ActionHash,
) -> bool {
    conductor
        .call(
            &cell.zome("zome_person"),
            "remove_agent_from_person",
            (agent, person_hash),
        )
        .await
}

pub async fn is_agent_associated_with_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
    person_hash: ActionHash,
) -> bool {
    conductor
        .call(
            &cell.zome("zome_person"),
            "is_agent_associated_with_person",
            (agent, person_hash),
        )
        .await
}

pub async fn get_agent_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    agent: AgentPubKey,
) -> Option<ActionHash> {
    conductor
        .call(&cell.zome("zome_person"), "get_agent_person", agent)
        .await
}

pub async fn get_person_agents(
    conductor: &SweetConductor,
    cell: &SweetCell,
    person_hash: ActionHash,
) -> Vec<AgentPubKey> {
    conductor
        .call(
            &cell.zome("zome_person"),
            "get_person_agents",
            person_hash,
        )
        .await
}

// ── Device management ────────────────────────────────────────

pub async fn register_device_for_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: DeviceInput,
) -> Record {
    conductor
        .call(
            &cell.zome("zome_person"),
            "register_device_for_person",
            input,
        )
        .await
}

pub async fn get_my_devices(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> Vec<DeviceMirror> {
    conductor
        .call(&cell.zome("zome_person"), "get_my_devices", ())
        .await
}

pub async fn get_devices_for_person(
    conductor: &SweetConductor,
    cell: &SweetCell,
    person_hash: ActionHash,
) -> Vec<DeviceMirror> {
    conductor
        .call(
            &cell.zome("zome_person"),
            "get_devices_for_person",
            person_hash,
        )
        .await
}

pub async fn get_device_info(
    conductor: &SweetConductor,
    cell: &SweetCell,
    device_id: String,
) -> Option<DeviceMirror> {
    conductor
        .call(&cell.zome("zome_person"), "get_device_info", device_id)
        .await
}

pub async fn update_device_activity(
    conductor: &SweetConductor,
    cell: &SweetCell,
    device_id: String,
) -> bool {
    conductor
        .call(
            &cell.zome("zome_person"),
            "update_device_activity",
            device_id,
        )
        .await
}

pub async fn deactivate_device(
    conductor: &SweetConductor,
    cell: &SweetCell,
    device_id: String,
) -> bool {
    conductor
        .call(&cell.zome("zome_person"), "deactivate_device", device_id)
        .await
}

// ── Capability-based sharing ─────────────────────────────────

pub async fn grant_private_data_access(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: GrantPrivateDataAccessInput,
) -> GrantPrivateDataAccessOutput {
    conductor
        .call(
            &cell.zome("zome_person"),
            "grant_private_data_access",
            input,
        )
        .await
}

pub async fn create_private_data_cap_claim(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: CreatePrivateDataCapClaimInput,
) -> CreatePrivateDataCapClaimOutput {
    conductor
        .call(
            &cell.zome("zome_person"),
            "create_private_data_cap_claim",
            input,
        )
        .await
}

pub async fn revoke_private_data_access(
    conductor: &SweetConductor,
    cell: &SweetCell,
    grant_hash: ActionHash,
) {
    conductor
        .call::<_, ()>(
            &cell.zome("zome_person"),
            "revoke_private_data_access",
            grant_hash,
        )
        .await
}

// ── Resource zome ────────────────────────────────────────────

pub async fn create_resource_specification(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: ResourceSpecificationInput,
) -> CreateResourceSpecOutput {
    conductor
        .call(
            &cell.zome("zome_resource"),
            "create_resource_specification",
            input,
        )
        .await
}

pub async fn get_all_resource_specifications(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> GetAllResourceSpecsOutput {
    conductor
        .call(
            &cell.zome("zome_resource"),
            "get_all_resource_specifications",
            (),
        )
        .await
}

pub async fn create_economic_resource(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: EconomicResourceInput,
) -> CreateEconomicResourceOutput {
    conductor
        .call(
            &cell.zome("zome_resource"),
            "create_economic_resource",
            input,
        )
        .await
}

pub async fn get_all_economic_resources(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> GetAllEconomicResourcesOutput {
    conductor
        .call(
            &cell.zome("zome_resource"),
            "get_all_economic_resources",
            (),
        )
        .await
}

// ── Governance zome: Commitments ─────────────────────────────

pub async fn propose_commitment(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: ProposeCommitmentInput,
) -> ProposeCommitmentOutput {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "propose_commitment",
            input,
        )
        .await
}

pub async fn get_all_commitments(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> Vec<serde_json::Value> {
    conductor
        .call(&cell.zome("zome_gouvernance"), "get_all_commitments", ())
        .await
}

pub async fn claim_commitment(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: ClaimCommitmentInput,
) -> ClaimCommitmentOutput {
    conductor
        .call(&cell.zome("zome_gouvernance"), "claim_commitment", input)
        .await
}

// ── Governance zome: Economic Events ─────────────────────────

pub async fn log_economic_event(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: LogEconomicEventInput,
) -> LogEconomicEventOutput {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "log_economic_event",
            input,
        )
        .await
}

pub async fn get_all_economic_events(
    conductor: &SweetConductor,
    cell: &SweetCell,
) -> Vec<serde_json::Value> {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "get_all_economic_events",
            (),
        )
        .await
}

// ── Governance zome: PPR ─────────────────────────────────────

pub async fn issue_participation_receipts(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: IssueParticipationReceiptsInput,
) -> IssueParticipationReceiptsOutputMirror {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "issue_participation_receipts",
            input,
        )
        .await
}

pub async fn get_my_participation_claims(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: GetMyParticipationClaimsInput,
) -> GetMyParticipationClaimsOutput {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "get_my_participation_claims",
            input,
        )
        .await
}

pub async fn derive_reputation_summary(
    conductor: &SweetConductor,
    cell: &SweetCell,
    input: DeriveReputationSummaryInput,
) -> DeriveReputationSummaryOutput {
    conductor
        .call(
            &cell.zome("zome_gouvernance"),
            "derive_reputation_summary",
            input,
        )
        .await
}

// ── Utility ──────────────────────────────────────────────────

/// Sleep helper replacing the TS `pause(ms)` / `delay(ms)` utilities.
pub async fn pause_ms(ms: u64) {
    tokio::time::sleep(Duration::from_millis(ms)).await;
}
