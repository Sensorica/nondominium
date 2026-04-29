---
name: nondominium-domain
description: >
  Nondominium-specific architecture knowledge: NDO three-layer model
  (Prima Materia/Identity, Specified/ResourceSpec, Custodial/Process),
  Private Participation Receipt (PPR) system with 16 categories, capability
  slots as stigmergic attachment surface, ValueFlows alignment patterns for
  Nondominium's specific EconomicEvent/Commitment usage. USE WHEN working on
  resource zome, governance zome, lifecycle transitions, PPR issuance, NDO
  layer activation, capability slots, or any task touching the NDO architecture
  (ndo_prima_materia.md).
license: AGPL-3.0
metadata:
  author: soushi888
  version: "0.1.0"
---

# Nondominium Domain Skill

Use this skill when working on Nondominium-specific architecture decisions.
For general Holochain HDK patterns, use the `holochain-agent-skill` instead.
These two skills complement each other.

## Context Files

| File | Load When |
|---|---|
| `ndo-three-layer-model.md` | Working on resource/governance zome, lifecycle transitions, NDO creation |
| `ppr-system.md` | Working on PPR issuance, reputation derivation, participation claims |
| `capability-slots.md` | Working on external integrations, CapabilitySlot patterns, stigmergic attachment |
| `valueflows-alignment.md` | Working on EconomicEvent, Commitment, VfAction, hREA integration |

## Quick Reference

### Three-Layer Activation Rule
- Layer 0: always present (identity anchor, never deleted)
- Layer 1: link `NDOToSpecification` when resource has design to share
- Layer 2: link `NDOToProcess` when multi-agent work begins

### PPR Categories (all 16)
Genesis: `ResourceCreation`, `ResourceValidation`
Custody: `CustodyTransfer`, `CustodyAcceptance`
Services: `MaintenanceCommitmentAccepted`, `MaintenanceFulfillmentCompleted`,
  `StorageCommitmentAccepted`, `StorageFulfillmentCompleted`,
  `TransportCommitmentAccepted`, `TransportFulfillmentCompleted`, `GoodFaithTransfer`
Governance: `DisputeResolutionParticipation`, `ValidationActivity`, `RuleCompliance`
End-of-Life: `EndOfLifeDeclaration`, `EndOfLifeValidation`

### ValueFlows Actions (16 total)
Standard VF: `Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`,
  `Combine`, `Separate`, `Raise`, `Lower`, `Cite`, `Accept`
NDO extensions: `InitialTransfer`, `AccessForUse`, `TransferCustody`

### PropertyRegime Enum
`Private`, `Commons`, `Collective`, `Pool`, `CommonPool`, `Nondominium`

### ResourceNature Enum
`Digital`, `Physical`, `Hybrid` (Space, Method, Currency are post-MVP)

## When NOT to Use This Skill
- General Holochain HDK questions → `holochain-agent-skill`
- Svelte 5 / UnoCSS / Effect-TS patterns → AGENTS.md + `holochain-agent-skill/TypeScript.md`
- Nix dev environment → `holochain-agent-skill/Architecture.md`
- hREA integration patterns → `holochain-agent-skill` + `documentation/hREA/`
