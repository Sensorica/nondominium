# Source-NDO: Making Nature Visible in Economic Information Systems

## Abstract

Ecological degradation is usually described as a policy failure, a market failure, or a moral failure. It is also an information-system failure. Many effects of economic activity are called "externalities" because they do not appear inside the transaction record that coordinates economic agents. Pollution, depletion, regeneration, and ecological condition are often measured elsewhere, after the fact, by regulators, scientists, or affected communities. This paper proposes a new economic-information primitive, the **Source**, implemented as a **Source-NDO**: a generative, non-ownable, partially unknowable ecological system whose boundary events can be recorded, whose condition can be sensed, and whose access rules can adapt through stewardship governance. 

The Source is neither an Agent nor a Resource. While in abstract modeling an "agent" can be thinly defined as any entity with a behavioral rule, real-world trans-domain systems—where transactions, agreements, and legal consequences merge on distributed ledgers—require a thicker distinction. A river does not negotiate, commit, or bear legal liability. Yet it is also not merely an owned, inventoriable stock of water. It is a generative system that yields resources, receives ecological effects, conditions other sources, and makes future economic activity possible. By extending event-based economic ontologies such as REA and ValueFlows with this primitive, ecological boundaries can be represented honestly without reducing nature to property, capital, or legal personhood, and without laundering human political decisions behind a fictitious natural agency.

---



## 1. Externalities As Information Failure

Economic activity changes ecological systems. Farms withdraw water and release nutrients. Mines consume water and discharge heavy metals. Dams use river flow without consuming it but alter timing, sediment, and downstream access. Forest operations remove trees and change infiltration, erosion, and biodiversity. Restoration groups replant riparian zones, rebuild wetlands, and improve the regenerative capacity of the watershed. These acts are economic, but the ecological effects are often not recorded in the same information system that records the transaction.

The classical language for this problem is externality. Pigou framed it as a divergence between private and social net product: economic actors are interested in the private result of their operations, while some benefits or harms fall on others without compensation (Pigou, 1920/1932). Coase later reframed the problem through rights, reciprocal harm, and transaction costs, insisting that institutions matter because real parties do not bargain in a frictionless world (Coase, 1960). Both traditions remain useful. But both leave open a prior question: where, in the economic information system, does the ecological effect appear?

If a factory sells a product, the sale appears in accounting. If a farm buys water rights, the contract appears. If a city utility pays for treatment, the cost appears. But the river's changing assimilation capacity, the wetland's reduced flood-buffering capacity, or the forest's effect on downstream flow may appear only in environmental reports, scientific models, or public controversy. The economic ledger and the ecological ledger are separated. The "externality" is external not only to price but also to the record of economic coordination.

The purpose of this paper is to propose a way to change that record. We need economic information systems that make ecological effects visible without forcing nature into categories that distort it. The challenge is not simply to attach a price to nature, nor to declare nature a person, nor to create more reports. The challenge is to represent natural systems as entities around which economic activity, ecological monitoring, and adaptive governance can be coordinated on-ledger.

---



## 2. Why Existing Categories Are Not Enough

Several traditions already make nature visible, and this paper builds on them. Ecosystem-services research showed that human economies depend on functions that ecosystems perform: water purification, pollination, flood regulation, soil formation, climate regulation, and much more (Daily, 1997; Costanza et al., 1997). The UN System of Environmental-Economic Accounting—Ecosystem Accounting (SEEA EA), adopted in 2021, provides a robust framework for ecosystem extent, condition, and service flows (United Nations et al., 2021). 

Ecological economics adds the warning that the economic process is embedded in a finite, entropy-bound biosphere (Georgescu-Roegen, 1971; Daly, 1977/1991). Yet most of this work remains descriptive; accounts inform policy, but the policy remains outside the accounting object. The account does not itself condition future economic events at the ledger level.

Commons governance gives us another crucial foundation. Ostrom showed that communities can govern common-pool resources without defaulting to either privatization or centralized command (Ostrom, 1990). Her social-ecological systems (SES) work distinguishes resource systems (forest, fishery) from resource units (timber, fish) (Ostrom, 2009). But in SES theory, the resource system is primarily an analytical object. It is not an executable object inside an economic information system. It does not itself receive economic events, accumulate a ledger, or carry machine-readable governance rules.

