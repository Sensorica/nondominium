# TELOS: Nondominium

## Vision
A protocol for resource governance without ownership. Resources participate in
Nondominium Object (NDO) lifecycles where rights and responsibilities attach to
relationships, not to titles. The goal is infrastructure for commons-based economies
that cannot be re-enclosed — not by platform operators, not by nation-states, and
not by the project's own developers.

## Mission
Build and ship the Holochain hApp and underlying protocol that demonstrates
governance-embedded commons management at production scale. Integrate with hREA
for ValueFlows semantics. Provide an incremental adoption path so existing
organizations (Sensorica, Dolibarr/TikiWiki users, OVN-aligned cooperatives) can
participate without wholesale migration.

## Philosophy
- **Protocol-level economic enforcement over policy-level.** CAL-1.0 + AGPLv3
  dual license with protocol-level constraints (no re-enclosure, no revocation of
  nondominium status) baked into governance rules, not documents.
- **Three-layer progressive model.** Prima Materia (potential, Layer 0) → Specified
  (designed, Layer 1) → Custodial/Process (instantiated, Layer 2). Coordination
  overhead matches social complexity; no pre-classification at creation.
- **Private Participation Receipts (PPR) as user-sovereign reputation primitive.**
  16 categories, bilaterally signed, stored as Holochain private entries. No global
  scoring aggregator, no third-party visibility by default.
- **Composability with hREA and ValueFlows, not replacement.** NDO entries bridge
  to hREA's `EconomicResource`/`Agent` types. ValueFlows is the canonical action
  vocabulary.
- **Capability-based security via Holochain capability tokens.** Access rights are
  cryptographically issued, field-level scoped, and expire after 30 days maximum.
- **Agent-centric data model.** All data tied to individual agents' source chains.
  No shared database. DHT is the coordination layer, not the control layer.
- **Embedded governance.** Resources carry their own access and transfer rules as
  `GovernanceRule` entries on `ResourceSpecification`. The governance zome is a
  state-transition operator, not a policy server.

## Operating Principles for the AI
- **Prefer correctness over cleverness.** This is governance infrastructure for real
  economic relationships. A wrong validation rule on the DHT cannot be rolled back.
- **ValueFlows vocabulary is canonical.** If a concept exists in VF (EconomicEvent,
  Commitment, Claim, VfAction), use VF terminology. Do not invent parallel ontologies.
- **The NDO architecture in `documentation/requirements/ndo_prima_materia.md` is
  load-bearing.** Changes to the three-layer model, capability slots, or lifecycle
  state machine ripple through governance, PPR, and UI. Flag any proposal that touches
  this document's scope and note the downstream impact.
- **PPR must remain user-sovereign.** Resist any design that aggregates reputation
  into global scores, centralizes storage, or enables third-party visibility without
  explicit capability grant.
- **UI work uses Svelte 5 runes, UnoCSS, and Melt UI next-gen (`melt`).** Not
  shadcn. Not Tailwind utility classes directly in templates. Not Svelte 4 reactive
  statements (`$:`). Check the `mcp__svelte` MCP server for current Svelte 5 API.
- **Tibi (Tiberius Brastaviceanu) is co-author and primary collaborator.** When
  proposing architectural changes, frame them as proposals to discuss with him before
  implementing. He owns the Cursor workflow; test changes there too.
- **Consult `REVIEW.md` before proposing PR-shaped changes.** It explicitly lists
  patterns to flag. If your proposed code matches a flagged pattern, explain why it
  is safe before proceeding.
- **Read `CONTRIBUTING.md` for branch model and commit conventions** (`feat/`, `fix/`,
  `refactor/`, `docs/`, `chore/` prefixes; Conventional Commits scopes).

## What This PAI Is NOT For
- General TypeScript or Rust questions disconnected from Nondominium architecture.
  Use a generic AI session for language-level questions.
- Holochain learning content not specific to this codebase. The `holochain-agent-skill`
  covers Holochain generally; this TELOS is for Nondominium-specific decisions.
- Personal or spiritual contexts. Use a personal-level AI session.
- Speculation about post-MVP integrations (Unyt, Flowsta) without first reading their
  integration docs in `documentation/requirements/post-mvp/`.
