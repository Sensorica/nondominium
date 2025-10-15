# nondominium - Governance Requirements

## Overview
This document contains the governance and validation requirements for the nondominium system, extracted from the main product requirements document.

## Resource Lifecycle Management

### First Resource Requirement
**REQ-GOV-01**: Simple Agents must create at least one Resource before accessing others

### Resource Validation
**REQ-GOV-02**: New Resources must be validated by Accountable Agents through peer review during first access

### Agent Validation
**REQ-GOV-03**: Simple Agents must be validated by Accountable Agents during their first transaction to become Accountable Agents

### Specialized Role Validation
**REQ-GOV-04**: Transport, Repair, and Storage roles require validation by existing role holders

## Validation Schemes

### Role-Gated Validation
**REQ-GOV-05**: Certain validations are restricted to Agents with specific roles

### Multi-Reviewer Validation
**REQ-GOV-06**: Support configurable validation schemes (2-of-3, N-of-M reviewers)

### Process Validation
**REQ-GOV-07**: Economic Process completions must be validated according to process-specific criteria

## Governance Rules

### Embedded Rules
**REQ-GOV-08**: ResourceSpecifications must contain embedded governance rules for access and process management

### Rule Enforcement
**REQ-GOV-09**: Governance rules must be enforced programmatically across all interactions

### Rule Transparency
**REQ-GOV-10**: All governance rules must be publicly visible and machine-readable

## End-of-Life Management

### End-of-Life Declaration
**REQ-GOV-11**: Resources reaching end-of-life must go through formal decommissioning process

### End-of-Life Validation
**REQ-GOV-12**: Multiple validators required for end-of-life declarations to prevent abuse

### Challenge Period
**REQ-GOV-13**: Time-delayed finalization with challenge period for end-of-life declarations

## Private Participation Receipt (PPR) Requirements

### Receipt Generation

**REQ-PPR-01**: Bi-directional Issuance - Every economic interaction generates exactly 2 receipts between participating Agents

**REQ-PPR-02**: Automatic Generation - PPRs are automatically issued for all Commitment-Claim-Event cycles

**REQ-PPR-03**: Cryptographic Integrity - All receipts are cryptographically signed for authenticity

**REQ-PPR-04**: Performance Tracking - PPRs include quantitative performance metrics (timeliness, quality, reliability, communication)

### Receipt Categories

**REQ-PPR-05**: Resource Creation - Receipts for Resource creation and validation activities

**REQ-PPR-06**: Custody Transfer - Receipts for responsible custody transfers and acceptances

**REQ-PPR-07**: Service Processes - Receipts for service commitments and fulfillments (Transport, Repair, Storage)

**REQ-PPR-08**: Governance Participation - Receipts for validation activities and governance compliance

**REQ-PPR-09**: End-of-Life - Enhanced receipt requirements for end-of-life declarations and validations

### Privacy & Security

**REQ-PPR-10**: Private Storage - PPRs stored as Holochain private entries accessible only to owning Agent

**REQ-PPR-11**: Reputation Derivation - Agents can derive and selectively share reputation summaries from their PPRs

**REQ-PPR-12**: Signature Validation - System must validate cryptographic signatures of participation claims

## Security & Access Control

### Capability-Based Security

**REQ-SEC-01**: Capability Tokens - Use capability tokens to manage access rights (general for Simple Agents, restricted for Accountable Agents)

**REQ-SEC-02**: Role-Based Access - Economic Processes enforce role-based access control with validated credentials

**REQ-SEC-03**: Cross-Zome Validation - Maintain transactional integrity across zome boundaries

### Privacy Architecture

**REQ-SEC-04**: Private Identity - Personal identification information stored as Holochain private entries

**REQ-SEC-05**: Private Receipts - Participation receipts stored privately while enabling reputation derivation

**REQ-SEC-06**: Selective Disclosure - Agents control what private information to share and with whom

### Network Security

**REQ-SEC-07**: Membrane Validation - DNA membrane controls network entry (permissionless for PoC with validation hooks)

**REQ-SEC-08**: Dispute Resolution - Edge-based dispute resolution involving recent interaction partners

**REQ-SEC-09**: Reputation Protection - False claims and end-of-life abuse severely impact Agent reputation