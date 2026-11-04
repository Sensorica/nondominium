# ADR-014: Work contexts live in the group DHT

**Status**: Accepted on 2026-11-03 (decision of Soushi, after the 27 Oct 2026 brainstorm with Tibi). No code yet: work contexts ship in v0.2, not in v0.1.0.
**Scope**: The group layer and the project layer of the Lobby, Group and NDO architecture. Touches the Moss integration contract of `documentation/specifications/lobby-architecture.md` §9 and the deployment requirements REQ-XCUT-01 and REQ-XCUT-02 of `documentation/requirements/lobby-dna.md`.
**Requirements it satisfies**: REQ-GROUP-19 to REQ-GROUP-23 (group model by mode), REQ-WC-01 to REQ-WC-07 (work contexts), REQ-SOV-01 to REQ-SOV-05 and REQ-FED-01, REQ-FED-02 (sovereignty and federation), REQ-REL-01 to REQ-REL-05 (release scope).
**Long-form record**: the 27 Oct brainstorm journal (kept out of the repo). This file is the in-repo record: the decision, the alternative that lost and why, and what follows.

---

## Context

The 27 Oct brainstorm settled the organizational shape Nondominium aims at. Three levels, each sovereign in its own scope: the NDO (what it becomes), the **work context** (which NDOs a group works with and how it contributes and redistributes), and the **federation** (which projects, what strategy, which common policies). The work context is Bob Haugen's *context of work* from the Sensorica NRP: an open space with no contract and no employment. Internally the term is "work context" and the interface displays "project". A work context is not an NDO: Valueflows keeps the agent and the resource apart, and a project is a space of agents, not a resource. Work contexts and groups are many-to-many. The reference case is Catmaster, one work context with its own set of NDOs, worked in by Sensorica, Ludociel and Sainte-Justine.

The open architecture question was where a work context lives. At the time of the brainstorm the Group DNA (`dnas/group/`, one cloned cell per group) and the Lobby DNA (`dnas/lobby/`) already existed, and Moss was about to replace our group invitation and identity in the first release. Two options stood:

1. Work contexts are entries in the group DHT, exclusive to the group.
2. Work contexts get a DNA of their own.

The brainstorm leaned to option 2 and Soushi came to it at the end of the discussion, as the way to reproduce the same architecture in Moss and in standalone: Moss groups would take the place of our groups, so a work context could not live in a group DHT that Moss had replaced.

On 2026-11-03 Soushi reversed that lean: the Group DNA stays in both modes, and work contexts live in the group DHT.

## Decision

**Work contexts are entries of the group cell, in both deployment modes.** There is no work-context DNA and no work-context role in `workdir/happ.yaml`.

Three things follow from it and are part of the decision:

1. **The Group DNA stays in standalone and in Moss.** A Moss build and a standalone build carry the same `group` role (REQ-GROUP-19). What changes between modes is who supplies membership, identity and invitation.
2. **In Moss there is exactly one Nondominium group per Moss group.** It is the group cell of the Nondominium tool instance installed in that Moss group, joined automatically when an agent joins the tool instance, with no invite code (REQ-GROUP-21, REQ-GROUP-22). The Moss group sits above it as the federation layer (REQ-FED-01).
3. **A work context is related to groups many-to-many and to NDOs by reference.** A group holds several work contexts, a work context may be worked in by several groups (REQ-WC-03), and it names NDOs by their clone coordinates, as `NdoAnchor` does (REQ-WC-04, ADR-011).

## Rejected: a dedicated work-context DNA

**What it would have bought.** One DHT per work context, so that the structure is identical in Moss and standalone, with group duties left to Moss and project duties left to Nondominium. It would let an agent connect to several projects as separate networks, and keep the federation layer in Moss intact because no work context would depend on a group cell.

**Why it lost.**

- **Its premise is gone.** The case for it was that Moss replaces our groups, so work contexts needed a home that does not depend on a group. With the Group DNA kept in both modes there is a group cell in Moss too, and it is that home.
- **It would split what a group already collects.** A group DHT already lists the NDOs the group hosts (`NdoAnchor`, ADR-011), so talking to a group gives its NDO list. Work contexts in that same DHT sit next to the NDOs they work with. A separate DNA would put the project layer in a different network from the NDO anchors it refers to.
- **It adds a network per work context.** Each work context would be its own cloned cell that an agent has to provision, join and sync. ADR-010 already applies that cost to every NDO. This is our own reasoning, not a measurement: nobody has benchmarked the cost of an added cell in Moss.
- **Two architectures instead of one.** The decision of 2026-11-03 is that standalone and Moss share one architecture. A dedicated DNA solves a problem that only exists if the two modes differ.

