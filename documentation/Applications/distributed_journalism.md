# Distributed journalism — citizen investigation

**Source:** [Citizen Investigation](https://docs.google.com/document/d/1M9pbQf-HB9_i-zI1w_tGjQeH_eEiYqXX9vufIdD6qh8/edit) (Google Doc, via MCP).

This note summarizes that document: a design-oriented treatment of **peer-to-peer (P2P) citizen investigations** as organizational and socio-technical systems—framed as analysis of decentralized sense-making under pressure, not as operational guidance.

## Framing

The text argues that **decentralized investigations should be modeled as distributed sense-making protocols**, not as conventional media production. Centralized “citizen” efforts that hinge on one visible coordinator recreate a **Napster-style** failure mode (single choke point for pressure, law, and economics); a **BitTorrent-style** pattern spreads initiation, visibility, and monetization so no one node is required for the process to continue.

## Conceptual model (defensive P2P)

- **Pattern:** Central control and intermediaries become choke points; demand diverges; repression targets visible nodes; **protocols** can replace **platforms**. P2P is framed here primarily as **defensive** (smaller attack surface), not only as emancipation.
- **Design goals:** Initiation does not imply ownership; visibility does not imply control; contribution is not tied to public attribution by default; **leadership is process-shaped**, not personality-shaped; value accrual is indirect, delayed, and distributed.
- **Infrastructure themes:** Federated or protocol-level communication; **content-addressed** publishing and mirroring; append-only, tamper-evident evidence logs; separation of raw data, analysis, and interpretation; **pseudonymous** identities with reputation from contribution quality.
- **Methodology:** Modular tasks (gather, verify, cross-reference, test hypotheses, synthesize); **stigmergic** coordination (signals on artifacts, not central directives); explicit **uncertainty** and coexisting interpretations; no forced consensus.
- **Governance:** No final “truth” authority; validation, challenge, and revision processes; **forkability** of datasets and narratives as a safety valve; minimal rules (formats, review, dispute signaling).
- **Economics:** Reward verification, sourcing, and methodology—not headline visibility; **indirect** monetization for initiators (reputation, future collaboration, voluntary patronage); avoid exclusive ownership of evidence, paywalls on raw material, and platform lock-in (commons-style peer production).
- **Culture:** Norms favor evidence over authority, process over fixed outcome, forking over faction fights; **anti-hero** framing—visibility rotated or diffused so the system does not depend on a spokesperson.

## Commons-oriented stack (architecture sketch)

The doc specifies layers: **ontology** (evidence artifacts, claims, analyses, reviews, forkable narratives, contributions); **infrastructure** (content-addressed redundant storage; separation of storage, indexing, presentation); **coordination** (federated or relayed messaging; subscriptions to objects/claims); **identity** (pseudonymous crypto IDs; non-transferable, non-financial-by-default reputation—references to ideas like Flowsta in the original); **methodology** (artifact fingerprinting/time-stamping; claims that reference artifacts and decay if unmaintained; validation as privileged labor); **governance** (no editorial sovereign; forking as governance; boundary rules without defining “truth”); **economics** (monetize labor and infrastructure, not access to evidence/claims; contribution accounting with value signals that can connect to external settlement); **culture** (anti-celebrity UI, epistemic humility, defensive participant mindset). It explicitly asks whether stacks like **Nondominium** / **ValueFlows** could map to this.

## Concrete tool landscape (excerpt)

The document surveys **social protocols** (e.g. Nostr, ActivityPub/Fediverse, AT Protocol, Farcaster, SSB), **storage** (IPFS, Filecoin, Arweave, blog tooling), and **collaboration/leaks** (Matrix, SecureDrop, encrypted DMs)—as a composable “off–Web2” stack for independent work.

## Failure-mode analysis

Major risks analyzed include: **informal re-centralization** (power-law attention on a few interpreters); **signal flooding** (DoS on attention); **ideological capture** (monoculture, moralized review); **economic capture** via funders; **legal chilling** through identification; **procedural ossification**; **fork fatigue** without shared evidence pools; **reputational laundering**; **success-induced capture** (institutional absorption). The meta-point: dominant failure is often **re-institutionalization**, not raw shutdown. Design heuristic: mechanisms that maximize efficiency often raise capture risk; resilience favors redundancy, friction, plurality, and procedural humility.

## Economics of creators and “independent investigators”

A long tab reviews **influencer** business models (platform ads, sponsorships, affiliates, products, subscriptions, IP, hybrids) and contrasts them with **independent investigator** models (direct audience funding, grants, ideological or hybrid outlets, platform monetization, merchandise, consultancy, crowdsourced investigation). It discusses **competitive fragmentation** in decentralized media (attention markets, tournament dynamics, Nash-style equilibria favoring conflict) and outlines a **Decentralized Media Commons (DMC)** direction: OVN- and DAO-inspired ideas—shared infrastructure, contribution accounting, reputation, and incentives that make **collaboration** economically rational (with references to commons-based peer production, Sensorica-style OVNs, and tooling such as ValueFlows / SourceCred-style accounting in the blueprint).

## Closing thread

The piece ends by arguing that much **infrastructure already exists**; the open question is whether participants adopt coordination and value models that treat investigation as a **shared epistemic substrate** rather than a sequence of branded media products.

---

## Nondominium in this context

**Nondominium** is a Holochain application that implements **ValueFlows-shaped, agent-centric resource sharing** with **embedded governance** and **Private Participation Receipts (PPRs)** for participation-backed reputation. It is explicitly aimed at a **peer sharing economy** and **uncapturable, collaboratively governed resources** (see [`README.md`](../../README.md), [`requirements.md`](../requirements/requirements.md), and [`DOCUMENTATION_INDEX.md`](../DOCUMENTATION_INDEX.md)). **Citizen investigation** appears among the project’s adjacent application targets in [`strategic_development.md`](strategic_development.md).

### What is implemented today (relevant capabilities)

At a high level, the codebase delivers a **three-zome** split—**person** (identity, roles, capabilities, private-data access), **resource** (resource specifications and `EconomicResource` state as the data layer), **governance** (rule evaluation, commitments, economic events, claims, validation, PPR issuance)—documented in the index and zome docs.

For distributed investigation–style workflows, the following are **concrete affordances**:

- **Agents and membranes:** Public profiles and **pseudonymous** operation, **role** assignments, **capability** progression (e.g. Simple → Accountable → Primary Accountable), and **time-bounded private data sharing**—so participants can separate “public investigator” presence from sensitive fields without a central account database.
- **Resources as first-class objects:** **ResourceSpecification** and **EconomicResource** with lifecycle and **governance rules** attached to resources—suitable for modeling **investigation bundles** (e.g. a dataset, a verified extract, a collaborative case file) as resources whose **access, transfer, and process use** are rule-governed rather than platform-governed.
- **Auditability and contribution structure:** **Commitments**, **economic events**, and **claims** provide a **traceable** record of who did what to which resource and when—aligned with the Citizen Investigation doc’s emphasis on **provenance**, **modular tasks**, and **accounting for verification labor** rather than only narrative output.
- **Peer validation:** **Multi-reviewer validation** workflows (e.g. N-of-M) and governance-driven transitions support **collective checking** without a single editorial authority—overlapping the doc’s “validation / challenge / revision” and “review as labor” themes.
- **Reputation from participation, not vanity metrics:** **PPRs** (multi-category participation receipts tied to economic activity) are designed so **reputation accrues from signed participation in flows**, not from follower counts—closer to “review reputation” and contribution quality than to influencer economics.

The **Svelte** UI and **Tryorama** test suites exercise these paths end-to-end for the **resource sharing** domain; applying the same primitives to **journalism-specific** resource specs and governance patterns is largely a **modeling and UX** exercise on top of existing APIs.

### What is planned or in flight (how the fit improves)

Roadmap and architecture docs describe directions that strengthen the match to **commons-based** and **OVN-style** investigation economics:

- **hREA integration** ([`integration-strategy.md`](../hREA/integration-strategy.md)): richer **ValueFlows** types and **cross-DNA** economic operations—useful when investigations need **full VF graphs** (processes, agreements, fuller commitment/event semantics) while keeping **governance and PPR generation** atomic with events.
- **NDO / generic object model** ([`ndo_prima_materia.md`](../requirements/ndo_prima_materia.md)): a more explicit **Nondominium Object** lifecycle, capability surface, and migration story—relevant if “evidence artifact / claim / narrative fork” become **first-class** product concepts beyond today’s resource-centric MVP.
- **Optional post-MVP bridges:** **Unyt** (economic settlement / proofs) and **Flowsta** (portable identity across apps)—sketched in [`post-mvp/`](../requirements/post-mvp/)—for teams that want **external settlement** or **cross-app identity** without re-centralizing the investigation graph.

Requirements also spell out **post-MVP** agent and organization modeling (collectives, projects, bots, affiliation rules); today’s MVP emphasizes **individual agents**, so **newsroom- or collective-as-agent** patterns are **design targets**, not fully realized in code yet.

### How this maps to the Citizen Investigation stack

The Google Doc asks for a **protocolized commons**: separation of **raw data / analysis / interpretation**, **stigmergic** coordination on artifacts, **forkability**, **contribution accounting**, and **defensive** economics. Nondominium does **not** replace **broadcast** (Nostr, Fediverse), **large-file** permanence (IPFS, Arweave), or **anonymous drops** (SecureDrop)—those remain complementary layers. Where it **does** plug in is as a **coordination and accounting substrate**:

| Citizen investigation theme | Role of Nondominium |
| ---------------------------- | ------------------- |
| No single owner of the investigation graph | **Peer-hosted** Holochain data; **governance on resources** instead of a platform operator |
| Traceable contributions and verification labor | **Economic events**, **commitments**, **PPRs**, **validation workflows** |
| Reputation without “hero” centrality | **PPR categories** and **role/capability** progression tied to validated participation |
| Forkable interpretations | **Composable resources** and distinct **resource specs** / instances can represent parallel lines of inquiry; fuller **fork** semantics may deepen with NDO/hREA |
| Commons-compatible value flows | **ValueFlows** alignment and planned **hREA** depth for **OVN-style** value accounting |

In short: **Nondominium can serve citizen investigation and distributed journalism as the Holochain-native layer for governed shared resources, auditable contributions, and participation-based reputation**—with **public narrative and bulk evidence storage** still typically **composed** from federated or content-addressed tools the stack was designed to interoperate with conceptually, not to duplicate wholesale.
