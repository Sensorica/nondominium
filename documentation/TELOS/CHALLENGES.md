# Challenges

> Current obstacles and how they're being addressed. Updated as challenges are resolved and new ones emerge. The Nigredo is not comfortable — these are the forms the difficulty takes.

---

## 1. Tryorama Test Reliability

**The challenge:** Async timing issues cause intermittent failures in multi-agent test scenarios. Tryorama tests that pass in isolation occasionally fail when run together, especially in complex workflows involving multiple agents and DHT propagation delays.

**Why it matters:** An unreliable test suite is a liability. If tests pass non-deterministically, passing tests provide false confidence and failing tests provide false alarms. The foundation cannot be declared solid on the basis of intermittent green.

**Current mitigations:**
- `.only()` isolation during active development — test one scenario at a time until it's stable
- `warn!` macro debugging to trace execution flow through Rust zome functions during test runs
- 4-minute timeouts for complex multi-agent scenarios — not premature, the DHT needs time
- `singleFork: true` in Tryorama config to ensure DHT consistency across test files

**Outstanding work:** Systematic audit of all test files for timing dependencies. Some tests may be making assumptions about DHT propagation speed that should be replaced with explicit wait conditions.

---

## 2. Cross-Zome Communication Complexity

**The challenge:** The governance-as-operator pattern requires the governance zome to call the resource zome, which requires careful capability management in Holochain. Capability tokens must be granted, managed, and revoked correctly or cross-zome calls fail silently or with opaque errors.

**Why it matters:** The architectural integrity of the governance-as-operator pattern depends on the capability token system working correctly. A capability error that causes a governance call to fail silently is worse than one that fails loudly — the economic event is not recorded, the PPR is not generated, and the error may not be detected until audit time.

**Current mitigations:**
- Strict adherence to governance-as-operator direction: resource zome never calls governance zome
- Capability grants tested early in each new workflow
- Explicit error propagation through `WasmError` with descriptive messages
- Integration tests covering cross-zome call paths

**Outstanding work:** Document the capability grant patterns for each cross-zome call path. Create a test that verifies capability revocation behavior.

---

## 3. hREA Integration Timing

**The challenge:** When and how to adopt hREA as a backend economic engine without losing Nondominium's specialized innovations — particularly the PPR system and embedded governance patterns. The integration strategy involves architectural choices that are difficult to reverse.

**Why it matters:** If Nondominium integrates with hREA in a way that forces its data model to conform to hREA's schema, Nondominium's governance innovations may need to be reimplemented as hREA extensions. If it integrates too loosely, the two systems may evolve in incompatible directions. The timing and depth of integration matters.

**Current mitigations:**
- Documentation of hREA's architecture and data model maintained alongside Nondominium's
- Schema decisions in Phase 2 reviewed for hREA compatibility
- Clear articulation of what Nondominium provides that hREA does not (PPR, embedded governance, progressive trust) — these should survive any integration

**Outstanding work:** Formal integration strategy document. Proof of concept integration test to validate that the two systems can interoperate without either compromising its core design.

---

## 4. Community Adoption

**The challenge:** Technical infrastructure is only valuable if communities actually use it. The risk is building a technically correct system that is too complex to onboard, too abstract to explain, or too unfamiliar (agent-centric, Holochain-native) for most commons practitioners.

**Why it matters:** The Albedo stage — the emergence of widespread adoption — requires real communities to choose Nondominium over simpler alternatives (shared spreadsheets, existing platforms, informal governance). That choice will only be made if the system is comprehensible and the value is clear from the first interaction.

**Current mitigations:**
- Sensorica as the first pilot: a community that understands the value proposition and will tolerate early-stage complexity
- PEP Master as the validation case: a concrete, high-stakes use case that demonstrates real-world value
- Developer documentation planned for Phase 3

**Outstanding work:** User-facing documentation. Onboarding workflow for a new community. Moss ecosystem integration to reach communities already using Holochain tooling.

---

## 5. Frontend Maturity Gap

**The challenge:** The Svelte 5 frontend lags significantly behind the backend's maturity. The core zome functions are implemented and tested; the UI for many of them does not yet exist. This creates a gap between what Nondominium can do and what anyone can experience doing it.

**Why it matters:** A hApp without a usable UI can only be evaluated by developers who can write TypeScript against the Holochain client directly. That limits the feedback surface to a tiny community and makes the PEP Master validation difficult to conduct with non-technical stakeholders from Sainte Justine or Breathing Games.

**Current mitigations:**
- Backend completion prioritized over UI work — the foundation first
- UI work deferred to Phase 3
- Svelte 5 + @holochain/client patterns documented for when UI work begins

**Outstanding work:** Phase 3 UI implementation. Focus on the core workflows first: agent onboarding, resource creation, custody transfer, economic process initiation.
