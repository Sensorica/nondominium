# Nondominium Domain Quick Reference

> **Compact enum and category reference for Cursor** (which has no doc-injection hook).
> Source of truth for all items below: `documentation/requirements/` and
> `documentation/specifications/specifications.md`. When adding new variants, update
> `documentation/` first, then this file.

## NDO Three-Layer Activation Rule
Source: `documentation/requirements/ndo_prima_materia.md §4`

- **Layer 0 — NondominiumIdentity**: always present; `action_hash` = stable NDO ID; never deleted
- **Layer 1 — ResourceSpecification**: link `NDOToSpecification` when resource has design to share
- **Layer 2 — Process**: link `NDOToProcess` when multi-agent economic work begins

At EndOfLife, only Layer 0 survives as a permanent tombstone.

## PropertyRegime Enum
Source: `documentation/requirements/ndo_prima_materia.md §3`, `resources.md §4.4.6`

```rust
pub enum PropertyRegime {
    Private,      // Full rights bundle; individual ownership
    Commons,      // Non-rivalrous shared; licensing/attribution governance
    Collective,   // Cooperative/collective ownership
    Pool,         // Rivalrous shared resources; custody/scheduling/maintenance
    CommonPool,   // Rivalrous consumable; quota/depletion rules
    Nondominium,  // Uncapturable by design; no alienation permitted
}
```

## ResourceNature Enum
Source: `documentation/requirements/ndo_prima_materia.md §3`

```rust
pub enum ResourceNature {
    Physical,     // Material objects, equipment
    Digital,      // Software, data, design files, documents
    Service,      // Software services, knowledge assets
    Hybrid,       // Digital twin of a physical resource
    Information,  // Knowledge assets, data sets
    // Post-MVP: Space, Method, Currency
}
```

## VfAction Enum (16 actions)
Source: `documentation/specifications/specifications.md §3.3.1`

Standard ValueFlows: `Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`,
`Combine`, `Separate`, `Raise`, `Lower`, `Cite`, `Accept`

NDO extensions:
- `InitialTransfer` — first transaction by Simple Agent; triggers role promotion
- `AccessForUse` — access request; triggers governance evaluation
- `TransferCustody` — custody transfer preserving nondominium property regime

## PPR: 16 ParticipationClaimType Categories
Source: `documentation/requirements/requirements.md §7.2`, `specifications.md §3.3.7`

**Genesis** — `ResourceCreation`, `ResourceValidation`
**Custody** — `CustodyTransfer`, `CustodyAcceptance`
**Services** — `MaintenanceCommitmentAccepted`, `MaintenanceFulfillmentCompleted`,
  `StorageCommitmentAccepted`, `StorageFulfillmentCompleted`,
  `TransportCommitmentAccepted`, `TransportFulfillmentCompleted`, `GoodFaithTransfer`
**Governance** — `DisputeResolutionParticipation`, `ValidationActivity`, `RuleCompliance`
**End-of-Life** — `EndOfLifeDeclaration`, `EndOfLifeValidation`

PPRs are **private entries** — never linked in DHT, bilateral-signed, user-sovereign.
Do not design anything that aggregates them globally or enables third-party visibility.

## ValueFlows Ontology Layers in Use
Source: `documentation/specifications/specifications.md §3`

| VF Layer | Purpose | Nondominium entry |
|---|---|---|
| Knowledge | Type/template | `ResourceSpecification` |
| Plan | Intent | `Commitment` |
| Observation | What happened | `EconomicEvent`, `Claim` |

## Capability Slots (Planned, not MVP)
Source: `documentation/requirements/ndo_prima_materia.md §6`

Typed DHT links from Layer 0 `action_hash` to external capability entries. Enables
stigmergic governance: external tools attach to NDOs without modifying core entries.

```rust
pub enum SlotType {
    GovernanceDAO, DisputeResolution, FabricationQueue,
    UnytAgreement,   // post-MVP: Unyt Smart Agreement
    FlowstaIdentity, // post-MVP: W3C DID via Flowsta Vault (also on Person hash)
    Custom(String),
}
```

## RoleType Enum
Source: `documentation/specifications/specifications.md §4.1.3`

Governance tiers: `SimpleAgent`, `AccountableAgent`, `PrimaryAccountableAgent`
Functional service: `Transport`, `Repair`, `Storage`
Capability hierarchy: `member < stewardship < coordination < governance`