**What we give up.** A work context is not a network of its own, so a work context shared by several groups needs a rule for where its state lives. That rule is open (see Open questions). Federation across several projects is done by the pointer pattern and the many-to-many relation, not by joining one DHT per project.

## The Moss mapping

| Moss concept | Nondominium concept | In standalone |
|---|---|---|
| Moss group | Federation layer, above the Nondominium group (REQ-FED-01) | The Lobby is the only layer above groups |
| Nondominium tool instance in a Moss group | One Nondominium group: the group cell of the tool instance (REQ-GROUP-21) | A group the agent creates and registers in the Lobby (REQ-GROUP-20) |
| An agent joins the tool instance | The agent is in the group cell, no invite code (REQ-GROUP-22) | Invite code (REQ-GROUP-05) |
| Moss profile and membership | The agent's profile and membership, not copied (REQ-GROUP-23) | `LobbyAgentProfile` |
| Network seed given by Moss to each tool instance in each Moss group | The group cell's seed (note on REQ-GROUP-01) | An invite code or random seed |
| (none; Nondominium owns it) | An NDO: a cloned `ndo` cell, anchored in the group cell (ADR-010, ADR-011) | Same |
| (none; Nondominium owns it) | A work context: entries in the group cell, v0.2 (REQ-WC-01) | Same |

The NDO is the bridge between the two modes. An agent in standalone and an agent in Moss reach the same NDO when both derive the same clone cell from the same coordinates and run the same Holochain network protocol (REQ-XCUT-05). On 27 Oct the Moss 0.16 test builds ran a patched Holochain 0.7.1 that partitions their network from a standard one, so the bridge only holds when both sides run the same protocol.

## Consequences

- **Standalone and Moss share one architecture.** The Moss tool replaces the surface around the group cell (invitation, profile, group creation), not the cell.
- **The group cell is the seam for v0.2.** v0.1.0 wires Moss to the group cell and ships no work context. Work contexts are added to that same cell later, so group creation and joining do not change (REQ-REL-04).
- **Adding work-context entry types to the Group DNA changes its DNA hash.** Integrity code is part of the DNA hash, so v0.2 either recreates the groups of the v0.1.0 pilot or v0.1.0 ships the entry types dormant. This is open.
- **The v0.1.0 plan rests on one assumption the Moss spike must check.** Moss has to accept a deferred `group` role with the clone limit in `workdir/happ.yaml`, and give the tool instance's group cell. If it does not, REQ-GROUP-21 and this decision's Moss mapping are reopened.
- **The Moss group is a federation layer with no governance of its own.** Where federation governance lives (REQ-SOV-04) has no home yet.
- **Two existing statements are superseded.** REQ-XCUT-02 used to say the Group DNA is delegated to a Moss equivalent in Moss, and the Moss feature map in `lobby-architecture.md` §9 follows the same assumption. Both now say they are superseded, pointing here.

## Open questions

These are the questions listed on the requirements pull request (#171) and on its board. The pick is Soushi's, and this ADR is amended when each is settled.

- **Where a shared work context's state lives.** With work contexts in one group DHT and shared by several groups, a home group holds it and the other groups hold a pointer (the lean, reusing `NdoAnchor`), or each group holds a copy.
- **Dormant entry types in v0.1.0.** Recreate the pilot groups in v0.2 (the lean, the pilot has two developers), or ship the work-context types dormant.
- **Federation governance in Moss, and a federation layer in standalone.** Both undecided.
- **Whether the Lobby DNA role is present in the Moss build.**
- **Benefit redistribution at the work-context level**, which REQ-GROUP-17 gives to NDO governance.
- **A project's digital twin**, which REQ-AGENT-02 allows and REQ-WC-02 appears to exclude.

## Where this lives in code

| Concern | Location |
|---|---|
| `group` role, provisioned on demand (`deferred: true`, `clone_limit: 64`) | `workdir/happ.yaml` |
| `ndo` role (`deferred: true`, `clone_limit: 512`) | `workdir/happ.yaml` |
| Group cell entries (`GroupProfile`, `GroupMembership`, `WorkLog`, `SoftLink`, `NdoAnchor`) | `dnas/group/zomes/integrity/zome_group_integrity/src/lib.rs` |
| Pointer pattern a work context follows (`NdoAnchor`) | `dnas/group/zomes/coordinator/zome_group/src/ndo_anchor.rs` |
| Moss tool, work-context entries | Not in the repo yet (Moss tool in v0.1.0, work contexts in v0.2) |