Rights of Nature and ecological personhood respond to these failures by declaring rivers or forests to be legal persons (e.g., the Whanganui River in New Zealand; Te Awa Tupua Act, 2017). These are serious legal innovations, yet legal personhood is not the same as economic ontology. A river does not deliberate, commit, form intentions, or bear responsibility. Its legal powers must be exercised by human representatives, creating a proxy-power bottleneck prone to capture.

Event-based economic ontologies such as REA (McCarthy, 1982) and ValueFlows bring us closest to implementation, representing resources, events, agents, commitments, and claims in shared data environments. But if we try to model nature using only Agent and Resource, we hit a boundary.

---



## 3. Agent, Resource, Source



### 3.1 The Thick vs. Thin Definition of Agency

A major barrier to resolving nature’s representation in economic software is a definitional mismatch. In abstract modeling, systems dynamics, and agent-based modeling (ABM), "agency" is often defined **thinly**: an agent is simply any computational entity possessing an assigned behavioral rule (Tesfatsion, 2006). Under this thin definition, a river, a microbial community, or a weather pattern can be modeled as an agent. The "intention" or "rule" is merely a mathematical function decided by the modeler to run simulations or generate forecasts.

However, when an economic ontology is used to build *real-world participatory systems*—such as peer-to-peer economic networks, supply chains, or shared ledgers executing smart contracts and covenants—the definition of Agent **thickens** and collides with legal, social, and civic agency. In these trans-domain platforms, an **Agent** is an entity that:

- possesses a persistent identity,
- can cryptographically sign agreements,
- can initiate and accept commitments (promises of future action),
- can deliberate and make intentional choices, and
- can be held accountable and liable under community dispute resolution or legal frameworks.

When economic transactions and legal/governance contracts merge in the same software ledger (as is common in decentralized web3 or Holochain architectures), applying a "thin" modeling shortcut like *river-as-agent* in a "thick" execution environment introduces severe contradictions:

1. **The Representation Loophole:** Because the river cannot log into a device, write to a source chain, or sign a transaction, human proxies or committees must act and commit "on its behalf." This concentrates immense, un-auditable power in the hands of the proxy, who can represent their own political or commercial interests as "what the river decided."
2. **The Liability Paradox:** If a river is modeled as an agent with standing, it must also be liable for its actions. If the Ganges floods a field or destroys a village, can the river be sued or punished? When courts in India declared rivers as legal persons, the ruling was quickly stayed because the nominated human guardians refused to accept legal liability for the river's floods.

To maintain semantic and trans-domain integrity, we must restrict **Agent** to entities capable of human-scale decision-making, cryptographic commitment, and accountability (individuals, cooperatives, organizations, networks, or clearly bounded software bots with human operators).

### 3.2 The Limits of Resources and Processes

If the river is not an Agent, can it be modeled as a Resource or a Process?

An **Economic Resource** is an appropriable, inventoriable, and measurable output of human or natural activity. Once water is pumped into a tank, timber is cut, or fish are landed, they are Resources. They are finite, rivalrous, can be held in custody by a custodian, and can have an owner. A river or a watershed is not an inventoriable resource; treating it as such requires assigning an owner or primary accountable agent, which is fundamentally incompatible with a commons or nondominium property regime.

A **Process** in event-centric ontologies defines a bounded, intentional economic transformation (a recipe) with planned inputs, outputs, and start/end dates, carried out by agents (e.g., a manufacturing run). A river is not an intentional economic process. Attempting to model a river as a Process requires:

- representing a process with no beginning or end date,
- representing a process running on itself for its own cause without human agents, and
- representing an infinite recursive cascade of feedback loops (processes of processes) with completely unknown inputs and outputs.

Furthermore, a process is event-centric, whereas ecological stewardship is **state-centric**. We need to track the persistent condition and health of the river over time, not just the individual events that pass through it.

### 3.3 The Source Primitive

The missing primitive is **Source**.

A **Source** is a generative, non-ownable, partially unknowable system that yields resources, receives ecological effects, conditions future economic possibilities, and accumulates the historical ledger required for its own stewardship. It is the resource-system counterpart to Ostrom’s resource-units.

