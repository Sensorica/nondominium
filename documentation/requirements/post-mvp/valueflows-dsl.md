# ValueFlows DSL

## Requirements Document for Nondominium

|                  |                                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| **Project**      | Nondominium — Valueflows-compliant Resource Sharing Holochain Application    |
| **Organization** | Sensorica Open Value Network                                                 |
| **Authors**      | Sacha Pignot (Soushi888), Tibi                                               |
| **Status**       | Draft — For Community Review                                                 |
| **Version**      | 1.0 (2025-12-28)                                                             |
| **Repository**   | [github.com/sensorica/nondominium](https://github.com/sensorica/nondominium) |

> **Technical Specifications**: See [Valueflows DSL Technical Specifications](../specifications/valueflows-dsl-specs.md) for implementation details, syntax specifications, and technical architecture.

> **Scope note (ValueFlows version)**: This document specifies a DSL for **ValueFlows 1.0** — the current, ratified vocabulary that Nondominium implements today (two flow-endpoint primitives: `Agent` and `EconomicResource`). A separate, in-progress design proposes an **augmented ValueFlows** profile that adds a third primitive, **`vf:Source`**, for generative non-ownable systems (watersheds, forests, knowledge commons). Anywhere this document refers to `Source`, `vf:Source`, `extract`, or Source-NDOs, it is describing **future/work-in-progress** capability, not the MVP DSL. See [`source-valueflows-integration.md`](source-valueflows-integration.md) and [`source-ndo-requirements.md`](source-ndo-requirements.md). The delineation is made explicit throughout (see §2.1.1).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background and Context](#2-background-and-context)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Target Users](#4-target-users)
5. [Use Cases](#5-use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Constraints](#8-technical-constraints)
9. [Proposed Syntax Examples](#9-proposed-syntax-examples)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Success Criteria](#11-success-criteria)
12. [Open Questions](#12-open-questions)
13. [References](#13-references)

---

## 1. Executive Summary

This document specifies the requirements for a Domain-Specific Language (DSL) designed to express Valueflows economic patterns within the Nondominium ecosystem. The DSL aims to provide power users, network administrators, and developers with a concise, human-readable scripting language for bootstrapping networks, bulk resource registration, process recipe definition, and automated economic coordination.

Nondominium is a Valueflows-compliant Holochain application implementing distributed, agent-centric resource management with embedded governance. While a graphical user interface serves daily operations, complex administrative tasks—such as initializing a new commons network with dozens of resources, members, and governance rules—benefit significantly from a scriptable approach.

The proposed DSL bridges the gap between the formal Valueflows ontology and practical operational needs, enabling reproducible configurations, version-controlled economic definitions, and automated workflows that would be tedious or error-prone through manual GUI interaction.

---

## 2. Background and Context

### 2.1 Valueflows Overview

Valueflows is an open vocabulary for distributed economic networks, built upon the Resource-Event-Agent (REA) accounting ontology. It provides a standardized way to describe economic activity across organizational boundaries, enabling coordination between agents who may use different software systems.

Core Valueflows concepts include:

- **Agents** — Persons, organizations, or ecological agents that perform economic activities
- **Resources** — Economic resources tracked by specification (type) and optionally as inventoried instances
- **Events** — Observed economic activities: produce, consume, use, transfer, modify, move, etc.
- **Processes** — Transformations that take resource inputs and produce outputs
- **Commitments** — Promised future economic events
- **Intents** — Desired economic events not yet committed (offers and requests)
- **Recipes** — Templates defining how processes transform inputs to outputs

### 2.1.1 ValueFlows 1.0 vs. Augmented ValueFlows (planned)

The DSL specified in this document targets **ValueFlows 1.0**. Understanding the boundary between the ratified standard and the planned augmentation matters for scoping the DSL grammar and its compilation targets.

**ValueFlows 1.0 (current — the DSL's baseline).** The standard recognizes exactly **two flow-endpoint primitives**: `Agent` and `EconomicResource`. Every `EconomicEvent` has a `provider` and a `receiver`, both of which are strictly typed to `vf:Agent` in the specification; appropriable outputs are `EconomicResource`s with a `primaryAccountable` agent. This is what Nondominium's `zome_gouvernance` and `zome_resource` implement today (`EconomicEvent.provider`/`receiver` are `AgentPubKey`; `EconomicResource.custodian` is an `AgentPubKey`). All MVP DSL constructs in §6 compile to this model.

**Augmented ValueFlows (planned / work-in-progress — NOT part of the MVP DSL).** A separate design proposes a **third primitive, `vf:Source`** — a generative, non-ownable, partially unknowable system that yields resources, receives effects, and conditions future possibilities (e.g. a river/watershed or a knowledge commons). Sources become valid flow endpoints and introduce an `extract` action, coupling links between Sources, a `Steward` functional role, and an adaptive (black-box) governance loop. This work is fully specified in [`source-valueflows-integration.md`](source-valueflows-integration.md) and [`source-ndo-requirements.md`](source-ndo-requirements.md).

| Aspect | ValueFlows 1.0 (DSL baseline) | Augmented ValueFlows (planned) |
| --- | --- | --- |
| Flow-endpoint primitives | `Agent`, `EconomicResource` | + `vf:Source` |
| `EconomicEvent` endpoints | `provider`/`receiver` → `Agent` | endpoints may also be a `Source` |
| Actions | standard VF action set (§6.1.4) | + `extract` (draw yield from a Source) |
| Governance target | agent-held resources | + adaptive stewardship of Sources |
| DSL status | **in scope for MVP** | **future — grammar reserved, not implemented** |

Throughout the remainder of this document, any construct that touches `Source` is flagged **(Planned — Augmented ValueFlows)** and is out of scope for the MVP DSL grammar. It is documented here so the DSL's syntax and roadmap reserve room for it without committing to implementation.

### 2.2 Nondominium Architecture

Nondominium implements Valueflows on Holochain through a three-zome architecture:

- **zome_person** — Agent identity, profiles, roles, and capability-based access control
- **zome_resource** — Resource specifications, economic resources, and lifecycle management
- **zome_gouvernance** — State transition operator that evaluates governance rules and validates changes

This governance-as-operator design separates data management from business logic enforcement, allowing governance rules to be modified without changing resource data structures. The DSL must respect this separation while providing a unified scripting experience.

### 2.3 Problem Statement

Current limitations that the DSL addresses:

- **Manual repetition** — Registering many resources or agents requires repetitive GUI interactions
- **No reproducibility** — Network configurations cannot be version-controlled or replicated
- **Steep learning curve** — Understanding Valueflows requires navigating verbose JSON-LD or GraphQL structures
- **No automation** — Recurring administrative tasks cannot be scripted
- **Testing complexity** — Creating realistic test environments requires manual setup

---

## 3. Goals and Objectives

### 3.1 Primary Goals

- **Accessibility** — Lower the barrier to working with Valueflows patterns through readable, intuitive syntax
- **Efficiency** — Enable bulk operations that would be impractical through GUI interaction
- **Reproducibility** — Allow network configurations to be version-controlled, shared, and replicated
- **Correctness** — Provide compile-time validation of economic logic before execution
- **Integration** — Seamlessly compile to Nondominium's hREA zome calls

### 3.2 Secondary Goals

- **Contribution to Valueflows ecosystem** — Design the DSL to potentially benefit other Valueflows implementations
- **Educational value** — Help users understand Valueflows concepts through practical usage
- **Extensibility** — Support future additions to the Valueflows vocabulary and Nondominium features

---

## 4. Target Users

### 4.1 Primary Users

**Network Administrators** — Individuals responsible for setting up and maintaining Nondominium networks for their organizations or communities. They need to:

- Bootstrap new networks with initial agents, resources, and governance rules
- Migrate existing data from legacy systems
- Perform bulk updates across many resources
- Define and update governance rules systematically

**Developers** — Technical contributors building on or extending Nondominium. They need to:

- Create reproducible test environments
- Script integration tests with realistic data
- Generate demonstration scenarios
- Debug issues by examining DSL-generated state

### 4.2 Secondary Users

**Power Users** — Technically inclined community members who prefer scripting over GUI interaction for:

- Batch resource registration (e.g., cataloging an entire workshop)
- Defining complex process recipes
- Automating recurring administrative tasks

**Other Valueflows Implementers** — Projects building Valueflows-based systems who may adopt or adapt the DSL for their own use cases.

---

## 5. Use Cases

### 5.1 Network Bootstrapping

**Scenario**: A new fabrication commons wants to launch their Nondominium network with initial configuration.

**Requirements**:

- Define the organization and founding members
- Register resource specifications (equipment types, material categories)
- Create initial inventory of resources
- Establish governance rules for resource access and transfer
- Set up standard process recipes for common workflows

### 5.2 Bulk Resource Registration

**Scenario**: An existing workshop joins the network and needs to register all their equipment.

**Requirements**:

- Import from CSV or structured data sources
- Apply common properties to groups of resources
- Generate unique identifiers systematically
- Validate data consistency before committing

### 5.3 Process Recipe Definition

**Scenario**: The network documents standard manufacturing processes for replication and planning.

**Requirements**:

- Define input resources (consumed, used, cited)
- Define output resources (produced)
- Specify work requirements by skill type
- Indicate process stages and dependencies
- Support recipe scaling (multiplying quantities)

### 5.4 Governance Rule Configuration

**Scenario**: Administrators define access policies, booking limits, and approval workflows.

**Requirements**:

- Define rules that apply to resource categories
- Specify conditions, thresholds, and approvers
- Update rules without affecting resource data
- Validate rule consistency and coverage

### 5.5 Migration and Export

**Scenario**: Data moves between systems or needs backup/restore capability.

**Requirements**:

- Export current network state as DSL scripts
- Diff two states to generate migration scripts
- Import from other Valueflows implementations
- Generate JSON-LD or GraphQL representations

---

## 6. Functional Requirements

### 6.1 Language Primitives

The DSL must support the following **ValueFlows 1.0** concepts as first-class language constructs. (The `Source` primitive is a planned augmentation — see §6.1.7 — and is not part of the MVP grammar.)

#### 6.1.1 Agents

- Person agents with profile information
- Organization agents (formal and informal)
- Role assignments within organizations
- Agent relationships (member-of, works-for, etc.)

#### 6.1.2 Resources

- Resource specifications (types/kinds)
- Economic resources (inventoried instances)
- Resource classifications (taxonomies)
- Units of measure
- Lot and serial number tracking

#### 6.1.3 Flows

- Intents (offers and requests)
- Commitments (promises)
- Economic events (observations)
- Claims (reciprocal expectations)

#### 6.1.4 Actions

All standard ValueFlows 1.0 actions must be supported:

- **Process actions:** produce, consume, use, cite, work, deliverService, modify
- **Transfer actions:** transfer, transferAllRights, transferCustody
- **Movement actions:** move, pickup, dropoff
- **Combination actions:** combine, separate
- **Adjustment actions:** raise, lower, copy

> **(Planned — Augmented ValueFlows)** The augmented profile adds an **`extract`** action for drawing yield from a `vf:Source` (e.g. abstracting water from a watershed, downloading a design from a commons repository). `extract` is **not** part of the MVP DSL action set; it is reserved for the future Source work. See [`source-valueflows-integration.md`](source-valueflows-integration.md).

#### 6.1.5 Processes and Recipes

- Process specifications (types)
- Process instances
- Recipe definitions with input/output flows
- Stage tracking for multi-step workflows

#### 6.1.6 Governance (Nondominium-specific)

- Access rules for resource types
- Approval workflows
- Booking and usage limits
- Private Participation Receipts (PPR) configuration

#### 6.1.7 Sources — (Planned — Augmented ValueFlows, WIP)

> **Not part of the MVP DSL.** The following constructs are reserved for the future augmented-ValueFlows profile and are documented so the grammar can accommodate them later without breaking changes. Full requirements live in [`source-valueflows-integration.md`](source-valueflows-integration.md) and [`source-ndo-requirements.md`](source-ndo-requirements.md).

When the `vf:Source` primitive is adopted, the DSL is expected to add:

- **Source declarations** — a generative system (e.g. `Hydrological`, `KnowledgeCommons`) with a `SourceProfile` (regime state, stock/flux, stewards, coupling links), modeled as a Layer 0 NDO extension
- **`extract` events** — events whose provider or receiver is a `Source` rather than an `Agent`
- **Source coupling links** — typed relationships between Sources (`Yields`, `Conditions`, etc.) so effects propagate across a watershed or dependency graph
- **`Steward` role assignments** — a functional role emphasizing obligations toward a Source rather than rights over a resource
- **Adaptive governance blocks** — rules that observe boundary events on a Source and adapt (black-box governance loop)

The grammar should treat these as an optional, versioned language extension gated behind the augmented-ValueFlows profile, keeping the MVP declarative core (§6.1.1–6.1.6) unchanged.

### 6.2 Operations

#### 6.2.1 CRUD Operations

- Create new entities
- Read/query existing entities
- Update entity properties
- Delete/archive entities

#### 6.2.2 Bulk Operations

- Create multiple entities from templates
- Update entities matching criteria
- Import from external data sources
- Export to various formats

#### 6.2.3 Validation

The DSL must provide comprehensive validation across multiple dimensions:

- **Syntax validation** — Grammar compliance and structure checking
- **Type checking** — Unit compatibility, resource specification matching
- **Reference integrity** — Agent and resource existence verification
- **Economic logic** — Process balance, valid action sequences
- **Governance compliance** — Rule coverage, conflict detection

_See technical specifications for detailed validation pipeline architecture._

### 6.3 CLI Interface

| Command                                   | Description                                     |
| ----------------------------------------- | ----------------------------------------------- |
| `nondom apply <script.vf>`                | Execute a DSL script against the network        |
| `nondom validate <script.vf>`             | Validate syntax and semantics without executing |
| `nondom apply --dry-run <script.vf>`      | Show what would change without applying         |
| `nondom export --format vf`               | Export current state as DSL script              |
| `nondom import <file> --mapping <map.vf>` | Import from external format using mapping       |
| `nondom repl`                             | Interactive shell for exploratory scripting     |

---

## 7. Non-Functional Requirements

### 7.1 Usability

- Syntax should be readable by non-programmers familiar with Valueflows concepts
- Error messages must reference source locations and suggest corrections
- Documentation with examples for all major use cases
- Syntax highlighting support for common editors (VS Code, Vim, Emacs)

### 7.2 Performance

**Target Performance Metrics**:
| Operation | Target | Notes |
|-----------|--------|-------|
| Parse 1000 entities | < 1 second | Script size |
| Validate typical script | < 2 seconds | All validation phases |
| Create 100 resources | < 10 seconds | Excluding DHT latency |
| Export 1000 entities | < 5 seconds | To DSL format |
| Bulk update 100 resources | < 5 seconds | With where clause |

**Scalability**:

- Support scripts with 1000+ entity definitions
- Memory usage < 100MB for typical operations
- Batch operations optimize Holochain network calls

_See technical specifications for detailed optimization strategies._

### 7.3 Reliability

- **Atomic execution** — All-or-nothing application of changes
- **Idempotent operations** — Repeated executions produce consistent results
- **Clear rollback semantics** — Graceful failure recovery
- **No data corruption** — Crash-safe operations

### 7.4 Extensibility

- Support for custom attributes beyond core Valueflows
- Plugin architecture for additional compilation targets
- Versioned language specification for backward compatibility

### 7.5 Security

The DSL must provide:

- **Agent authentication** — Scripts execute with authenticated agent's permissions
- **Capability-based access control** — All operations validated against capability tokens
- **Data privacy** — Sensitive data handling respects Nondominium's privacy model
- **Audit logging** — Comprehensive logging of all operations
- **Declarative-only execution** — No arbitrary code execution or system access
- **Rate limiting** — Abuse prevention for bulk operations

_See technical specifications for detailed security model._

---

## 8. Technical Constraints

### 8.1 Technology Stack

- **Implementation language**: Rust (to align with Nondominium's existing codebase)
- **Parser**: pest or nom parser combinators
- **Primary target**: Nondominium hREA zome calls
- **Secondary targets**: JSON-LD export, GraphQL mutations, visualization

### 8.2 Valueflows Compliance

- DSL concepts must map cleanly to Valueflows vocabulary
- Terminology should align with Valueflows documentation
- Export to standard Valueflows JSON-LD must be lossless

### 8.3 Holochain Integration

- Respect Holochain's agent-centric security model
- Work within DHT consistency constraints
- Support capability-based access control

---

## 9. Proposed Syntax Examples

The following examples illustrate the proposed DSL syntax. Final syntax will be refined during implementation.

### 9.1 Network Bootstrap

```vf
# Network initialization script
network FabLabMontreal {
  created: 2025-01-15
  jurisdiction: Quebec
}

agents {
  organization Sensorica {
    type: OpenValueNetwork
    location: Montreal
  }

  person Alice { roles: [Founder, Steward] }
  person Bob { roles: [Technician, Member] }
}
```

### 9.2 Resource Registration

```vf
resource_specifications {
  Equipment {
    governance: commons_stewardship
    accounting: use_tracking
  }
  Material {
    governance: pool_contribution
    accounting: quantity_consumed
  }
}

resources {
  CNC_Router : Equipment {
    custodian: Sensorica
    location: "Main workshop"
    value_estimate: 15000 CAD
  }

  PLA_Filament : Material {
    quantity: 50 kg
    pool: shared_consumables
  }
}
```

### 9.3 Process Recipe

```vf
recipe MachinePart {
  inputs:
    Aluminum_Stock 0.5kg (consume)
    CNC_Machine 2h (use)

  work:
    Fabrication 2h

  outputs:
    Machined_Part 1 (produce)
}
```

### 9.4 Governance Rules

```vf
governance {
  rule EquipmentBooking {
    applies_to: Equipment
    max_advance_booking: 14 days
    requires_approval_above: 8h
    approvers: [Steward, Technician]
  }
}
```

### 9.5 Economic Events

```vf
# Recording actual events
event production_001 {
  action: produce
  provider: Alice
  output: Machined_Part
  quantity: 10
  at: 2025-01-20T14:30:00
}

# Fulfilling a commitment
fulfill order_123 {
  performed_by: Bob
  resource: Machined_Part
  quantity: 10
  to: Customer
}
```

### 9.6 Bulk Operations

```vf
# Register multiple similar resources
resources {
  3D_Printer_Fleet : Equipment * 5 {
    custodian: Sensorica
    model: "Prusa MK4"
    location: "Print farm"
    # Creates: 3D_Printer_Fleet_1 through 3D_Printer_Fleet_5
  }
}

# Update matching resources
update resources where type == Equipment {
  maintenance_schedule: monthly
}
```

### 9.7 Sources — (Planned — Augmented ValueFlows, WIP)

> **Illustrative future syntax, not implemented.** This sketch shows how the DSL _might_ express `vf:Source` once the augmented-ValueFlows profile is adopted. It is included only to reserve syntactic space; it is **not** part of the MVP grammar. Authoritative modeling lives in [`source-valueflows-integration.md`](source-valueflows-integration.md).

```vf
# Declare a generative Source (Layer 0 NDO extension) — PLANNED
source WatershedX {
  type: Hydrological
  property_regime: Nondominium
  regime_state: Stressed
  stewarded_by: [Alice, Bob]
  # coupling to a downstream Source
  yields: AquiferY
}

# Draw yield from the Source via the planned `extract` action — PLANNED
event abstraction_042 {
  action: extract
  provider: WatershedX      # a Source acts as flow endpoint
  receiver: Alice
  resource: FreshWater
  quantity: 500 L
  at: 2026-04-01T09:00:00
}

# Adaptive governance keyed to observed boundary events — PLANNED
governance {
  adaptive rule WaterAbstractionLimit {
    applies_to: WatershedX
    when: regime_state == Stressed
    max_extract_per_day: 1000 L
    on_breach: tighten_and_notify_stewards
  }
}
```

_See technical specifications for additional syntax examples and edge cases._

---

## 10. Implementation Roadmap

### Phase 1: Core Language (MVP)

**Duration**: 4-6 weeks

1. Parser implementation for core constructs
2. Agent and resource registration
3. Basic validation (syntax, types)
4. CLI with apply and validate commands
5. Compilation to Nondominium zome calls

**Deliverables**: Working DSL for basic agent and resource definitions

### Phase 2: Completeness

**Duration**: 4-6 weeks

1. Full Valueflows action support
2. Process and recipe definitions
3. Governance rule configuration
4. Import/export functionality
5. Dry-run and diff capabilities

**Deliverables**: Complete DSL covering all major use cases

### Phase 3: Tooling

**Duration**: 3-4 weeks

1. Language server protocol (LSP) implementation
2. VS Code extension
3. REPL for interactive exploration
4. Documentation and tutorial content

**Deliverables**: Developer-friendly tooling ecosystem

### Phase 4: Ecosystem

**Duration**: Ongoing

1. Additional compilation targets (GraphQL, visualization)
2. Community feedback integration
3. Coordination with Valueflows community
4. Template library for common patterns

**Deliverables**: Sustainable community-driven development

### Future / Deferred: Augmented ValueFlows (`vf:Source`) support

**Status**: Not scheduled — gated on adoption of the augmented-ValueFlows profile.

Support for the `Source` primitive (§6.1.7, §9.7) — `source` declarations, the `extract` action, coupling links, `Steward` roles, and adaptive governance blocks — is **explicitly out of scope** for Phases 1–4. It will be planned as a distinct, versioned language extension only after the augmented-ValueFlows design ([`source-valueflows-integration.md`](source-valueflows-integration.md)) is ratified and the corresponding Nondominium backend (`SourceProfile`, Source flow endpoints, `Steward` role) is implemented. The MVP grammar reserves room for it without committing to a timeline.

---

## 11. Success Criteria

### 11.1 Measurable Success Metrics

| Criterion                  | Measurable Target                                      | Verification Method                                |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| **Network Bootstrapping**  | Bootstrap 100-agent network in < 5 minutes             | Time full bootstrap script execution               |
| **Bulk Registration**      | Register 100 resources in < 10 seconds                 | Benchmark bulk resource creation                   |
| **Script Reviewability**   | Comprehend 200-line script in < 5 minutes              | User testing with experienced administrators       |
| **Error Resolution**       | Fix common errors in < 2 minutes using error messages  | Measure time-to-fix for typical errors             |
| **External Adoption**      | 2+ organizations using DSL in production by Q2 2026    | Track adoption through GitHub issues and community |
| **Community Feedback**     | 80%+ positive sentiment on Valueflows design alignment | Survey Valueflows community members                |
| **Parse Performance**      | Parse 1000-entity script in < 1 second                 | Automated performance benchmarking                 |
| **Validation Accuracy**    | < 1% false positive rate in validation errors          | Test suite with valid and invalid scripts          |
| **Documentation Coverage** | 100% of language constructs documented                 | Automated documentation completeness check         |
| **Test Coverage**          | > 90% code coverage for DSL compiler                   | Automated test coverage reporting                  |

### 11.2 User Acceptance Criteria

**Network Administrators**:

- [ ] Can create bootstrap script without programming background
- [ ] Successfully complete initial network setup in < 30 minutes
- [ ] Understand error messages and fix issues independently
- [ ] Export/import network state for backup purposes
- [ ] Define governance rules using DSL syntax

**Developers**:

- [ ] Create reproducible test environments with < 50 line scripts
- [ ] Generate 100+ test resources in < 30 seconds
- [ ] Debug issues using DSL-generated state exports
- [ ] Integrate DSL into CI/CD pipelines
- [ ] Extend DSL with custom attributes when needed

**Power Users**:

- [ ] Register equipment inventory using bulk operations
- [ ] Define complex process recipes for manufacturing
- [ ] Automate recurring administrative tasks
- [ ] Share scripts with community for reuse
- [ ] Contribute governance rule templates

### 11.3 Technical Validation Criteria

**Correctness**:

- [ ] All Valueflows actions supported and tested
- [ ] Economic logic validation prevents invalid states
- [ ] Governance rules enforce correctly
- [ ] Round-trip export/import preserves data 100%

**Performance**:

- [ ] Parse 1000 entities in < 1 second
- [ ] Validate typical script in < 2 seconds
- [ ] Execute 100-entity script in < 30 seconds (excluding DHT)
- [ ] Memory usage < 100MB for typical operations

**Reliability**:

- [ ] Atomic transactions succeed or roll back completely
- [ ] Idempotent operations produce consistent results
- [ ] Error recovery gracefully handles failures
- [ ] No data corruption in crash scenarios

**Usability**:

- [ ] Error messages include line numbers and suggestions
- [ ] Syntax highlighting available for VS Code, Vim, Emacs
- [ ] Tutorial covers all common use cases
- [ ] Example scripts for all major patterns
- [ ] CLI help provides clear usage guidance

### 11.4 Ecosystem Integration Criteria

**Valueflows Alignment**:

- [ ] Terminology matches Valueflows specification
- [ ] Export to JSON-LD is lossless
- [ ] Community review validates design approach
- [ ] Contribution guidelines for upstream inclusion

**Nondominium Integration**:

- [ ] Compiles to correct hREA zome calls
- [ ] Respects capability-based access control
- [ ] Works with existing GUI-created data
- [ ] Governance rules integrate with zome_gouvernance

---

## 12. Open Questions

| Question                   | Status          | Resolution / Considerations                                                                                   |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| **File extension**         | ⏳ Open         | Options: `.vf` (recommended), `.nondom`, `.valueflows` — Community feedback requested                         |
| **Scripting capabilities** | ✅ **RESOLVED** | Three-tier progressive model (see technical specs) — MVP is declarative, T2 adds templates, T3 adds scripting |
| **Temporal expressions**   | ⏳ Open         | Consider ISO 8601 durations, cron-like schedules, natural language — Needs UX research                        |
| **Module system**          | ⏳ Open         | `include` directive shown in examples, but dependency resolution TBD — Circular dependency prevention needed  |
| **Governance scope**       | ✅ **RESOLVED** | Tightly integrated (see technical specs Section 3) — Full DSL syntax for governance rules with testing        |

### 12.1 Decision Log

**Resolved: Scripting Capabilities (2025-01-15)**

- **Decision**: Three-tier progressive language model
- **Rationale**: Allows MVP to remain simple while providing upgrade path
- **Impact**: Most users only need Tier 1; Tier 3 can be added based on demand
- **Reference**: Technical Specifications, Section 1.1

**Resolved: Governance Scope (2025-01-15)**

- **Decision**: Governance rules are first-class DSL constructs
- **Rationale**: Enables version-controlled, testable governance policies
- **Impact**: Unified scripting experience for data and rules
- **Reference**: Technical Specifications, Section 3

### 12.2 Questions Requiring Community Input

**File Extension**:

- **Proposed**: `.vf` (short, memorable, indicates Valueflows)
- **Alternatives**: `.nondom` (project-specific), `.valueflows` (explicit but long)
- **Decision Target**: Q1 2026, after MVP prototype testing

**Temporal Expressions**:

- **Use Cases**: Booking durations, maintenance schedules, temporal governance rules
- **Options**:
  1. ISO 8601: `P1H` (1 hour), `P30M` (30 minutes)
  2. Natural: `1h`, `30min`, `2days`
  3. Cron: `0 9 * * 1-5` (9am weekdays)
- **Research Needed**: User testing for readability and ease of use

**Module System Design**:

- **Requirements**:
  - Import scripts by path
  - Circular dependency detection
  - Namespace isolation
  - Re-exports for library scripts
- **Open Issues**: How to handle version mismatches between imported scripts?

---

## 13. References

- **Valueflows Specification (v1.0):** https://www.valueflo.ws/
- **Nondominium Repository:** https://github.com/sensorica/nondominium
- **hREA Project:** https://github.com/h-REA/hREA
- **REA Ontology:** https://wiki.p2pfoundation.net/Resource-Event-Agent_Model
- **Holochain Documentation:** https://developer.holochain.org/
- **Technical Specifications:** [Valueflows DSL Technical Specifications](../specifications/valueflows-dsl-specs.md)
- **Augmented ValueFlows — Source integration (planned/WIP):** [`source-valueflows-integration.md`](source-valueflows-integration.md)
- **Source-NDO requirements (planned/WIP):** [`source-ndo-requirements.md`](source-ndo-requirements.md)

---

## Appendix A: Valueflows Action Reference

The following are **ValueFlows 1.0** actions supported by the MVP DSL.

| Action              | Effect on Resource        | Typical Use               |
| ------------------- | ------------------------- | ------------------------- |
| `produce`           | Increments quantity       | Manufacturing output      |
| `consume`           | Decrements quantity       | Raw material input        |
| `use`               | No quantity change        | Equipment usage           |
| `cite`              | No quantity change        | Reference designs/docs    |
| `work`              | N/A (effort)              | Labor contribution        |
| `deliverService`    | N/A (service)             | Service delivery          |
| `modify`            | Changes properties        | Repair, upgrade           |
| `transfer`          | Changes custody + rights  | Full ownership transfer   |
| `transferAllRights` | Changes rights only       | Sell without delivery     |
| `transferCustody`   | Changes custody only      | Lend, consign             |
| `move`              | Changes location          | Transportation            |
| `pickup`            | Start custody transfer    | Receive shipment          |
| `dropoff`           | Complete custody transfer | Deliver shipment          |
| `combine`           | Creates container         | Packaging, kitting        |
| `separate`          | Splits container          | Unpacking                 |
| `raise`             | Increments (adjustment)   | Inventory correction up   |
| `lower`             | Decrements (adjustment)   | Inventory correction down |
| `copy`              | Creates duplicate         | Digital resources         |

**Planned — Augmented ValueFlows (not in MVP DSL):**

| Action    | Effect on Resource / Source            | Typical Use                                          |
| --------- | -------------------------------------- | ---------------------------------------------------- |
| `extract` | Draws yield from a `vf:Source`; debits the Source's stock/regime state | Abstracting water from a watershed; downloading a design from a knowledge commons |

---

## Appendix B: Glossary

| Term                       | Definition                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------- |
| **Agent**                  | A person, organization, or ecological entity that can participate in economic activity |
| **Augmented ValueFlows**   | _(Planned/WIP)_ A proposed profile extending ValueFlows 1.0 with the `vf:Source` primitive, the `extract` action, and adaptive stewardship governance |
| **Commitment**             | A promise to perform an economic event in the future                                   |
| **DHT**                    | Distributed Hash Table — Holochain's data storage mechanism                            |
| **Economic Event**         | An observed change in resources or resource rights                                     |
| **Economic Resource**      | Something of value that can be tracked and accounted for                               |
| **hREA**                   | Holochain implementation of the REA accounting model                                   |
| **Intent**                 | A desired economic event that has not yet been committed to                            |
| **PPR**                    | Private Participation Receipt — Nondominium's reputation tracking mechanism            |
| **Process**                | A transformation that takes inputs and produces outputs                                |
| **Recipe**                 | A template defining a repeatable process                                               |
| **REA**                    | Resource-Event-Agent — An accounting ontology                                          |
| **Resource Specification** | A type or kind of resource (not an instance)                                           |
| **Source (`vf:Source`)**   | _(Planned/WIP)_ A proposed third ValueFlows primitive: a generative, non-ownable, partially unknowable system that yields resources, receives effects, and conditions future possibilities (e.g. a watershed or knowledge commons) |
| **Source-NDO**             | _(Planned/WIP)_ A Nondominium NDO whose Layer 0 carries a `SourceProfile`, representing a `vf:Source` in the hApp |
| **Steward**                | _(Planned/WIP)_ A functional role for Source governance, emphasizing obligations toward a Source over rights over a resource |
| **Valueflows**             | A vocabulary for distributed economic coordination (this DSL targets v1.0)             |
| **Zome**                   | A module in a Holochain application                                                    |
