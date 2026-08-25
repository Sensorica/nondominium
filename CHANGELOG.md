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

### Added

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