```
+-----------------------------------------------------------------------+
|                                AGENT                                  |
|            Acts, intends, commits, and bears responsibility           |
|            (Individuals, Cooperatives, Organizations, Bots)           |
+-----------------------------------+-----------------------------------+
                                    |
                    Boundary Events | (Extract, Discharge, Restore)
                                    v
+-----------------------------------------------------------------------+
|                                SOURCE                                 |
|            Generative system; lacks intention and ownership           |
|            (Watershed, River, Forest, Knowledge Commons)              |
+-----------------------------------+-----------------------------------+
                                    |
                                    | Yields
                                    v
+-----------------------------------------------------------------------+
|                               RESOURCE                                |
|            Appropriable, inventoriable, and measureable units          |
|            (Water m³, Timber logs, Landed fish, CAD Files)            |
+-----------------------------------------------------------------------+
```

By introducing Source as a first-class ontological primitive, we establish a clean separation of roles:

- **The Source** remains a passive, ledger-bearing ecological anchor that represents the natural boundary. It has no agency, cannot commit, cannot be sued, and cannot be owned.
- **The Stewards** are real Agents (organizations, councils, or individuals) who hold explicit, auditable obligations to monitor the Source, interpret its condition, and adjust its access rules.
- **The Resources** are the actual units harvested or extracted from the Source, which can then flow through standard economic processes.

---



## 4. Complexity And The Black-Box Principle

The Source primitive is not only an ontological proposal; it also carries a crucial epistemological and cybernetic stance.

Watersheds, forests, fisheries, soils, and atmospheres are complex systems. They are characterized by non-linear relationships, multi-scalar feedback loops, path dependency, and the capacity for sudden regime shifts (Holling, 1973; Gunderson & Holling, 2002). They are partially knowable but fundamentally unpredictable.

Traditional modern planning often assumes that to govern an ecosystem, we must construct a complete, detailed model of its interior. This overconfidence leads to what can be called the *tyranny of the model* (Scott, 1998): a centralized, simplified representation of nature is codified into rules, and when nature behaves unexpectedly, the model's rigid constraints cause catastrophic failures or ecological collapse. Centralizing the representation of a complex system inside a single "atmosphere-agent" or "river-agent" that automatically computes and triggers actions assumes a level of predictive omniscience we do not possess.

The Source-NDO operationalizes W. Ross Ashby's **black-box principle** (Ashby, 1956). We acknowledge that the interior of the ecological system is complex and opaque. Instead of trying to model its entire internal dynamics, we govern the **boundary** where human economic activity interacts with it. We record boundary inputs and outputs (extractions, discharges, restoration work) and observe peripheral condition signals (water quality, flow rate, species diversity index).

Stewardship then proceeds not through a static, pre-programmed engineering model, but through a disciplined, adaptive cybernetic loop:

1. **Sensing:** Economic boundary events are recorded on the Source's ledger alongside sensor and qualitative condition signals.
2. **Deliberation:** Human agents, local organizations, and scientific/indigenous experts interpret these signals, bringing a variety of competing models and situated knowledge to bear.
3. **Adaptation:** Based on this collective interpretation, stewards revise the quantitative access rules (affordances) and thresholds attached to the Source.
4. **Conditioning:** These updated rules programmatically condition or restrict future boundary events.

This black-box approach shifts our focus from predictive control to distributed, polycentric sensemaking (Folke et al., 2005). It accommodates both scientific data and qualitative, localized, and indigenous observations without flattening them into a single technical schema.

---



## 5. A River Case

To understand why this ontological separation is necessary, let us analyze a watershed commons using Occam's razor.

Consider a river basin with multiple conflicting actors:

- An agricultural cooperative (**AgriCoop**) abstracts water for irrigation and contributes nutrient runoff.
- A mining company (**MiningCo**) consumes water and discharges heavy-metal effluent.
- A hydro dam (**HydroDam**) uses flow non-consumptively but alters downstream flow timing and sediment.
- A fishing guild (**FisherGuild**) extracts fish from the river.
- A forestry operation (**ForestryOp**) logs trees in the watershed, altering runoff stability.
- A regeneration collective (**RegenCollective**) restores riparian forests and wetlands.
- A municipal utility (**CityUtility**) downstream requires clean drinking water.



### 5.1 The Failures of the Two-Primitive Model

If we attempt to represent this scenario using only the standard REA/ValueFlows primitives (Agent and Resource), we are forced to commit three active fictions and leave four critical relationships inexpressible:

#### 1. The Fiction of False Ownership

