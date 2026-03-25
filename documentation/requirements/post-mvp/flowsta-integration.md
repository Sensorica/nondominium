# Flowsta Integration: Cross-App Identity and Authentication for the NDO

**Status**: Post-MVP Design Document  
**Created**: 2026-03-24  
**Authors**: Nondominium project  
**Relates to**: `ndo_prima_materia.md`, `unyt-integration.md`, `documentation/archives/resources.md`, `documentation/archives/agent.md`, `documentation/archives/governance.md`

---

## Table of Contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Rationale: why Flowsta, why a capability](#2-rationale-why-flowsta-why-a-capability)
3. [How Flowsta entered the foundational documents](#3-how-flowsta-entered-the-foundational-documents)
4. [Architecture summary](#4-architecture-summary)
5. [Relationship to Unyt and the foundational spec](#5-relationship-to-unyt-and-the-foundational-spec)
6. [Integration path (three phases)](#6-integration-path-three-phases)
7. [Requirements traceability](#7-requirements-traceability)
8. [Current MVP vs planned enforcement](#8-current-mvp-vs-planned-enforcement)

---

## 1. Purpose and scope

This document is the **dedicated specification stub** for integrating **Flowsta** — decentralized identity and authentication for Holochain apps (Vault, agent linking, W3C DIDs) — with the **Nondominium Object (NDO)** and the Nondominium hApp.

It serves three functions:

1. **Narrative home** — explains the *initial rationale* for choosing Flowsta-shaped integration (cross-app identity, recovery, optional governance enforcement) in one place.
2. **Cross-document index** — records *where* that rationale and mechanics were first woven into the project’s archive knowledge base (`resources.md`, `agent.md`, `governance.md`) and the normative requirements (`ndo_prima_materia.md`).
3. **Implementation pointer** — aligns engineering work with **REQ-NDO-CS-12** through **REQ-NDO-CS-15**, **REQ-NDO-AGENT-07** / **REQ-NDO-AGENT-08**, and `ndo_prima_materia.md` **Section 6.7** / **Section 11.6**.

Detailed cryptographic payloads, zome API listings, and UI copy should grow here over time; the **authoritative structural spec** remains `ndo_prima_materia.md` **Section 6.7** until this file absorbs lower-level detail.

---

## 2. Rationale: why Flowsta, why a capability

### 2.1 Problems the NDO leaves open

The MVP NDO stack assumes **long-lived Holochain signing keys** and **local-to-DHT** reputation:

- **`Person`** entries and **PPRs** are designed for permanence and auditability, but there is **no deterministic key recovery** in the core DNA: device loss can strand an agent from their source chain and private data.
- **Roles**, **PPR-derived `ReputationSummary`**, and **governance standing** are **not portable across other Holochain apps** unless additional infrastructure provides a **verifiable same-person** link.
- **Multi-network participants** (bridge nodes between OVNs or hApps) face **repeated cold-start trust** and **sybil pressure** at every network boundary if each conductor treats them as a unrelated keypair.

These gaps show up explicitly in the archive gap tables (e.g. `resources.md` §2.4, `agent.md` §2.6, `governance.md` §2.8).

### 2.2 Capability, not a mandatory layer

Cross-app identity must **not** be hard-coded as a third structural pillar or a registration gate on every agent. That would violate **complexity-oriented programming (COP)** and **pay-as-you-grow**: many communities only need `AgentPubKey` and local PPRs.

Flowsta is therefore integrated as an **optional capability**, parallel to **Unyt**:

- **Unyt** answers *who owes what to whom* (settlement, RAVE, economic closure).
- **Flowsta** answers *who is who* (DID, dual-signed linking, Vault recovery).

Communities may adopt **one, both, or neither**. Attachment is **stigmergic**: agents and custodians opt in through capability slots and (when desired) governance rules.

### 2.3 What Flowsta adds in one sentence

Flowsta provides **Vault-mediated dual-signed `IsSamePersonEntry`** attestations on the NDO DHT, a **`FlowstaIdentity`** capability slot on the agent’s **`Person`** entry hash pointing at that attestation, **W3C DIDs** for cross-app reference, and **BIP39 / backup / CAL-aligned export** for operational resilience — without changing the `Person` schema.

---

## 3. How Flowsta entered the foundational documents

The same design was introduced **consistently but with document-specific emphasis**: resources emphasize access and asset governance; agents emphasize identity and portability; governance emphasizes Tier 2 rules and the governance-as-operator path.

### 3.1 `documentation/archives/resources.md`

- **Header**: `flowsta-integration.md` added to **Relates to**.
- **§2.4 Known gaps**: rows for **no cross-app identity / DID** and **no agent key recovery**, with Flowsta as the planned mitigation (`ndo_prima_materia.md` **Section 6.7**).
- **§3.8 Flowsta Integration**: roadmap summary — `FlowstaIdentity` on `Person`, two tiers, Vault recovery, PPR attribution to DID.
- **§4.5 Accessibility credentials**: **FlowstaIdentity-based** dimension; Tier 1 voluntary link vs Tier 2 governance requirement (**REQ-NDO-CS-14** / **CS-15**, Flowsta Phase 3).
- **§4.6 Transferability**: clarifies **attribution portability** (via DID) **≠** **claim transferability** (`PrivateParticipationClaim` remains bound to local keys).
- **§5.1 / §5.3**: mapped **planned** rows and **cross-app identity verification** gap row.
- **§6.6** (governance defaults TODO): two bullets — **Tier 1** (Flowsta Phase 1; **REQ-NDO-CS-12/CS-13**) without Affiliation/ZKP infrastructure; **Tier 2** (Flowsta Phase 3; **REQ-NDO-CS-14/CS-15**) for governance-enforced linking — distinct from AffiliationState / PortableCredential / ZKP dimensions.

### 3.2 `documentation/archives/agent.md`

- **Header**: `flowsta-integration.md` in **Relates to**.
- **§2.6**: OVN-framed gap rows for cross-app identity and deterministic recovery.
- **§3.2 CapabilitySlot on Agent Identity**: **Flowsta Auth** as first concrete implementation — `FlowstaIdentity` → `IsSamePersonEntry`, DID, forward reference to §3.5; pattern defined in `ndo_prima_materia.md` **Section 6.5** (Person surface) and **Section 6.7** (Flowsta).
- **§3.4 Credential portability**: Flowsta DID as **cross-app anchor** for attributing `ReputationSummary`; complements NDO-native **`PortableCredential`** forward design in **this file, Section 6.5** (not prima materia §6.5 — that section is the Person attachment surface in `ndo_prima_materia.md`).
- **§3.5 Flowsta Integration**: agent linking zomes, Tier 1 / Tier 2 and Phase 1 / Phase 3, Vault, OAuth-only vs Vault path; pointers to `ndo_prima_materia.md` **6.7**, **11.6**, and `resources.md` §3.8.
- **§4.4 Identity architecture**: **near-term** Flowsta bridge vs longer-term ZKP/VC depth; **REQ-NDO-AGENT-08**.
- **§5.1–5.3**: planned rows; portability and credential/sybil rows extended with Flowsta **complements**.
- **§6.3 `AgentProfile` / §6.5 `PortableCredential`**: forward-design sketch and portable-credential note tying issuers to **Flowsta DID** when a `FlowstaIdentity` slot exists.
- **§7**: complexity economics — bridge nodes, Tier 1 vs Tier 2 and Bar-Yam-style matching.

### 3.3 `documentation/archives/governance.md`

- **Header**: `flowsta-integration.md` and cross-links to other archives.
- **§1.2**: stigmergy extended to **agent** `Person` hash and Tier 1 vs Tier 2 (Flowsta Phase 3 for Tier 2).
- **§2.8**: gap row for **governance-enforced cross-app identity**; sybil row notes Flowsta Tier 2 as **complement** to vouching/PoP.
- **§3.2 → §3.7**: Unyt subsection bridges to **§3.7 Flowsta Integration — Identity Verification Governance**: parallel **UnytAgreement / EconomicAgreement / RAVE** vs **FlowstaIdentity / IdentityVerification / `IsSamePersonEntry`**; **REQ-NDO-CS-12–15**; planned **`evaluate_transition_request`** alignment; MVP reality (`GovernanceRule` as strings; `validate_agent_for_promotion` / `validate_agent_for_custodianship` without Flowsta today).
- **§3.3 / §3.5 / §4.1 / §4.4 / §4.7 / §5.1 / §5.3 / §6.4 / §7**: typed rules, mapped rows, sybil resolution, weight function, complexity — all aligned with **IdentityVerification** and Flowsta tiers.
- **Closing note**: `ndo_prima_materia.md` **§§6.6–6.7** and **§§11.5–11.6** traceability.

Together, these documents implement a **single architectural story**: permissionless discovery (Tier 1), optional hard enforcement (Tier 2), and clear separation from economic closure (Unyt).

---

## 4. Architecture summary

The following is a condensed restatement of `ndo_prima_materia.md` **Section 6.7**; see there for diagrams and full prose.

| Element | Role |
|--------|------|
| **`Person` entry hash** | Agent identity anchor; target for **`FlowstaIdentity`** `CapabilitySlot` links (**REQ-NDO-AGENT-07**). |
| **`flowsta-agent-linking` zomes** | Integrity + coordinator zomes in the DNA manifest; commit **`IsSamePersonEntry`** (dual-signed 78-byte payload: NDO agent key + Flowsta Vault key). |
| **`FlowstaIdentity` slot** | **Tier 1**: any agent may link their `Person` hash to an `IsSamePersonEntry` action hash (**REQ-NDO-CS-12**, **REQ-NDO-CS-13**). |
| **W3C DID** | e.g. `did:flowsta:uhCAk...` (or `did:key:...`) — cross-app stable identifier. |
| **`IdentityVerification` governance rule** | **Tier 2**: conditions high-trust transitions (e.g. **PrimaryAccountableAgent** promotion, high-value custody) on **REQ-NDO-CS-15** checks (**REQ-NDO-CS-14**). |
| **Revocation** | `revoke_link` on the Flowsta coordinator; Tier 2 validation must treat revoked links as invalid. |
| **PPR / reputation** | With a valid Tier 1 link, **`ReputationSummary` is attributable to a DID**; **PortableCredential** interoperability is anchored by the same DID (**REQ-NDO-AGENT-08**). |

**OAuth-only path (`@flowsta/auth`)**: convenient DID for web contexts while the app keeps separate Holochain keys; the **Vault path** is what produces **`IsSamePersonEntry`** on the NDO DHT (Flowsta docs “Option 1” vs “Option 2” — summarized in `agent.md` §3.5).

---

## 5. Relationship to Unyt and the prima materia

- **Prima materia Section 6.6** (Unyt) and **Section 6.7** (Flowsta) are **parallel two-tier models**: slot (discoverable) + endorsed `GovernanceRule` (enforceable).
- **Section 11.5** (Unyt) and **Section 11.6** (Flowsta) situate both in the **Relationship to Other Post-MVP Work** matrix.
- When **both** are active, a Flowsta DID can anchor **cross-app attribution** of reputation signals that also feed **Unyt** credit and governance-weight narratives (see `governance.md` §3.5 and prima **Section 6.7**, *Flowsta and Unyt*).

---

## 6. Integration path (three phases)

Aligned with `ndo_prima_materia.md` **Section 6.7**:

| Phase | Focus | Outcome |
|-------|--------|---------|
| **1** | Capability surface + DNA | `FlowstaIdentity` in `SlotType`; `flowsta-agent-linking` zomes; SDK wiring; Tier 1 linking without governance enforcement. |
| **2** | Frontend / UX | Link Flowsta flows, DID display, badges, Vault backup APIs (`startAutoBackup`, `backupToVault`, etc.). |
| **3** | Governance zome | `IdentityVerification` (or equivalent) in typed governance rules; transition evaluation validates **REQ-NDO-CS-15**; complements Unyt Phase 3-style **`evaluate_transition_request`** extensions. |

Phases are **independent and cumulative** — no rollback of earlier phases required.

---

## 7. Requirements traceability

| ID | Summary |
|----|---------|
| **REQ-NDO-CS-12** | `FlowstaIdentity` in `SlotType`; link target is `IsSamePersonEntry` from Flowsta coordinator. |
| **REQ-NDO-CS-13** | Tier 1: any agent may attach slot on own `Person` hash; no extra governance requirement beyond standard capability governance (**REQ-NDO-CS-03**). |
| **REQ-NDO-CS-14** | Governance supports **IdentityVerification** (or equivalent) conditioning promotions / high-value transitions on verified slot. |
| **REQ-NDO-CS-15** | Tier 2 verification: slot exists; `IsSamePersonEntry` includes requestor `AgentPubKey`; not revoked. |
| **REQ-NDO-AGENT-07** | `Person` hash as capability surface; Flowsta as first concrete implementation. |
| **REQ-NDO-AGENT-08** | Portable credentials; Flowsta DID as cross-network identity anchor when combined with `FlowstaIdentity`. |

---

## 8. Current MVP vs planned enforcement

As of the Nondominium MVP codebase:

- **`GovernanceRule`** in `zome_resource` remains **`rule_type: String` / `rule_data: String`** — not a typed enum — and **Flowsta zomes are not yet part of the shipped DNA** unless explicitly added in a future milestone.
- **`zome_gouvernance`** exposes flows such as **`validate_agent_for_promotion`** and **`validate_agent_for_custodianship`** for **private-field** validation, **not** for Flowsta **`IdentityVerification`**.

Therefore **Tier 2** and **Phase 3** are **specified and documented** but **not yet implemented** in WASM. This document and the archive sections describe **target behavior**; `governance.md` §3.7 states the folding of identity checks into unified **transition evaluation** explicitly.

---

*For OVN-scale motivation (bridge nodes, governance equation, holonic layers), see `documentation/archives/agent.md`, `documentation/archives/governance.md`, and `documentation/archives/resources.md` in the sections cited above.*
