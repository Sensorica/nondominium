# Nondominium Documentation

Infrastructure for organization-agnostic, uncapturable, self-governed resources — built on Holochain and ValueFlows.

This page is the hub. Two alternate views of the same corpus:
[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) (annotated guide, with commands and per-area
status) and [SUMMARY.md](SUMMARY.md) (flat linear table of contents).

## Getting Started

- [TELOS](TELOS.md) - Project vision, mission, and philosophy
- [Requirements](requirements/requirements.md) - Full requirements document
- [Implementation Status](IMPLEMENTATION_STATUS.md) - Current development progress

## Architecture

- [Architecture Components](ARCHITECTURE_COMPONENTS.md) - System design and zome interactions
- [NDO v1 Architecture Design](specifications/ndo-v1-architecture-design.md) - NDO three-layer model
- [Zomes Overview](zomes/architecture_overview.md) - Multi-DNA topology and the Person, Resource, Governance core
- [Lobby Zome](zomes/lobby_zome.md) - Lobby DNA: agent presence and the global group registry
- [Group Zome](zomes/group_zome.md) - Group DNA: cloned-cell coordination, membership, soft links, NDO anchors
- [hREA Integration](hREA/README.md) - ValueFlows / hREA integration strategy

## Requirements

- [Agent Ontology](requirements/agent.md) - Agent types, identity, affiliation model
- [Resource Ontology](requirements/resources.md) - Property regimes, lifecycle, governance
- [Governance Ontology](requirements/governance.md) - Embedded governance, PPR system, validation
- [NDO Prima Materia](requirements/ndo_prima_materia.md) - Normative NDO spec (REQ-NDO-*)
- [UI Design](requirements/ui_design.md) - Lobby → Group → NDO navigational hierarchy

## Technical Specifications

- [Technical Specifications](specifications/specifications.md) - Zome entries, functions, cross-zome API
- [Governance Operator Architecture](specifications/governance/governance-operator-architecture.md) - State transition pattern
- [Governance Implementation Guide](specifications/governance/governance-operator-implementation-guide.md) - Implementation with code examples
- [Cross-Zome API](specifications/governance/cross-zome-api.md) - Zome-to-zome call contracts
- [Governance Model](specifications/governance/governance.md) - Legacy governance model and decision processes
- [Private Participation Receipt](specifications/governance/private-participation-receipt.md) - PPR system design
- [PPR Security Implementation](specifications/governance/PPR_Security_Implementation.md) - PPR security model
- [ValueFlows Action Usage](specifications/VfAction_Usage.md) - VF action patterns with governance examples
- [Protocol Bridge Specifications](specifications/protocol-bridge-specifications.md) - Bun bridge for platform integration (Tiki, Odoo)
- [UI Architecture](specifications/ui_architecture.md) - Svelte 5 service and store layer
- [API Reference](API_REFERENCE.md) - Complete zome function reference

## Development

- [Implementation Plan](implementation_plan.md) - Phased delivery roadmap
- [Development Report](development-report.md) - Progress log
- [Testing Infrastructure](Testing_Infrastructure.md) - Sweettest suite guide
- [Test Commands](TEST_COMMANDS.md) - Canonical command reference for every suite
- [E2E Test Suite](../ui/tests/README.md) - Playwright against real conductors
- [UI README](../ui/README.md) - Frontend dev harness and layout

## Applications

- [Artcoin](Applications/artcoin_main_doc.md) - Open-source art economy use case
- [Nondominium × Artcoin](Applications/nondominium_artcoin.md) - Artcoin integration detail
- [Distributed Journalism](Applications/distributed_journalism.md)
- [ERP Holochain Bridge](Applications/erp_holochain_bridge.md)
- [HealthNet](Applications/healthnet.md)
- [User Stories](Applications/user-story/) - Complete user journey scenarios

## Post-MVP

- [Unyt Integration](requirements/post-mvp/unyt-integration.md) - Economic settlement layer
- [Flowsta Integration](requirements/post-mvp/flowsta-integration.md) - Cross-app identity and DID
- [Resource Transport Flow Protocol](requirements/post-mvp/resource-transport-flow-protocol.md)
- [Full post-MVP set](requirements/post-mvp/) - Versioning, many-to-many flows, digital integrity, DSL