To record that AgriCoop withdrew water from the river, the river must be represented as an `EconomicResource`. In any standard ledger, a resource carries a `primaryAccountable` custodian or owner. Representing the river as owned or controlled by a "Steward organization" codifies dominium in the ledger, violating the core principle of a nondominium property regime.

#### 2. The Fiction of Resource-from-Nowhere

To avoid false ownership, we might omit the river entirely. Abstraction then appears as a `raise` event: water simply "appears" or "is found" in AgriCoop's private stock. But this means the river is never debited. The depletion of the watershed vanishes from the economic ledger, making sustainability metrics mathematically impossible to compute within the transaction record.

#### 3. The Contradiction of Dual-Typing

When MiningCo discharges heavy metals, the river is the receiver. But as a passive Resource, the river cannot be the "receiver" of an event in standard REA, because the receiver must be an Agent. To make this work, the modeler must type the river as an `EcologicalAgent`. Now, the exact same entity is represented as a Resource for AgriCoop's extraction, and as an Agent for MiningCo's pollution. This dual-typing breaks the mathematical and logical consistency of the ontology.

#### 4. The Inexpressible Residues

Without a Source primitive, we cannot represent:

- **Source Hierarchies:** The parent watershed yields the river, which yields water resources.
- **Cross-Source Coupling:** The forest conditions the river. If ForestryOp cuts trees, the River's flow resilience is directly debited through structural links, not human transactions.
- **Reflexive Loops:** The event ledger on the river is disconnected from the rules governing access to it.



### 5.2 The Source-NDO Representation

The Source primitive resolves these distortions. Extraction is recorded honestly with the Source as the provider:

```text
EconomicEvent:
  action: extract
  provider: River (Source)
  receiver: AgriCoop (Agent)
  resourceQuantity: 10,000 m³ water
```

The river's stock is debited as a Source, without assigning ownership. Pollution is recorded with the Source as the receiver:

```text
EconomicEvent:
  action: produce/discharge
  provider: MiningCo (Agent)
  receiver: River (Source)
  resourceQuantity: 50 kg heavy metals
```

RegenCollective's work is recorded as a direct improvement of the Source's state:

```text
EconomicEvent:
  action: raise
  provider: RegenCollective (Agent)
  target: Forest (Source)
  resourceQuantity: 1,000 trees
```



### 5.3 Occam's Razor: Fewer Primitives vs. Fewer Fictions

Ontology design is guided by Occam's razor: minimize unnecessary concepts. However, Occam's razor is often misapplied to mean simply counting the total number of words in an ontology's glossary. 

The true test of parsimony is whether the ontology minimizes the overall complexity of the represented system. Refusing to add the Source primitive keeps the ontology's glossary small, but it multiplies ad-hoc fictions and workarounds in our software code (smuggling non-ownership rules into agents, overloading resource fields, and creating custom translation layers).

Adding **one** primitive (`Source`) eliminates **three fictions** and **four residues**. By committing to a third category that aligns with Ostrom's resource-systems, the data model becomes structurally cleaner, more type-safe, and infinitely easier to maintain across different software implementations.

---



## 6. From Visibility To Stewardship

A ledger that merely records degradation is a passive archive. The Source-NDO connects the transaction ledger directly to programmatically enforced governance:

```text
boundary events ➔ ledger ➔ ecological interpretation ➔ governance rules ➔ access affordances ➔ future events
```

This loop avoids the power vacuum and representation trap that often derail environmental governance.

### 6.1 The Power-Capture and Laundering Traps

When a river or atmosphere is personified as an "agent" represented by a "guardian" or "stewardship committee," a dangerous conflation occurs. If the committee decides to increase LoggingCo's cutting quota, the decision is recorded as: "The River Agent committed to allow LoggingCo to cut 500 trees."

This creates two systemic pathologies:

1. **Laundering of Human Choices:** Political compromises, backroom negotiations, or commercial influences are laundered through the system as "the will of the river." The actual human actors are insulated from accountability.
2. **Ambiguity of Audit:** It becomes impossible to distinguish between checking the performance of the committee and checking the state of the river.

The Source-NDO resolves this by splitting the **Source (object of governance)** from the **Stewards (actors of governance)**:

- **The Source** maintains a passive ledger of events (how much was extracted, how much was discharged, what sensor readings landed).
- **The Stewards** (e.g., local water parliaments, polycentric water councils) are registered as **standard, accountable Agents**. Their decisions, rules, and validations are recorded as *their own* on-chain commitments. They can be audited, held liable, and voted out by the community if their rules fail to protect the Source's condition.

