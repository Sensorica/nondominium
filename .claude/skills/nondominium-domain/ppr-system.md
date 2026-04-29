# Private Participation Receipt (PPR) System

Source: `documentation/requirements/requirements.md §7`, `documentation/specifications/specifications.md §3.3.6`

## Sovereignty Model

PPRs are **user-sovereign**. They are:
- Stored as Holochain private entries on the agent's own source chain
- Never linked in DHT (no discovery by others)
- Accessible to others only via explicit capability grant
- Cryptographically signed by BOTH parties (bilateral, mutual accountability)
- Non-transferable: cryptographically bound to the creating agent's key pair

**Do not design anything that aggregates PPRs globally, stores them publicly, or enables
third-party visibility without capability grant.**

## `PrivateParticipationClaim` Structure

```rust
pub struct PrivateParticipationClaim {
    pub fulfills: ActionHash,                         // References the Commitment
    pub fulfilled_by: ActionHash,                     // References the EconomicEvent
    pub claimed_at: Timestamp,
    pub claim_type: ParticipationClaimType,           // One of 16 categories
    pub performance_metrics: PerformanceMetrics,
    pub bilateral_signature: CryptographicSignature,  // Both parties sign
    pub counterparty: AgentPubKey,
    pub resource_hash: Option<ActionHash>,
    pub notes: Option<String>,
}
```

## The 16 ParticipationClaimType Categories

**Genesis (network entry, contribution tracking):**
- `ResourceCreation` — creating a resource and getting it validated
- `ResourceValidation` — performing validation duties

**Core Custody (custody chain accountability):**
- `CustodyTransfer` — transferring resource custody responsibly
- `CustodyAcceptance` — accepting resource custody responsibly

**Services (service economy accountability):**
- `MaintenanceCommitmentAccepted`
- `MaintenanceFulfillmentCompleted`
- `StorageCommitmentAccepted`
- `StorageFulfillmentCompleted`
- `TransportCommitmentAccepted`
- `TransportFulfillmentCompleted`
- `GoodFaithTransfer` — transferring for service with trust

**Governance (participation tracking):**
- `DisputeResolutionParticipation`
- `ValidationActivity`
- `RuleCompliance`

**End-of-Life (lifecycle management):**
- `EndOfLifeDeclaration`
- `EndOfLifeValidation`

## PerformanceMetrics

```rust
pub struct PerformanceMetrics {
    pub timeliness: f64,           // 0.0–1.0, weight 0.25
    pub quality: f64,              // 0.0–1.0, weight 0.30
    pub reliability: f64,          // 0.0–1.0, weight 0.25
    pub communication: f64,        // 0.0–1.0, weight 0.20
    pub overall_satisfaction: f64, // 0.0–1.0, overall counterparty satisfaction
    pub notes: Option<String>,
}
```

## Issuance Rules

1. Every completed Commitment/EconomicEvent/Claim cycle triggers PPR issuance
2. Both parties receive a PPR (bi-directional)
3. Both must sign (`bilateral_signature`)
4. Issuance function: `issue_participation_receipts(commitment_hash, event_hash, counterparty, metrics)`
5. Signing function: `sign_participation_claim(claim_hash, signature)`

## ReputationSummary (Derived, Not Stored)

```rust
pub struct ReputationSummary {
    pub agent: AgentPubKey,
    pub total_interactions: u32,
    pub average_timeliness: f64,
    pub average_quality: f64,
    pub average_reliability: f64,
    pub average_communication: f64,
    pub completion_rate: f64,
    pub role_performance: HashMap<String, RolePerformance>,
    pub recent_activity: Vec<RecentInteraction>,  // last 30 days
    pub calculated_at: Timestamp,
}
```

The agent derives this from their own PPRs and **selectively shares** it. No global
aggregation. The agent controls what they reveal.

## CryptographicSignature

```rust
pub struct CryptographicSignature {
    pub signer: AgentPubKey,
    pub signature: Signature,
    pub signed_data_hash: ActionHash,
    pub signature_algorithm: String,  // "Ed25519"
    pub created_at: Timestamp,
}
```

## Implementation Status (as of 2026-04)

- ✅ Data structures (16 categories, PerformanceMetrics, CryptographicSignature)
- ✅ Cryptographic signature validation
- ❌ PPR issuance workflows (not yet implemented)
- ❌ Receipt generation triggered by EconomicEvents
- ❌ EndOfLife PPR management

When implementing PPR workflows, read `documentation/requirements/requirements.md §7`
in full before writing any code.

## Capability Grant Constraints
- Private data grants: field-level, max 30 days (`expires_at`)
- `PrivateDataCapabilityMetadata` tracks each grant
- `RevokedGrantMarker` provides auditable revocation trail (Holochain native revocation is silent)
