# Changelog

All notable changes to nondominium are recorded here. This file starts at 0.1.0: no
release was tagged before it.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the
major version is 0, breaking changes may land in a minor release.

## 0.1.0 — unreleased

First release. Internal Sensorica pilot with a limited demo cohort, not a public launch.
The tag is not cut yet; this section is seeded ahead of it so the scope is agreed before
the merge to `main` rather than reconstructed after.

The release is the **peer mesh**: two agents on different machines share a Group and an
NDO over a live DHT.

### Changed

- **Holochain 0.7.1** (HDK =0.7.1, HDI =0.8.1, `@holochain/client` ^0.21.1) with the hREA DNA pinned to upstream `happ-0.5.0-beta.1`. Every 0.7 network is a new network: DNA hashes change, and 0.6 data does not carry over.

### Added

- **Moss tool scaffold.** Nondominium runs as a Moss tool in `weave` dev mode: a dev config
  with two agents and one group (`bun run tool-dev`), `@theweave/api` in the UI, and a
  connection mode that takes the conductor client from Moss. The standalone build is
  unchanged. See `documentation/specifications/moss-integration.md`.
- **Moss group context.** Inside Moss the Moss group is the group: the tool instance's `group` cell is the one Nondominium group, joined automatically with no invite code, the profile comes from Moss, the role from the Moss accountabilities, and NDO clones are created through the `WeaveClient`. Standalone keeps the Lobby, the Group DNA and invite links.
- **NDOs as Moss assets.** Each NDO has a Weave Asset Locator, `getAssetInfo` and `search` answer for it, an NDO linked from another tool opens in Nondominium, and the NDO view can add it to the Moss pocket.
- **ValueFlows `Measure`.** Quantities on commitments, economic events and economic resources are a `Measure` (`numerical_value`, `has_unit`) instead of a loose `f64` plus unit string, validated the same way everywhere. This changes the entry shapes, so it is a new network like every 0.7 network.
- **Commitments per NDO.** An `NdoToCommitments` index with `get_commitments_for_ndo`, plus hash-paired reads (`get_commitments_for_ndo_detailed`, `get_all_commitments_detailed`) returning each `Commitment` with its `ActionHash`, so a UI can act on one.
- **Atomic commitment fulfillment.** `fulfill_commitment_closure` records the fulfilling event, the claim and both parties' participation receipts in one call, with the counterparty countersigning over `call_remote`; `Claim.fulfilled_by` now points at the right event (#14).
- **Layer 1 foreshadow fields.** `ResourceSpecification` takes optional inventory intent, identification pattern, default unit, substitutability and digital locator fields, validated in `validate_spec_foreshadow`.
- **Lobby DNA** as the entry point. Groups are announced here for discovery, and NDOs are
  browsed and filtered across every group the agent belongs to.
- **Group DNA, one cloned cell per group.** Each group is its own DHT with its own
  membership, provisioned through `clone_cell` with a unique network seed. Groups are
  joined by invite link, and membership self-heals when a join races DHT gossip.
- **NDO Layer 0 on per-NDO cells** (ADR-010 model A, ADR-013 binding). Each NDO is its own
  cloned cell whose `DnaHash` is cryptographically bound to its immutable classification
  through DNA properties. A group points at an NDO through an `NdoAnchor` carrying the
  full clone coordinates, so any member can re-derive, verify and join the cell from the
  anchor alone, without joining every NDO to browse.
- **NDO identity and lifecycle**: `NondominiumIdentity` as a permanent identity anchor,
  ten `LifecycleStage` values with an integrity-validated transition machine, and
  discovery anchors by stage, nature and property regime.
- **NDO membership**: join an NDO cell, list its members, check membership.
- **Three-level identity**: a Lobby profile that never touches the DHT, a per-group
  disclosure choice, and a `Person` entry created only on the first DHT-active action.
- **Browser-based multi-agent development harness**: one Vite dev server per agent on
  consecutive ports, so each agent gets an isolated origin.

### Network identity

Holochain 0.7.1 changes every DNA hash, so this release joins a new network and cannot see any 0.6 data. The DNA hashes for the release build are listed in [documentation/IMPLEMENTATION_STATUS.md](documentation/IMPLEMENTATION_STATUS.md#dna-hashes-holochain-071-build), with the `hc dna hash` commands that reproduce them. The values there are those of the commit that wrote them; replace them with the hashes of the tagged build when the release is cut.

### Deliberately not in this release

Named here because a pilot cohort will otherwise assume the architecture documents describe
what ships. These are designed and documented, not implemented or not wired:

- **Governance as operator.** Lifecycle transitions are validated in the integrity zome
  only, and are authorised by initiator check rather than by role. No `evaluate_transition`
  function exists in any zome, and no `EconomicEvent` is generated automatically on a
  transition.
- **Private Participation Receipts.** The entry types, the sixteen claim categories and the
  `issue_participation_receipts` zome function all exist and are callable directly. What
  does not exist is the wiring: no custody transfer, validation or process flow issues a
  receipt on its own, and nothing in the UI calls any PPR function. Reputation in this
  release is inert.
- **Economic processes.** Use, Transport, Storage and Repair are specified and not built.
- **Role promotion.** The Simple to Accountable to Primary Accountable progression is not
  wired to any pilot flow.
- **Capability-based private data sharing.** Field-level grants exist in the person zome
  and no UI drives them.
- **hREA beyond the bridge.** The hREA DNA ships in the bundle; phase 2 and later
  integration is not done.
- **NDO Layers 1 and 2.** `NDOToSpecification` and `NDOToProcess` do not link Layer 0 to
  anything yet.
- **Holochain 0.7.** This release targets Holochain 0.6.0. The 0.7 upgrade waits on hREA
  moving first, since nondominium vendors it.
