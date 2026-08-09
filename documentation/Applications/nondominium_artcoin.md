# Nondominium Support for Artcoin

> **Status:** Application design document. Maps the Artcoin use case onto the
> current Nondominium architecture (NDO three-layer model, governance-as-operator,
> PPR reputation). Where a flow depends on capabilities that are not yet in the
> MVP code, this is called out explicitly in [§5 Implementation Status](#5-implementation-status).
>
> See also: `artcoin_main_doc.md`, `user-story/user-story-artcoin.md`,
> `user-story/user-story-art-distribution.md`, `user-story/user-story-art-production.md`.

## 1. Summary of Artcoin in the Context of Nondominium

Artcoin (also referred to as the Internet of Art, or IoA) is a platform designed to
disintermediate the art market and enable the scalable circulation of artworks. It
builds on the "Soogart" and "L'Artothèque" models, where artworks are displayed in
public and private venues (restaurants, offices, cafés) rather than traditional
galleries, allowing the public to discover, enjoy, rent, or adopt art in their daily
environments.

In the context of **Nondominium**, Artcoin is a specific **application domain** built
on top of the generic Nondominium hApp. The core philosophy of Artcoin — making art
accessible, creating a sharing economy for creative works, and ensuring fair
compensation for creators — aligns closely with Nondominium's goal of organization-agnostic,
capture-resistant, self-governed resources.

By leveraging Nondominium's infrastructure, Artcoin can transition from a centralized
or low-tech agency model to a fully distributed, peer-to-peer ecosystem where:

- **Artworks** are modelled as **Nondominium Objects (NDOs)**. Each artwork carries a
  permanent identity anchor (`NondominiumIdentity`, Layer 0) whose `property_regime`
  can be **`Private`** (the artist retains ownership and control), **`Commons`**, or
  **`Nondominium`** (uncapturable, contribution-based access). The regime is chosen at
  creation and governs which transfers and agreements are valid for that artwork —
  giving artists explicit, machine-readable control over how their work circulates
  while still enabling permissionless discovery and display.
- **Reputation** for every party involved (artists, venues, individual art lovers,
  and support agents such as transporters and storers) is tracked via **Private
  Participation Receipts (PPRs)** — bilaterally signed, private, user-sovereign
  receipts — establishing trust without a central middleman.

## 2. Supporting Artcoin with Nondominium

Nondominium provides the primitives to model the entire lifecycle of an artwork within
the Artcoin ecosystem: from creation, through display and circulation, to adoption,
storage, or end-of-life.

### 2.1 Core Agents and Roles

The Artcoin ecosystem maps directly onto Nondominium's agent and role model
(`RoleType` in `zome_person`):

- **Artists (Accountable Agents):**
  - Create a **`ResourceSpecification`** for a body of work (the artwork template).
  - Create the artwork's NDO: a **`NondominiumIdentity`** (Layer 0) plus its
    **`EconomicResource`** instance (the physical piece), starting in the artist's
    custody.
  - Define embedded **`GovernanceRule`** entries (e.g. "70% of any sale goes to the
    artist", "rent is $30/month", "must be displayed in a smoke-free environment").
- **Venue Owners (Primary Accountable Agents / Custodians):**
  - Café, restaurant, or office owners who act as **Custodians** of an artwork.
  - Accept **`Commitment`** entries to store and display the art.
  - Are accountable for the well-being of the resource while it is in their custody.
- **Transporters (Accountable Agents with the `Transport` role):**
  - Move art between a current custodian and a new one (artist → venue, venue → venue,
    or venue/artist → an individual art lover).
  - Require a validated **`Transport`** role (e.g. proof of insurance or suitable
    vehicle), granted through peer validation.
- **Storers (Accountable Agents with the `Storage` role):**
  - Temporarily hold art between custodians — for example when an adoption or rental
    period ends and no new custodian is immediately ready.
  - Require a validated **`Storage`** role (e.g. proof of insurance or suitable,
    climate-controlled space).
- **Individuals / Art Lovers (Simple or Accountable Agents, and Custodians):**
  - Discover art in venues or by searching Nondominium.
  - Can buy, rent, or adopt art, becoming **Custodians** in their own right.
  - Initiate **Use** interactions (viewing/renting) or **custody transfers**
    (buying/adopting).

> A **Simple Agent** joins permissionlessly; after their first validated transaction
> they are promoted to **Accountable Agent** (`REQ-GOV-02`, `REQ-GOV-03`).
> Specialized roles (`Transport`, `Storage`, `Repair`) require validation by existing
> role holders (`REQ-GOV-04`).

### 2.2 Modelling an Artwork as an NDO

Artcoin uses the NDO three-layer model
(`documentation/requirements/ndo_prima_materia.md`):

| NDO Layer | Entry | Artcoin meaning |
| --- | --- | --- |
| **Layer 0 — Identity** | `NondominiumIdentity` | The artwork's permanent, immutable identity anchor. Carries `property_regime` (Private/Commons/Nondominium), `resource_nature` (`Physical` for a canvas, `Hybrid` for a physical piece with a digital twin), and `lifecycle_stage`. Its `action_hash` is the stable artwork ID for provenance. |
| **Layer 1 — Specification** | `ResourceSpecification` + `GovernanceRule` | The artwork's form and rules: title, medium, dimensions, images, care instructions, and embedded governance (revenue split, rental fee, display conditions). |
| **Layer 2 — Process** | `EconomicEvent`, `Commitment`, `Claim`, PPRs | The activity around the artwork: custody transfers, display commitments, transport/storage services, and the receipts they generate. |

Two orthogonal state dimensions apply:

- **`LifecycleStage`** (on Layer 0) tracks the artwork's maturity — e.g. `Ideation` →
  `Specification` → `Stable` → `Active`, and eventually `Deprecated`/`EndOfLife`.
- **`OperationalState`** (on the `EconomicResource` instance) tracks the current
  process condition — `Available`, `Reserved`, `InTransit`, `InStorage`,
  `InMaintenance`, `InUse`, `PendingValidation`. A freshly registered artwork starts
  `PendingValidation`; while displayed at a venue it is `InUse`; en route it is
  `InTransit`; while held by a storer it is `InStorage`.

### 2.3 Core Processes and Transactions

Nondominium's economic model captures the circulation of art. Each step below names
the ValueFlows action (`VfAction`) and the PPRs it generates.

#### Process 1 — Onboarding and Creation

- The **artist** creates a `ResourceSpecification` for a collection (e.g. "Oil on
  Canvas 2025").
- The artist creates the artwork's `NondominiumIdentity` and its `EconomicResource`
  instance. The resource starts in the artist's custody with
  `OperationalState::PendingValidation`.
- Peer validation (`validate_new_resource`) moves it to `Available` and generates a
  `ResourceCreation` PPR for the artist and a `ResourceValidation` PPR for the
  validator.

#### Process 2 — Distribution (current custodian → venue or individual)

- A **venue owner** or **individual** signals interest in displaying or holding the art.
- **Transport process** (`VfAction::TransferCustody`, `Transport` role):
  - A **transporter** commits to move the piece (`Commitment`).
  - **Custody transfer:** the current custodian (often the artist) transfers custody to
    the transporter → `CustodyTransfer` PPR for the sender; the resource becomes
    `InTransit`.
  - The transporter delivers to the new custodian.
  - **Custody acceptance:** the venue owner or individual accepts custody →
    `CustodyAcceptance` PPR; the transporter also earns a
    `TransportFulfillmentCompleted` PPR.
  - The artwork is now `InUse` (on display) at the venue, or held by the individual.

#### Process 3 — Storage (current custodian → storer → future custodian)

- The current custodian (e.g. a venue) signals that a rental/adoption period has ended
  and no new custodian is immediately ready, requesting storage.
- **Storage process** (`VfAction::TransferCustody`, `Storage` role):
  - A **storer** commits to hold the piece until a new agent wants to buy, rent, or
    adopt it (per the artwork's governance rules) — `StorageCommitmentAccepted` PPR.
  - **Custody transfer:** the current custodian transfers custody to the storer →
    `CustodyTransfer` PPR; the resource becomes `InStorage`.
  - **Custody acceptance:** the storer accepts custody → `CustodyAcceptance` PPR; on
    release the storer earns a `StorageFulfillmentCompleted` PPR.

#### Process 4 — Display and Renting (the "Soogart" model)

- **Use interaction (display):** the venue "uses" the artwork to enhance its space.
  - Governance rules may stipulate a fee paid to the artist and any support agents
    (transport, storage).
  - Modelled as a continuous `Use` interaction or periodic `AccessForUse`
    (`VfAction::AccessForUse`) events; the resource sits in `OperationalState::InUse`.
- **Discovery:** an individual visits the venue and scans a QR code on the piece
  (linked to its NDO `action_hash`) to view the artwork's history, the artist's
  profile, and its terms.

#### Process 5 — Adoption (custody transfer / sale)

- **Scenario:** an individual decides to adopt (buy or take custody of) the piece.
- **Commitment:** the individual makes a `Commitment` to fulfil the adoption terms
  (payment, if integrated, or simply the adoption rules).
- **Validation:** the governance zome (`zome_gouvernance`) evaluates the transition
  between the current custodian (venue, artist, or any accountable agent) and the new
  custodian.
- **Transfer** (`VfAction::TransferCustody`):
  - The current custodian initiates `transfer_custody`.
  - Custody moves from the current custodian to the new custodian; custodian and
    location metadata are updated. `CustodyTransfer` / `CustodyAcceptance` PPRs are
    generated.
  - **Revenue sharing:** where the system settles value (see §5), payment is split
    according to the artwork's embedded benefit rules — modelled as an `Agreement`
    with `BenefitClause` entries (e.g. 70% artist, 20% support actors, 10%
    protocol/DAO).

### 2.4 Governance and Trust

- **Reputation:** if a custodian damages a piece, that shows up in the performance
  metrics of the PPRs they receive, lowering the reliability signal in their derived
  `ReputationSummary`. Governance rules and counterparties can filter on this signal.
  Reputation is **private and user-sovereign** — there is no global scoreboard; agents
  selectively disclose a derived summary.
- **Validation:** high-value art can require **multi-reviewer validation**
  (`REQ-GOV-06`, e.g. a 2-of-3 scheme) before a custody transfer is finalized.
- **Provenance / hard to clone:** the NDO's permanent Layer 0 `action_hash` and its
  append-only event history prove the authenticity and lineage of the physical piece,
  addressing provenance and forgery.

By using Nondominium, Artcoin becomes a **self-governed, capture-resistant ecosystem**
where art flows directly between creators and the custodians/appreciators who value it —
realizing the vision of a "true sharing economy" for art.

## 3. Property Regimes for Art

A key strength of the NDO model for Artcoin is that artists choose the **property
regime** per artwork, and this choice constrains what can happen to the piece:

| `PropertyRegime` | Artcoin use | Transfer semantics |
| --- | --- | --- |
| **`Private`** | The artist (or a collector) retains full ownership; the piece can be sold, rented, or lent. | Ownership and custody transfers allowed. |
| **`Commons`** | Shared cultural works — e.g. an open, remixable digital piece or a community-stewarded work. | Ownership transfer blocked; custody/stewardship and use allowed. |
| **`Nondominium`** | Works the artist wants to remain permanently uncapturable and contribution-access based. | Ownership transfer architecturally impossible; custody, use, and benefit flows allowed. |

> The UI currently surfaces four regimes (Private, Commons, Nondominium, CommonPool);
> the Rust model additionally carries `Collective` and `Pool` (see
> `documentation/requirements/resources.md §2.6`). For most Artcoin scenarios, `Private`
> is the default, with `Commons`/`Nondominium` available for artists who want stronger
> anti-enclosure guarantees.

## 4. What Nondominium Provides Today (UI)

The Nondominium reference UI (`ui/`) already implements the identity and NDO
foundations Artcoin builds on:

- **Lobby → Group → NDO navigation.** Art lovers browse a lobby of all NDOs and filter
  by lifecycle stage, resource nature, and property regime — the discovery surface for
  a gallery/venue catalog.
- **Groups (DNA-backed).** A venue network, an artist collective, or a city's art scene
  can be modelled as a group (cloned Group cell) with its own members and NDO set.
- **NDO creation and lifecycle.** Artists create an artwork NDO (name, property regime,
  nature, lifecycle stage, description) inside a group, and drive its lifecycle
  transitions.
- **Read-only resource, governance, and activity views.** Each NDO shows its
  specifications and economic-resource instances, its governance rules and the viewer's
  roles, and its economic-event history.
- **Three-level identity.** Level 1 (lobby profile), Level 2 (per-group disclosure
  preference), Level 3 (`Person` on-chain, created on first DHT-active action).

## 5. Implementation Status

Artcoin flows map onto Nondominium capabilities at different maturities. This section
keeps the design honest about what is code-complete versus planned.

| Artcoin capability | Nondominium mechanism | Status |
| --- | --- | --- |
| Artist/venue/individual identity, roles | `zome_person` (`Person`, `PersonRole`, capability tokens) | ✅ Implemented |
| Artwork identity + classification | `NondominiumIdentity` (Layer 0), `PropertyRegime`, `ResourceNature`, `LifecycleStage` | ✅ Implemented |
| Artwork spec + embedded rules | `ResourceSpecification`, `GovernanceRule` | ✅ Implemented (rules are weakly-typed JSON) |
| Artwork instance + custodian | `EconomicResource`, `transfer_custody` | ✅ Implemented (single custodian; governance/PPR wiring on transfer is Phase 2) |
| Operational condition (in transit/storage/use) | `OperationalState` + `update_operational_state` | ✅ Implemented (governance-operator transitions deferred) |
| PPR reputation (16 categories, bilateral) | `zome_gouvernance` PPR system | ✅ Implemented (data model); UI display not built |
| Commitments / claims / economic events | `zome_gouvernance` (`propose_commitment`, `claim_commitment`, events) | ✅ Implemented (backend); no user-facing UI |
| Revenue split / benefit redistribution | `Agreement` + `BenefitClause` | 🔄 Partial — data model exists; not wired to settlement |
| Payment settlement | Unyt integration (post-MVP) | 🔄 Planned (`documentation/requirements/post-mvp/unyt-integration.md`) |
| Structured Economic Processes (Use/Transport/Storage/Repair as first-class process entries) | `initiate_economic_process` / `complete_economic_process` (spec §4.2) | 🔄 Planned — modelled today via custody transfers + operational state + service PPRs |
| Custody UI, process UI, PPR/reputation UI, payments UI | Frontend | 🔄 Not started — service/store layers exist for custody; the rest is planned |
| Multi-custodian / co-custody (e.g. fractional adoption) | Many-to-many flows (post-MVP) | 🔄 Planned (`documentation/requirements/post-mvp/many-to-many-flows.md`) |

**Bottom line:** the identity, artwork-as-NDO, custody, and reputation *primitives*
exist in the backend today. The Artcoin experience layer — process orchestration UI,
revenue settlement (Unyt), and PPR-driven reputation display — is the roadmap ahead.