The river does not make promises; humans make promises *about* the river. By keeping the Source as a passive data-and-rule anchor, we ensure that checks, balances, and political negotiations remain fully visible and attributable to the humans who make them.

### 6.2 Polycentric Water Parliaments: A Pragmatic Context

This design is grounded in real-world environmental struggles. In countries like France, water governance has historically been managed through polycentric, local water councils or "water parliaments" (Comités de bassin and local commissions). These local and regional bodies are where the actual distributed power over water resources resides, allowing water users, local citizens, and environmental associations to coordinate.

However, this distributed power is frequently threatened by national governments or centralized utility platforms that seek to consolidate control over water systems, flattening local ecological realities into standardized administrative quotas.

The Source-NDO serves as an informational shield for these local parliaments. By registering a water basin or aquifer as an uncapturable, localized Source-NDO on a distributed ledger, the local community anchors the event ledger and access rules to the physical territory. It enables a polycentric governance model:

- Local sensor data and qualitative citizen-science observations are recorded directly to the Source's decentralized ledger.
- Local water councils adapt extraction rules dynamically based on these local signals.
- Central authorities or large commercial actors cannot unilaterally override or delete these rules because the ledger and its governance-operator are cryptographically distributed across the local nodes (nondominium).

---



## 7. Ecological Value Without Reducing Nature To Price

Because a Source is a persistent, non-ownable system, its value cannot be represented by a single market price or asset valuation. Doing so falls back into the commodification trap that the nondominium property regime is designed to resist. The IPBES Values Assessment emphasizes that nature carries a diverse vector of instrumental, intrinsic, and relational values that cannot be collapsed without immense loss of informational resolution (IPBES, 2022).

Furthermore, a Source possesses what ecological economists call *existential or systemic value*: if the source collapse (e.g., the Dust Bowl or the severe drying of major river systems like the Danube), all dependent economic activities vanish. The value of the Source is therefore not the sum of its extracted resources; it is the prerequisite for any resource flow to exist at all.

We propose representing ecological value as a **multi-dimensional value vector** attached to the Source's specification, including:

- **Sustenance:** The capacity to yield material resources (water, wood, fish, crops) and absorb organic effects.
- **Regeneration:** The capacity to recover condition, rebuild biomass, purify water, and sequester carbon.
- **Resilience:** The capacity to buffer shocks, resist degradation, and avoid catastrophic regime collapse.
- **Adaptive Capacity:** The structural and biological diversity that allows the system to organize into new viable states under disturbance.
- **Generative Capacity:** The systemic wealth that produces future ecological relations and economic affordances.
- **Commons Value:** The density and diversity of human and non-human agents whose survival and coordination depend on the Source as shared infrastructure.
- **Learning Value:** The volume of observations, localized knowledge, and governance iterations accumulated on the Source's ledger.

By maintaining this vector as an explicit, multi-dimensional signal, communities can evaluate their success not by "how much resource value was extracted," but by "how much generative capacity was maintained or enhanced."

---



## 8. Implementation: Source-NDO

The full usefulness of the Source primitive appears only when it is implemented inside an information infrastructure able to make a source persistent, uncapturable, governed, and accountable without making it owned. This is why Nondominium matters. Built on the agent-centric Holochain framework and using the ValueFlows vocabulary, Nondominium provides a standalone hApp where resources and sources can carry their own governance.

In the Nondominium architecture, this is achieved through five core mechanisms:

### 1. Permanent Layer 0 Identity

A Source-NDO begins with a Layer 0 `NondominiumIdentity` entry. This entry is published to a distributed hash table (DHT) and is immutable. Because there are no administrative keys, central servers, or platform databases, no single operator can delete the Source’s identity, and no steward can unilaterally convert it into private property. Its stable `action_hash` remains an uncapturable anchor for all time.

### 2. The `SourceProfile` Extension

To protect the immutability of the Layer 0 identity while allowing condition indicators to evolve, the system links the Layer 0 anchor to a mutable, versioned `SourceProfile` entry:

