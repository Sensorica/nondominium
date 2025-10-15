<!--
Sync Impact Report:
Version change: 0.1.0 → 1.0.0
Modified principles: N/A (initial constitution creation)
Added sections: All sections (initial constitution)
Removed sections: N/A
Templates updated: ✅ plan-template.md, ✅ spec-template.md, ✅ tasks-template.md
Follow-up TODOs: None
-->

# nondominium Constitution

## Core Principles

### I. ValueFlows Compliance

All data structures and economic interactions MUST adhere to the ValueFlows REA (Resource, Event, Agent) ontology. Economic Resources, Economic Events, and Economic Processes MUST follow ValueFlows standards with proper linking and validation. This ensures interoperability and semantic clarity across the sharing economy ecosystem.

### II. Agent-Centric Architecture

All data MUST be created and validated from the perspective of individual agents with clear separation between public and private information. Every entry MUST be tied to agent identity with proper capability-based access controls. Private data MUST be stored as Holochain private entries with selective disclosure mechanisms.

### III. Progressive Trust & Capability-Based Security

The system MUST implement a progressive trust model through three agent levels: Simple Agent (general capability), Accountable Agent (restricted capability), and Primary Accountable Agent (full capability). Role-based access control MUST be enforced for specialized Economic Processes (Transport, Repair, Storage) with validation by existing role holders.

### IV. Governance by Design

Every Economic Resource MUST contain embedded governance rules that are machine-readable and programmatically enforced. All validation workflows MUST be transparent, peer-to-peer, and capture-resistant. Resource validation MUST require peer review during first access events with configurable validation schemes (2-of-3, majority, consensus).

### V. Privacy-Preserving Reputation

Private Participation Receipts (PPRs) MUST be automatically generated for all economic interactions as cryptographically-signed private entries. Every interaction MUST generate bi-directional receipts with performance metrics. Reputation summaries MUST be derivable from PPRs while preserving privacy through selective disclosure.

## Development Standards

### Testing Excellence

A 4-layer testing strategy MUST be followed: Foundation (basic zome connectivity), Integration (cross-zome interactions), Scenarios (complete user journeys), and Performance (load testing). All tests MUST pass before deployment with minimum 80% unit test coverage and comprehensive integration coverage.

### Holochain Best Practices

All zome functions MUST be protected by appropriate capability tokens. Cross-zome calls MUST maintain transactional integrity. Entry validation MUST be implemented in integrity zomes with comprehensive business logic. Link management MUST properly connect related entries across zomes with appropriate tags.

### Resource Lifecycle Management

All Economic Resources MUST follow proper lifecycle states: creation → pending validation → validated → active → end-of-life → decommissioned. Resource state transitions MUST be validated according to process types. End-of-life declarations MUST require multiple validators with challenge periods.

## Governance

### Constitution Supremacy

This constitution supersedes all other development practices and guidelines. All feature specifications, implementation plans, and code changes MUST verify compliance with these principles. Non-compliance MUST be addressed before merge.

### Amendment Process

Constitution amendments require: (1) Documentation of proposed changes with rationale, (2) Community review period of minimum 7 days, (3) Approval by majority of Primary Accountable Agents, (4) Version increment according to semantic versioning, (5) Migration plan for existing code and documentation.

### Compliance Validation

All pull requests MUST include constitution compliance verification. Implementation plans MUST pass constitution checks before Phase 1 research. Complexity violations MUST be justified with explicit rationale. Templates and guidance documents MUST align with constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-14 | **Last Amended**: 2025-10-14
