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
  version: "0.2.0"
---

# Nondominium Domain Skill

> **Routing-only skill for Claude Code.** Full documentation is injected at session start
> via `LoadProjectDocs.hook.ts`. Use the table below to navigate to the right section.
> For Cursor (no hook), equivalent compact reference lives in `pai/cursor-rules/10-domain-enums.md`.

## Documentation Sources

| Topic | Source |
|---|---|
| Project vision, mission, AI principles | `documentation/TELOS.md` |
| Requirements (REQ-* IDs), user roles, PPR reqs | `documentation/requirements/requirements.md` |
| NDO three-layer model, lifecycle state machine, capability slots | `documentation/requirements/ndo_prima_materia.md` |
| Agent ontology, roles, affiliation spectrum | `documentation/requirements/agent.md` |
| Resource ontology, property regimes, rivalry | `documentation/requirements/resources.md` |
| Governance model, governance-as-operator, PPR governance | `documentation/requirements/governance.md` |
| Entry types, zome functions, cross-zome interface, UI specs | `documentation/specifications/specifications.md` |
| Implementation status | `documentation/IMPLEMENTATION_STATUS.md` |
| Architecture components | `documentation/ARCHITECTURE_COMPONENTS.md` |
| Post-MVP: Unyt | `documentation/requirements/post-mvp/unyt-integration.md` |
| Post-MVP: Flowsta | `documentation/requirements/post-mvp/flowsta-integration.md` |

## Navigation by Task

| Task | Read first |
|---|---|
| NDO creation, lifecycle transitions | `ndo_prima_materia.md §4–§5` |
| PPR issuance, reputation derivation | `requirements.md §7`, `specifications.md §3.3.6` |
| Governance-as-operator, state transitions | `specifications.md §3`, `governance.md §2.1` |
| Capability slots, stigmergic attachment | `ndo_prima_materia.md §6` |
| VfAction, Commitment/Event/Claim cycle | `specifications.md §3.3.1–§3.3.3` |
| hREA integration | `documentation/hREA/`, `specifications.md §7.2` |
| Agent roles, promotion workflow | `agent.md §2.3`, `specifications.md §4.1` |
| Property regimes, resource nature | `resources.md §4.4`, `ndo_prima_materia.md §3` |
| PR review checklist | `REVIEW.md` |

## When NOT to Use This Skill
- General Holochain HDK questions → `holochain-agent-skill`
- Svelte 5 / UnoCSS / Effect-TS patterns → `AGENTS.md` + `pai/cursor-rules/40-svelte-ui.md`
- Nix dev environment → `holochain-agent-skill`
- hREA integration → `holochain-agent-skill` + `documentation/hREA/`