```rust
pub struct SourceProfile {
    pub ndo_identity_hash: ActionHash,    // Links to Layer 0 Identity
    pub source_type: SourceType,          // Hydrological, Biological, etc.
    pub regime_state: SourceRegimeState,  // Pristine, Stable, Stressed, etc.
    pub stewarded_by: Vec<AgentPubKey>,    // Accountable Stewards (Agents)
    pub current_stock: Option<f64>,
    pub flux_rate: Option<f64>,
    pub assimilation_capacity: Option<f64>,
    pub resilience: Option<f64>,
    pub tipping_threshold: Option<f64>,
    pub complex_interior: bool,           // Black-box flag
    pub last_condition_update: Timestamp,
}
```

This profile is updated **only** through governance-validated coordinator functions. Extracting or discharging agents cannot write directly to these condition fields; they are computed and updated by the governance operator when boundary events are validated.

### 3. Source-to-Source Coupling Links

Ecosystem coupling is represented through `SourceCouplingLink` entries on the DHT, establishing native structural relationships independent of human transactions:

- `Watershed --Yields--> River`
- `Forest --Conditions (0.68)--> River`

When a `Raise` event increases the condition of the Forest (e.g., reforestation), the governance operator automatically propagates a derived, weighted improvement (`delta * 0.68`) to the River's `flux_rate` and `resilience` indicators, making forest-river ecological coupling a native, verifiable accounting fact.

### 4. Governance-as-Operator

Nondominium separates the resource/data zome from the governance zome. Proposed state transitions on a Source (e.g., an AgriCoop water withdrawal request) are submitted as a `GovernanceTransitionRequest`. The governance zome evaluates the applicable `GovernanceRule` entries, verifies if the requesting agent's cumulative use matches current access affordances, and checks if the withdrawal would push `current_stock` below `tipping_threshold`. Only if the transition passes validation does the operator authorize the state update and record the `EconomicEvent`.

### 5. Private Participation Receipts (PPR)

All interactions generate bi-directional, cryptographically signed Private Participation Receipts stored as private entries on the agents' personal source chains. 
In ecological governance, this is a powerful shield. Sensitive data—such as exact locations of endangered species, indigenous sacred sites, or private land-use details—can remain fully private. At the same time, the agent can use zero-knowledge proofs to verify their compliance with stewardship obligations (e.g., proving "I completed five validated riparian restoration commitments" or "I submitted monthly water-quality monitoring data") without exposing the raw data, locations, or counterparties.

---



## 9. Limits And Risks

No technical primitive is a complete solution for wicked ecological crises. The Source-NDO carries distinct operational risks that must be managed:

### 9.1 The Problem of Measurement Quality

An adaptive governance loop is only as good as its inputs. If sensors are faulty, tampered with, or missing, the rule-operator will execute on corrupted signals. 

In Nondominium, this is mitigated by **peer-to-peer validation**. Data enters the ledger not as an absolute truth, but as an `EconomicEvent` or `ValidationReceipt` authored and signed by a specific agent. These events are auditable. If an actor submits fraudulent data, any peer (a local NGO, a neighbor, or a downstream utility) can raise a red flag. Because the history is transparent and immutable, fraudulent reporting severely impacts the actor's PPR-based reputation score, directly restricting their future access affordances.

### 9.2 The Challenge of Governance Legitimacy

Who decides which ecological models are used to set thresholds? Who has the authority to revise the rules? 

We align with the principles of **cosmolocalism** (Berkes, 2012): while the technical protocol and ecological knowledge can be shared globally, the actual decision-making authority must rest with the local stewards and water parliaments who inhabit the territory. The credentialing and roles (who is recognized as a qualified validator or steward) are managed at the local group DNA layer, preventing remote central governments or platforms from capturing the local rule-making process.

### 9.3 Greenwashing and Compliance Capture

There is a risk that highly sophisticated multinational corporations adopt Source-NDO tracking simply to legitimize extraction: "We recorded our pollution perfectly on-chain, therefore we are a sustainable business." 

This is prevented because in Nondominium, the ledger is not merely a reporting tool. The **governance-as-operator** pattern means the access rules are hard-wired into the DHT: if MiningCo's cumulative discharges hit the Source's `assimilation_capacity` threshold, the software operator programmatically **blocks** their subsequent extraction requests. The ledger is an active gatekeeper, not a passive disclosure sheet.

---



## 10. Conclusion

Economic information systems have long struggled to represent nature without distorting it. When nature is squeezed into our existing categories, it is either reduced to an owned, commodified resource, or personified as a fictitious agent whose legal or political representation invites capture and laundering.

