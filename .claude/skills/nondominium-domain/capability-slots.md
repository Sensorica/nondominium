# NDO Capability Slots (Surface of Attachment)

Source: `documentation/requirements/ndo_prima_materia.md §6`

## Concept: Stigmergic Attachment

Capability slots implement **stigmergic governance**: unforeseen external tools can attach
to NDO resources without modifying the core NDO entry structure. The NDO acts as a
signal in the environment; external agents respond to it by attaching capabilities.

This is the "surface of attachment" pattern — the NDO's `action_hash` (Layer 0 identity)
becomes the attachment point for typed DHT links pointing to external capability entries.

## Why Capability Slots Matter

Without capability slots, every new governance tool (a voting system, a dispute resolver,
a fabrication queue) would require modifying the core NDO entry type. With capability slots:
- External hApps can attach to any NDO without coordination
- The NDO system never needs to anticipate specific governance tools
- The system's actual capability space is richer than its source code describes
- Follows Benkler's P2P information advantage: richer coordination than any central authority
  could design

## Slot Structure (Planned, not yet implemented in MVP)

```rust
// A CapabilitySlot is a typed link from Layer 0 NDO identity hash
// to an external capability entry
pub enum SlotType {
    GovernanceDAO,         // Voting/decision-making tool attachment
    DisputeResolution,     // Dispute resolution hApp attachment
    FabricationQueue,      // Fabrication job queue attachment
    IssueTracker,          // Issue/task tracker attachment
    UnytAgreement,         // Unyt Smart Agreement attachment (post-MVP)
    FlowstaIdentity,       // Flowsta cross-app identity attachment (post-MVP)
    Custom(String),        // Community-defined slot types
}

pub struct CapabilitySlotInfo {
    pub slot_type: SlotType,
    pub target_hash: ActionHash,    // Entry hash in the attaching system
    pub attacher: AgentPubKey,
    pub attached_at: Timestamp,
    pub metadata: Option<String>,   // JSON metadata for the attachment
}
```

## Attachment Pattern

```
Layer 0 NondominiumIdentity (action_hash)
  ├── NDOToSpecification → ResourceSpecification (Layer 1)
  ├── NDOToProcess → Process (Layer 2)
  ├── CapabilitySlot:GovernanceDAO → [external governance entry]
  ├── CapabilitySlot:UnytAgreement → [Unyt Smart Agreement entry]
  └── CapabilitySlot:FabricationQueue → [fabrication queue entry]
```

External agents create `CapabilitySlot` links; the NDO itself does not need to know they exist.
This is the DHT as a stigmergic medium.

## Person-Level Capability Slots

The same pattern applies to agent identity: the `Person` entry hash serves as an attachment
surface for external credential wallets, DID documents, and reputation oracles.

Planned for `Person` entry hash:
- `FlowstaIdentity` slot → `IsSamePersonEntry` (W3C DID via Flowsta Vault, post-MVP)
- Cross-app attribution of `ReputationSummary` without making PPRs transferable

## Current MVP Implementation Status

Capability slots are **not yet implemented** in the MVP codebase. The architecture is
specified in `ndo_prima_materia.md §6`. When implementing:

1. Define `SlotType` enum in `zome_resource` integrity
2. Add `CapabilitySlot` link type
3. Add `attach_capability_slot(ndo_hash, slot_type, target_hash)` coordinator function
4. Add `get_capability_slots(ndo_hash)` discovery function
5. Governance zome: read slots in `evaluate_state_transition` to check for required slots

## Integration Points (Post-MVP)

- **Unyt** (economic settlement): `UnytAgreement` slot + `EconomicAgreement` GovernanceRule
- **Flowsta** (cross-app identity): `FlowstaIdentity` slot on `Person` hash + `IsSamePersonEntry`
- Both follow the same pattern: permissionless Tier 1 attachment + optional enforced Tier 2 governance

See `documentation/requirements/post-mvp/unyt-integration.md` and
`documentation/requirements/post-mvp/flowsta-integration.md` for full specs.