The Source primitive offers another path. A Source is a generative, non-ownable, partially unknowable system. Implemented as a Source-NDO on Nondominium, it allows a river, forest, wetland, fishery, or watershed to become a ledger-bearing, rule-enforcing governance object without becoming property and without pretending to be a person.

The paradigm shift is simple but deep. The economy is not merely a closed, circular flow of exchange between human agents. It is structurally embedded in a wider network of generative ecological sources. By bringing these sources onto the ledger as first-class, uncapturable entities, we can move our economic coordination from a logic of extraction to a cybernetic loop of adaptive stewardship.

The defining economic question is no longer: "how much value was extracted?" It is: **"how much generative capacity was maintained, enhanced, or degraded?"**

---



## References

- Ashby, W. R. (1956). *An Introduction to Cybernetics*. Chapman & Hall.
- ARIES for SEEA. (n.d.). *ARIES for SEEA Explorer*. Integrated Modelling Partnership / United Nations.
- Berkes, F. (2012). *Sacred Ecology* (3rd ed.). Routledge.
- Bowker, G. C., & Star, S. L. (1999). *Sorting Things Out: Classification and Its Consequences*. MIT Press.
- Coase, R. H. (1960). The problem of social cost. *Journal of Law and Economics*, 3, 1-44.
- Costanza, R. (2000). Social goals and the valuation of ecosystem services. *Ecosystems*, 3, 4-10.
- Costanza, R., d'Arge, R., de Groot, R., et al. (1997). The value of the world's ecosystem services and natural capital. *Nature*, 387, 253-260.
- Costanza, R., et al. (2020). Valuing natural capital and ecosystem services toward the goals of efficiency, fairness, and sustainability. *Ecosystem Services*, 43, 101096.
- Daily, G. C. (Ed.). (1997). *Nature's Services: Societal Dependence on Natural Ecosystems*. Island Press.
- Daly, H. E. (1977/1991). *Steady-State Economics*. W. H. Freeman / Island Press.
- Folke, C., Hahn, T., Olsson, P., & Norberg, J. (2005). Adaptive governance of social-ecological systems. *Annual Review of Environment and Resources*, 30, 441-473.
- Georgescu-Roegen, N. (1971). *The Entropy Law and the Economic Process*. Harvard University Press.
- Gunderson, L. H., & Holling, C. S. (Eds.). (2002). *Panarchy: Understanding Transformations in Human and Natural Systems*. Island Press.
- Holling, C. S. (1973). Resilience and stability of ecological systems. *Annual Review of Ecology and Systematics*, 4, 1-23.
- IPBES. (2022). *Methodological Assessment Report on the Diverse Values and Valuation of Nature*. IPBES Secretariat.
- McCarthy, W. E. (1982). The REA accounting model: A generalized framework for accounting systems in a shared data environment. *The Accounting Review*, 57(3), 554-578.
- Ostrom, E. (1990). *Governing the Commons*. Cambridge University Press.
- Ostrom, E. (2009). A general framework for analyzing sustainability of social-ecological systems. *Science*, 325(5939), 419-422.
- Pigou, A. C. (1920/1932). *The Economics of Welfare*. Macmillan.
- Scott, J. C. (1998). *Seeing Like a State*. Yale University Press.
- Snowden, D. J., & Boone, M. E. (2007). A leader's framework for decision making. *Harvard Business Review*, 85(11), 68-76.
- Te Awa Tupua (Whanganui River Claims Settlement) Act 2017 (NZ).
- TEEB. (2010). *The Economics of Ecosystems and Biodiversity: Mainstreaming the Economics of Nature*.
- United Nations et al. (2021). *System of Environmental-Economic Accounting—Ecosystem Accounting (SEEA EA)*.
- ValueFlows. (n.d.). *ValueFlows specification*. [https://www.valueflo.ws/](https://www.valueflo.ws/)

---



## Appendix: Human-AI Collaboration Summary

This paper was produced through a human-AI collaboration in which the human author (Tiberius Brastaviceanu) retained the primary role in goal definition, conceptual direction, normative judgment, and final authorship authority. This division follows the collaboration framework developed at Sensorica, where AI is treated as strongest in search, aggregation, summarization, pattern expansion, drafting, and procedural workflow support, while human contribution remains central in value framing, meaning-making, contextual reframing, ethical boundary setting, responsibility, creative direction, and final approval.

The collaboration unfolded in three broad phases: brainstorming, structuring and planning the paper, and text improvement/refinement.

In the brainstorming phase, the human author introduced the idea of **Source** as a new primitive alongside Resource and Agent, and framed Source as a complex system. The human author also made the first observation that treating a river either as a resource or as an agent creates a category error. The intuition and initial argument against nature-as-agent also came from the human author, including the comparison between personifying nature and treating corporations as persons. AI later helped substantiate and expand this argument.

This brainstorming phase drew on the humans' experience with the OVN model and with development of the Nondominium hApp. The human author identified the governance layer of Nondominium as the place where ecological complexity could enter the system: not by claiming complete knowledge of an ecosystem's interior, but through policy that adapts from peripheral data, source-condition signals, and information acquired through economic events. The human author also explicitly introduced the black-box idea for complex ecological systems; AI later helped find relevant references from cybernetics, complexity science, resilience theory, and adaptive governance to support that intuition. The discussion of value depended on Sensorica's definition of value in the OVN wiki, which reflects the network's collective intelligence: value is relational and emerges through agents' experiences, needs, goals, and capacities, rather than residing as a property inside objects.

AI contributed pattern recognition, conceptual expansion, and first-pass theoretical scaffolding. It helped articulate the ecological value vector used in the paper: Sustenance, Regeneration, Resilience, Adaptive Capacity, Generative Capacity, Commons Value, and Learning Value. It also helped polish the critique of nature-as-agent: ecological systems generate effects but do not deliberate, intend, commit, feel harm, or bear moral responsibility. That exchange supplied important conceptual raw material, but the originating questions, domain constraints, value commitments, and direction of inquiry came from the human author and the prior human brainstorming.

In the structuring and planning phase of this paper, the human author provided a first layout with 3 interlocking structures: thematic, pragmatic and logical. He also explained the intended audience, specified that the paper should help environmental practitioners, economists, policy actors, activists, and related readers understand a paradigm shift, and asked for the planning and brainstorming material to remain intact. The human author chose the paper's practical goal: making externalities visible inside economic information systems so economic agents can steward natural sources and resources. The human author also set editorial constraints: keep the paper concise, preserve conceptual depth, use references and quotations for important claims, and keep the planning file available for later revision.

The AI contribution in this phase was to read and reorganize the planning material, strengthen the paper structure, improve the literature and prior-knowledge sections, validate and insert source anchors, and draft the paper. The AI synthesized the human-provided concepts into a more coherent essay structure: externalities as information failure; limits of existing categories; Agent, Resource, and Source; complexity and the black-box principle; a worked river case; the visibility-to-stewardship governance loop; ecological value without reduction to price; implementation as Source-NDO; and limits and risks. The AI also added references and performed coherence and diagnostic checks.

In the text improvement and refinement phase, the human author evaluated the draft and identified a weak point in the implementation section. The human author clarified that the full power of the Source primitive only becomes visible in the context of the Nondominium hApp, and supplied the architectural concepts that needed to be made explicit: organization-agnostic NDOs on the DHT, uncapturable commons and nondominium property regimes, NDO-embedded governance, governance-as-operator, the evolution of governance as a separate module, and Private Participation Receipts as a flexible privacy/accountability mechanism. The human author also connected these concepts back to the black-box ecological model: stewards use peripheral data and economic-event information to steer a complex source toward sustainable states without pretending to fully know its interior.

In the second revision of this paper (resulting in Version 2), the collaboration was expanded to address and resolve a comprehensive body of peer critiques from domain specialists in ValueFlows, agent-based computational economics, stock-flow consistent modeling, and commons governance. The human author directed the AI to address core objections regarding the "thin vs. thick" definition of agency, the limits of representing natural systems as processes, the risk of power-capture and accountability laundering under proxy-based legal representation (such as "river guardians"), and the exact data relationships that make the Source primitive distinct and executable inside the Nondominium/ValueFlows ledger. The AI analyzed the peer comment threads, extracted the underlying ontological and socio-political tensions, and re-drafted the paper to preemptively answer these objections. The resulting text reframes the Source-NDO not as a metaphysical claim about nature, but as a pragmatic, trans-domain informational standard that keeps human stewards explicitly accountable for their choices while preserving the uncapturable, persistent identity of the natural commons.