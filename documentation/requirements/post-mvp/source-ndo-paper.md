# Source-NDO: Making Nature Visible in Economic Information Systems

## Abstract

Ecological degradation is usually described as a policy failure, a market failure, or a moral failure. It is also an information-system failure. Many effects of economic activity are called "externalities" because they do not appear inside the transaction record that coordinates economic agents. Pollution, depletion, regeneration, and ecological condition are often measured elsewhere, after the fact, by regulators, scientists, or affected communities. This paper proposes a new economic-information primitive, the **Source**, implemented as a **Source-NDO**: a generative, non-ownable, partially unknowable ecological system whose boundary events can be recorded, whose condition can be sensed, and whose access rules can adapt through stewardship governance. The Source is neither an Agent nor a Resource. A river does not deliberate or bear responsibility like an agent, but it is also not merely an owned stock of water. It is a generative system that yields resources, receives ecological effects, conditions other sources, and makes future economic activity possible. By extending event-based economic ontologies such as REA and ValueFlows with this primitive, externalities can become first-class economic events without reducing nature to property, capital, or legal personhood.

## 1. Externalities As Information Failure

Economic activity changes ecological systems. Farms withdraw water and release nutrients. Mines consume water and discharge heavy metals. Dams use river flow without consuming it but alter timing, sediment, and downstream access. Forest operations remove trees and change infiltration, erosion, and biodiversity. Restoration groups replant riparian zones, rebuild wetlands, and improve the regenerative capacity of the watershed. These acts are economic, but the ecological effects are often not recorded in the same information system that records the transaction.

The classical language for this problem is externality. Pigou framed it as a divergence between private and social net product: economic actors are interested in the private result of their operations, while some benefits or harms fall on others without compensation (Pigou, 1920/1932). Coase later reframed the problem through rights, reciprocal harm, and transaction costs, insisting that institutions matter because real parties do not bargain in a frictionless world (Coase, 1960). Both traditions remain useful. But both leave open a prior question: where, in the economic information system, does the ecological effect appear?

If a factory sells a product, the sale appears in accounting. If a farm buys water rights, the contract appears. If a city utility pays for treatment, the cost appears. But the river's changing assimilation capacity, the wetland's reduced flood-buffering capacity, or the forest's effect on downstream flow may appear only in environmental reports, scientific models, or public controversy. The economic ledger and the ecological ledger are separated. The "externality" is external not only to price but also to the record of economic coordination.

The purpose of this paper is to propose a way to change that record. We need economic information systems that make ecological effects visible without forcing nature into categories that distort it. The challenge is not simply to attach a price to nature, nor to declare nature a person, nor to create more reports. The challenge is to represent natural systems as entities around which economic activity, ecological monitoring, and adaptive governance can be coordinated.

## 2. Why Existing Categories Are Not Enough

Several traditions already make nature visible, and this paper builds on them. Ecosystem-services research showed that human economies depend on functions that ecosystems perform: water purification, pollination, flood regulation, soil formation, climate regulation, and much more. Daily's *Nature's Services* helped consolidate this framing (Daily, 1997), and Costanza et al. famously estimated the value of global ecosystem services and natural capital in *Nature* (Costanza et al., 1997). The Millennium Ecosystem Assessment and TEEB brought ecosystem services into policy language. The UN System of Environmental-Economic Accounting--Ecosystem Accounting (SEEA EA), adopted by the UN Statistical Commission in 2021, now provides the strongest official accounting framework for ecosystem extent, condition, physical service flows, monetary service flows, and ecosystem assets (United Nations et al., 2021).

Ecological economics adds a deeper warning. Georgescu-Roegen argued that the economic process is embedded in the entropy-bound material world, not in a closed circular flow of exchange (Georgescu-Roegen, 1971). Daly later framed the economy as a subsystem of a finite biosphere and emphasized throughput limits (Daly, 1977/1991). These traditions make clear that ecological systems are not optional background conditions. They are the generative basis and sink environment of economic life.

This is important work. It makes nature visible to economics and policy. Yet most of it remains descriptive. SEEA EA can tell us how ecosystem extent and condition are changing, and ARIES for SEEA can help compile ecosystem accounts through semantic modeling and data integration. But an account is not yet a governance object. It does not itself condition future economic events. It does not say: this mine can discharge only this much this month; this farm's abstraction is reduced because upstream forest loss has lowered flow resilience; this restoration work increases future access capacity. The account informs policy, but the policy remains outside the accounting object.

Commons governance gives us another crucial foundation. Ostrom showed that communities can govern common-pool resources without defaulting to either privatization or centralized command. Her design principles emphasize clear boundaries, monitoring, graduated sanctions, conflict-resolution mechanisms, and nested institutions (Ostrom, 1990). Later social-ecological systems (SES) work distinguishes resource systems, resource units, governance systems, and users (Ostrom, 2009). This distinction is close to the one we need. A forest is not the same as timber; a fishery is not the same as fish; a watershed is not the same as gallons of water.

But in SES theory, the resource system is primarily an analytical object. Researchers and practitioners use it to diagnose sustainability. It is not usually an executable object inside an economic information system. It does not itself receive economic events, accumulate a ledger, or carry machine-readable governance rules.

Rights of Nature and ecological personhood respond to a related failure. Ecuador's Constitution recognizes the rights of nature, or Pacha Mama, including respect for existence and the maintenance and regeneration of life cycles. The Te Awa Tupua Act declares the Whanganui River a legal person: "Te Awa Tupua is a legal person and has all the rights, powers, duties, and liabilities of a legal person" (Te Awa Tupua Act, 2017, s. 14). These are serious legal innovations. They emerge from real failures of property law and environmental regulation, and they should be treated with respect.

Yet legal personhood is not the same as economic ontology. A river does not deliberate, commit, form intentions, or bear responsibility. Its legal powers must be exercised by human representatives. That may be practical in law, but it creates problems if imported directly into economic information systems. The risk is a category error: nature is not merely a resource to be consumed, but it is also not an agent in the same sense as a person, cooperative, firm, or state.

Event-based economic ontologies such as REA and ValueFlows bring us closer to implementation. McCarthy's REA model shifted accounting toward Resources, Events, and Agents as economic primitives in shared data environments (McCarthy, 1982). ValueFlows extends this style of modeling for open and networked economic coordination. It can represent economic resources, economic events, agents, commitments, claims, processes, and resource specifications. This is exactly the kind of infrastructure needed for commons-oriented economic systems.

But if we try to model nature using only Agent and Resource, we hit a boundary. A river is not honestly an owned economic resource, and it is not honestly an agent. Something is missing.

## 3. Agent, Resource, Source

The missing primitive is **Source**.

An **Agent** is an entity that can act, intend, commit, deliberate, accept obligations, and bear responsibility. In economic information systems, agents can be individuals, organizations, networks, cooperatives, and perhaps delegated artificial agents whose scope and operator are declared. The crucial point is agency: the ability to participate in commitments and governance.

A **Resource** is an appropriable or inventoriable output used in economic processes: water abstracted into a tank, timber cut into planks, fish landed at a dock, electricity delivered to a meter, data stored in a repository, or a tool held in custody. Resource accounting is necessary. Once water is abstracted, fish are caught, or timber is cut, those things can be counted, transferred, consumed, used, or transformed.

A **Source** is different. A source is a generative system that yields resources, absorbs effects, conditions future possibilities, regenerates or degrades, and interacts with other sources. A watershed yields river flow; a forest conditions infiltration, biodiversity, and soil stability; a wetland absorbs flood peaks and pollutants; a fishery yields fish only if its biological regime remains viable. A source is not merely a stock behind a flow. It is a complex system whose generative capacity makes economic activity possible.

The Source category avoids two reductions. It avoids reducing nature to a Resource, which frames the river mainly as inventory or service flow. It also avoids reducing nature to an Agent, which imports intention where there is none. A river can provide water, receive pollution, condition fish populations, and alter economic possibilities. But it does not negotiate, promise, consent, or take responsibility. The Source is therefore a third category: neither resource nor person, neither property nor agent, but a generative ecological entity around which stewardship can be organized.

This may sound like a small terminological change, but classifications matter. Bowker and Star argue that classification systems and standards shape infrastructure, visibility, and power (Bowker & Star, 1999). If an information system has no category for a generative ecological source, certain relations remain invisible or must be represented through fictions. If it does have such a category, new forms of accounting and governance become possible.

## 4. Complexity And The Black-Box Principle

The Source primitive is not only an ontological proposal. It also carries an epistemological stance.

Watersheds, forests, fisheries, soils, and atmospheres are complex systems. Holling's work on ecological resilience challenged equilibrium-centered views of ecosystems and made persistence under disturbance central to ecological thinking (Holling, 1973). Panarchy extended this into cross-scale adaptive cycles (Gunderson & Holling, 2002). Adaptive governance literature emphasizes learning, bridging organizations, trust, and transformation under disturbance (Folke et al., 2005). These systems are partially knowable, nonlinear, path-dependent, multi-scalar, and capable of regime shifts.

The implication is not that we need infinite data before governing. It is the opposite. We must stop pretending that governance requires a complete model of the ecological interior.

Ashby's cybernetics gives us a useful language. Some systems are too large, inaccessible, or complex to inspect directly; they must be treated as black boxes whose behavior is studied through inputs, outputs, and responses (Ashby, 1956). Scott's critique of high-modernist planning gives the political warning: attempts to make nature and society legible for centralized control often simplify away the practical and ecological relations that matter (Scott, 1998). Cynefin gives the operational pattern: in complex domains one does not predict, plan, and control; one probes, senses, and responds (Snowden & Boone, 2007).

The Source-NDO adopts this stance. It does not try to model the full interior of a watershed. It records boundary events and condition signals. Trees cut, gallons abstracted, pollutants discharged, fish caught, wetlands restored, riparian buffers planted, sediment loads measured, biodiversity indicators updated. The governance object does not claim omniscience. It asks for a disciplined loop:

observe boundary events, sense source condition, interpret through science and situated knowledge, adapt governance rules, condition future access, and learn from the next round of events.

This is not a weakness of the model. It is the model's integrity. It refuses to reduce ecological complexity to false precision.

## 5. A River Case

Consider a watershed feeding a river. The river participates in a contested economic ecosystem. An agricultural cooperative abstracts water and contributes nutrient runoff. A city utility depends on clean water downstream. A mining company consumes water and discharges effluent. A hydro dam uses flow without consuming water but changes timing and sediment dynamics. Fishers extract fish. Tour operators use the river for recreation and transport. A forestry operation removes trees in the watershed, affecting infiltration and flow stability. A regeneration collective restores riparian zones and wetlands.

ValueFlows 1.0 can model many of the economic events well once the outputs have become resources. Water in the cooperative's tank is an EconomicResource. Fish landed by the fishing guild are EconomicResources. Timber cut into planks is an EconomicResource. Events such as use, consume, produce, transfer, work, and transport are useful and should be kept.

The problem is the river itself.

If the river is modeled as an EconomicResource, the system tends to ask who is primary accountable, who owns or controls the resource, or who bears the rights and responsibilities over it. In a nondominium regime, this is precisely the wrong move. The river is not owned by a steward organization. A steward may hold obligations, but stewardship is not dominium.

If the river is avoided as a resource, water abstraction may appear as a `raise` event in the receiver's inventory: water appears in AgriCoop's stock because it has been "found" or "raised." But then the river is not debited. Depletion disappears from the economic record.

Pollution creates another contradiction. If MiningCo discharges heavy metals, the river is the ecological receiver. But if the river is only a resource, it cannot receive an event in the way an agent can. If the river is typed as an ecological agent, then the system gives it agency it does not possess. The same entity is pushed into two incompatible categories: resource for extraction, agent for pollution.

The Source primitive removes these fictions. The event can be represented honestly:

```text
EconomicEvent:
  action: extract
  provider: River(Source)
  receiver: AgriCoop(Agent)
  quantity: 10000 m3 water
```

The river is debited as a source, not as an owned resource. Pollution can also be represented honestly:

```text
EconomicEvent:
  action: produce/discharge
  provider: MiningCo(Agent)
  receiver: River(Source)
  quantity: 50 kg heavy metals
```

Regeneration becomes visible:

```text
EconomicEvent:
  action: restore/raise
  provider: RegenCollective(Agent)
  target: RiparianForest(Source)
  result: improved infiltration and reduced sediment loading
```

Source-to-source coupling also becomes visible. The forest conditions the river. The wetland conditions flood buffering and water quality. The river conditions fish populations. The source web is not an external report; it becomes part of the accounting graph.

The result is more parsimonious than forcing nature into existing categories. Adding one primitive removes several fictions: false ownership, resource-from-nowhere, river-as-agent, missing source hierarchy, missing source coupling, and missing object-attached governance. Occam's razor does not merely count vocabulary terms. It asks whether the theory multiplies ad hoc assumptions. Here, the Source primitive adds one term but removes a much larger number of fictions.

## 6. From Visibility To Stewardship

Visibility alone is not enough. A report can say that a river is degraded while the next transaction proceeds unchanged. The Source-NDO proposal matters because it connects the event ledger to adaptive governance.

The loop is:

```text
events -> ledger -> ecological interpretation -> governance rules -> access affordances -> future events
```

Extraction becomes visible as an event from the Source to an Agent. Pollution becomes visible as an event from an Agent to the Source. Regeneration becomes visible as work that improves source condition or generative capacity. Cross-source coupling becomes visible when one source conditions another: forest loss lowers river resilience; wetland restoration increases flood buffering; biodiversity affects fishery stability.

Governance can then condition future access. If nutrient runoff exceeds thresholds, agricultural abstraction may require remediation commitments. If forest loss reduces infiltration, downstream water quotas may change. If restoration improves riparian condition, access constraints may adapt. If uncertainty is high, precautionary buffers can be increased. This is not static command-and-control. It is adaptive stewardship anchored in an object that accumulates its own history.

In this sense, the Source-NDO extends Ostrom into more complex ecological domains. Ostrom's commons governance gives us monitoring, sanctions, conflict resolution, and nested institutions. But many ecological systems are not merely complicated resource systems whose rules can be designed once from adequate knowledge. They are complex systems whose responses are uncertain and evolving. The Source-NDO treats rules as revisable governance attached to a source ledger.

## 7. Ecological Value Without Reducing Nature To Price

Because the paper proposes a new economic object, it must also be careful about value. The aim is not to replace the price of ecosystem services with another single number. The IPBES Values Assessment emphasizes the diverse values of nature, including instrumental, intrinsic, and relational values (IPBES, 2022). Costanza has also argued that valuation should be related not only to efficiency but also to fairness and sustainability (Costanza, 2000; Costanza et al., 2020).

In OVN terms, value is relational. It is not simply inside a thing. It emerges in relation to agents, needs, capacities, viability, goals, and future possibilities. A river does not "experience value." But the river has capacities that make value experiences possible for present and future agents. Therefore ecological value is best understood as the contribution of a Source to the maintenance, regeneration, resilience, adaptive capacity, and flourishing of socio-ecological systems.

This suggests a value vector rather than a single price:

Sustenance: water, food, materials, pollination, climate regulation.

Regeneration: soil formation, water purification, biomass recovery, carbon sequestration.

Resilience: buffering shocks, maintaining function under disturbance, avoiding regime collapse.

Adaptive capacity: diversity, connectivity, and the ability to discover new viable configurations.

Generative capacity: the ability to produce future resources, relations, opportunities, and meanings not yet known.

Commons value: the number and diversity of agents that depend on the source as shared infrastructure.

Learning value: observations, knowledge, models, and governance improvements generated through interaction with the source.

The key point is that ecological value is not exhausted by extracted resources. The central question becomes: how much generative capacity was maintained, enhanced, or degraded? That question is more appropriate for complex ecological sources than "how much value was extracted?"

## 8. Implementation: Source-NDO

The full usefulness of the Source primitive appears only when it is implemented inside an information infrastructure able to make a source persistent, uncapturable, governed, and accountable without making it owned. This is why Nondominium matters. The Nondominium hApp is built on Holochain and uses the ValueFlows vocabulary, but its distinctive contribution is not merely a new database schema. It is an architecture for organization-agnostic, governance-bearing objects on a distributed hash table (DHT).

In the current Nondominium design, an NDO begins with a Layer 0 identity anchor, `NondominiumIdentity`. This entry contains a name, initiator, property regime, resource nature, lifecycle stage, creation time, and description. Its action hash becomes the stable identifier of the object. In Holochain terms, this is not a record in a platform database controlled by an administrator; it is an entry on an agent-centric source chain, published and linked into the DHT for discovery. The object is found through DHT links and anchors, not through a central owner's table. This matters for commons and nondominium property regimes because the object is no longer dependent on one organization to continue existing. No platform operator can simply delete the source from a private database, and no single steward can convert its identity into private property by administrative command.

For a Source-NDO, this means a river, forest, wetland, watershed, or fishery can receive a persistent economic-information identity without becoming an asset owned by the organization that first registered it. The source can be discoverable, linkable, auditable, and governed while remaining organization-agnostic. This is the technical condition that makes nondominium more than a legal or moral declaration. The source becomes difficult to enclose because its identity, history, and governance relations are distributed across the network.

The second crucial feature is NDO-embedded governance. In Nondominium, governance rules are attached to the resource specification or, in the NDO model, to the object itself as it grows from identity to specification and process. Access and interaction rules are not merely external policies stored in a manual, a government database, or an organization's internal workflow. They become part of the object's operational surface. An agent does not simply ask a platform for permission to use a source; the agent interacts with an object whose rules travel with it.

For a Source-NDO, this is essential. A watershed cannot be governed well if every interaction is interpreted separately by disconnected institutions. The rules for abstraction, loading, remediation, monitoring, restoration, buffer requirements, or seasonal restrictions need to be attached to the source being affected. This gives the Source-NDO a kind of accessibility autonomy. It is not autonomous in the sense of having agency or intention. It is autonomous in the infrastructural sense that the conditions for access are bound to the object rather than to an owning organization.

The third feature is governance-as-operator. The Nondominium architecture separates the resource zome, which stores data, from the governance zome, which evaluates state transitions. In the specified pattern, a proposed transition is not applied directly. It is submitted as a governance transition request; the governance module evaluates applicable rules, checks permissions and constraints, and returns a governance result. Only then can state change and related economic events be recorded.

This separation is especially important for complex ecological sources. A Source-NDO should not change state merely because an agent writes a new value. If a river moves from "stable" to "stressed," if an extraction quota changes, or if a restoration event raises generative capacity, that change should be mediated by rules, evidence, and validation. Governance-as-operator turns the source from a passive record into a cybernetic object: events and observations feed into interpretation; interpretation updates rules or state; rules condition future events.

Because governance is a separate architectural module, it can evolve over time. This is where the black-box principle becomes operational. Stewards do not need to know the complete interior of the watershed. They acquire peripheral data: withdrawals, pollutant loads, sensor readings, fish counts, flood events, restoration work, seasonal variation, and local observations. Governance can then adapt around these signals. As the source ledger grows, stewards can revise thresholds, add monitoring obligations, change access rules, or introduce graduated sanctions. The governance module becomes the adaptive interface between the unknowable interior of the ecological system and the economic actions occurring at its boundary.

The fourth feature is the Private Participation Receipt system. PPRs are private, cryptographically signed participation records stored on agents' source chains. They extend ValueFlows claims with participation categories, performance metrics, signatures, counterparties, and resource references. This gives Nondominium a flexible relation between public exposure and private accountability.

For ecological governance, that flexibility is critical. Not every stewardship action or ecological interaction should be globally public in full detail. Some information may be sensitive: locations of endangered species, sacred sites, private land-use details, personal identities, or conflict records. At the same time, governance requires proof. Agents must be able to show that monitoring happened, that remediation work was completed, that a validator participated, that a custody or restoration obligation was fulfilled, or that a disputed event was recorded at a certain time. PPRs allow agents to secure evidence of their actions while preserving privacy by default.

This creates a powerful design space. Public policy or community governance may require some information to be publicly exposed: total withdrawals, aggregate pollutant loads, restoration events, or source-condition indicators. Other information may remain private but verifiable. In future implementations, zero-knowledge proofs can allow an agent to prove a claim about their private chain, such as "I completed five validated restoration commitments" or "this monitoring obligation was fulfilled by a qualified steward," without exposing all counterparties, notes, locations, or private records. PPRs therefore combine proof and accountability without forcing total transparency.

Taken together, these mechanisms explain why Source becomes powerful specifically in Nondominium. ValueFlows gives the event vocabulary. Holochain gives agent-centric DHT infrastructure. Nondominium adds organization-agnostic identity, uncapturable object persistence, embedded governance, governance-as-operator, and private-but-verifiable participation records. A Source-NDO is therefore not just a concept named in a paper. It is a candidate implementation pattern for ecological sources that must be stewarded without being owned, observed without being fully modeled, and governed without central platform control.

This combination is the paper's core contribution. Many traditions contain one part of it: commons governance, ecosystem accounting, event-based economic ontology, distributed infrastructure, and privacy-preserving accountability. Source-NDO composes them into an operational primitive for ecological-economic information systems.

## 9. Limits And Risks

The proposal must not be presented as a magic solution. Several risks are serious.

Measurement quality matters. Who produces ecological data? Are sensors trustworthy? How is uncertainty represented? What happens when data is missing, delayed, or contested? - P2P offers solutions, as it is focused on validation.

Governance legitimacy matters. Who interprets the ledger? Scientists, local communities, public agencies, indigenous authorities, resource users, or some combination? Who changes the rules? Who can challenge them? - Cosmolocalism provides answers, as knowledge remains global and decisionmaking rests with the locals.

Local and indigenous knowledge must not be extracted and flattened into a technical schema. Berkes' work on sacred ecology and traditional ecological knowledge is a reminder that stewardship knowledge is situated, relational, and often inseparable from culture and practice (Berkes, 2012). A Source-NDO should be able to receive qualitative, narrative, and community-validated signals without pretending all knowledge is sensor data.

Data sovereignty matters. Ecological data can expose communities, sacred sites, endangered species, or politically sensitive land-use conflicts. Visibility must be governed.

There is also a risk of green accounting capture. Better measurement can legitimize extraction if governance remains weak. A company might say: "we recorded the damage, therefore the activity is responsible."  - Source-NDO addresses this as it ties to access rules, obligations, and accountability, not only disclosure.

Finally, legal interoperability remains open. Source-NDOs would need to interact with public law, permits, rights-of-nature frameworks, commons agreements, indigenous jurisdiction, and existing environmental reporting systems. The proposal is infrastructural, not a replacement for law or politics.

## 10. Conclusion

Economic systems have long struggled to include nature without reducing it. Nature appears as resource, asset, service, cost, externality, protected area, or legal person. Each category reveals something and hides something. The Source primitive proposes another path.

A Source is a generative, non-ownable, partially unknowable system that yields resources, receives ecological effects, conditions future economic possibilities, and accumulates the evidence required for its own stewardship. A Source-NDO makes this primitive executable in an economic information system. It allows a river, forest, wetland, fishery, or watershed to become a ledger-bearing governance object without becoming property and without pretending to be a person.

The paradigm shift is simple but deep. The economy is not only a network of agents exchanging resources. It is embedded in a wider network of generative sources. If economic information systems cannot see those sources, externalities will remain structurally external. If they can see them, then extraction, pollution, regeneration, resilience, and adaptive capacity can become part of economic coordination. Moreover, if governance is attached to these sources as an operator, a gate for economic action, we can steward them. 

The next economic question is therefore not only: how much value was extracted? It is: how much generative capacity was maintained, enhanced, or degraded?

## References

Ashby, W. R. (1956). *An Introduction to Cybernetics*. Chapman & Hall.

ARIES for SEEA. (n.d.). *ARIES for SEEA Explorer*. Integrated Modelling Partnership / United Nations ecosystem accounting tooling.

Berkes, F. (2012). *Sacred Ecology* (3rd ed.). Routledge.

Bowker, G. C., & Star, S. L. (1999). *Sorting Things Out: Classification and Its Consequences*. MIT Press.

Coase, R. H. (1960). The problem of social cost. *Journal of Law and Economics*, 3, 1-44. [https://doi.org/10.1086/466560](https://doi.org/10.1086/466560)

Costanza, R. (2000). Social goals and the valuation of ecosystem services. *Ecosystems*, 3, 4-10.

Costanza, R., d'Arge, R., de Groot, R., et al. (1997). The value of the world's ecosystem services and natural capital. *Nature*, 387, 253-260. [https://doi.org/10.1038/387253a0](https://doi.org/10.1038/387253a0)

Costanza, R., et al. (2020). Valuing natural capital and ecosystem services toward the goals of efficiency, fairness, and sustainability. *Ecosystem Services*, 43, 101096.

Daily, G. C. (Ed.). (1997). *Nature's Services: Societal Dependence on Natural Ecosystems*. Island Press.

Daly, H. E. (1977/1991). *Steady-State Economics*. W. H. Freeman / Island Press.

Ecuador. (2008). *Constitution of the Republic of Ecuador*, Articles 71-74.

Folke, C., Hahn, T., Olsson, P., & Norberg, J. (2005). Adaptive governance of social-ecological systems. *Annual Review of Environment and Resources*, 30, 441-473. [https://doi.org/10.1146/annurev.energy.30.050504.144511](https://doi.org/10.1146/annurev.energy.30.050504.144511)

Geerts, G. L., & McCarthy, W. E. (2002). An ontological analysis of the economic primitives of the extended-REA enterprise information architecture. *International Journal of Accounting Information Systems*, 3(1), 1-16.

Georgescu-Roegen, N. (1971). *The Entropy Law and the Economic Process*. Harvard University Press.

Gunderson, L. H., & Holling, C. S. (Eds.). (2002). *Panarchy: Understanding Transformations in Human and Natural Systems*. Island Press.

Holling, C. S. (1973). Resilience and stability of ecological systems. *Annual Review of Ecology and Systematics*, 4, 1-23. [https://doi.org/10.1146/annurev.es.04.110173.000245](https://doi.org/10.1146/annurev.es.04.110173.000245)

IPBES. (2022). *Methodological Assessment Report on the Diverse Values and Valuation of Nature*. IPBES Secretariat.

McCarthy, W. E. (1982). The REA accounting model: A generalized framework for accounting systems in a shared data environment. *The Accounting Review*, 57(3), 554-578.

Millennium Ecosystem Assessment. (2005). *Ecosystems and Human Well-being: Synthesis*. Island Press.

Ostrom, E. (1990). *Governing the Commons*. Cambridge University Press.

Ostrom, E. (2009). A general framework for analyzing sustainability of social-ecological systems. *Science*, 325(5939), 419-422. [https://doi.org/10.1126/science.1172133](https://doi.org/10.1126/science.1172133)

Pigou, A. C. (1920/1932). *The Economics of Welfare*. Macmillan.

Scott, J. C. (1998). *Seeing Like a State*. Yale University Press.

Snowden, D. J., & Boone, M. E. (2007). A leader's framework for decision making. *Harvard Business Review*, 85(11), 68-76.

Star, S. L., & Ruhleder, K. (1996). Steps toward an ecology of infrastructure: Design and access for large information spaces. *Information Systems Research*, 7(1), 111-134. [https://doi.org/10.1287/isre.7.1.111](https://doi.org/10.1287/isre.7.1.111)

Te Awa Tupua (Whanganui River Claims Settlement) Act 2017 (NZ).

TEEB. (2010). *The Economics of Ecosystems and Biodiversity: Mainstreaming the Economics of Nature*.

United Nations et al. (2021). *System of Environmental-Economic Accounting--Ecosystem Accounting (SEEA EA)*.

ValueFlows. (n.d.). *ValueFlows specification*. [https://www.valueflo.ws/](https://www.valueflo.ws/)

## Appendix: Human-AI Collaboration Summary

This paper was produced through a human-AI collaboration in which the human author retained the primary role in goal definition, conceptual direction, normative judgment, and final authorship authority. The AI systems contributed retrieval, synthesis, structuring, drafting, and editorial support. This division follows the collaboration framework developed at Sensorica, where AI is treated as strongest in search, aggregation, summarization, pattern expansion, drafting, and procedural workflow support, while human contribution remains central in value framing, meaning-making, contextual reframing, ethical boundary setting, responsibility, creative direction, and final approval.

The collaboration unfolded in three broad phases: brainstorming, structuring and planning the paper, and text improvement/refinement.

In the brainstorming phase, the human author introduced the idea of **Source** as a new primitive alongside Resource and Agent, and framed Source as a complex system. The human author also made the first observation that treating a river either as a resource or as an agent creates a category error. The intuition and initial argument against nature-as-agent also came from the human author, including the comparison between personifying nature and treating corporations as persons. AI later helped substantiate and expand this argument.

This brainstorming phase drew on the humans' experience with the OVN model and with development of the Nondominium hApp. The human author identified the governance layer of Nondominium as the place where ecological complexity could enter the system: not by claiming complete knowledge of an ecosystem's interior, but through policy that adapts from peripheral data, source-condition signals, and information acquired through economic events. The human author also explicitly introduced the black-box idea for complex ecological systems; AI later helped find relevant references from cybernetics, complexity science, resilience theory, and adaptive governance to support that intuition. The discussion of value depended on Sensorica's definition of value in the OVN wiki, which reflects the network's collective intelligence: value is relational and emerges through agents' experiences, needs, goals, and capacities, rather than residing as a property inside objects.

AI contributed pattern recognition, conceptual expansion, and first-pass theoretical scaffolding. It helped articulate the ecological value vector used in the paper: Sustenance, Regeneration, Resilience, Adaptive Capacity, Generative Capacity, Commons Value, and Learning Value. It also helped polish the critique of nature-as-agent: ecological systems generate effects but do not deliberate, intend, commit, feel harm, or bear moral responsibility. That exchange supplied important conceptual raw material, but the originating questions, domain constraints, value commitments, and direction of inquiry came from the human author and the prior human brainstorming.

In the structuring and planning phase of this paper, the human author provided a first layout with 3 interlocking structures: thematic, pragmatic and logical. He also explained the intended audience, specified that the paper should help environmental practitioners, economists, policy actors, activists, and related readers understand a paradigm shift, and asked for the planning and brainstorming material to remain intact. The human author chose the paper's practical goal: making externalities visible inside economic information systems so economic agents can steward natural sources and resources. The human author also set editorial constraints: keep the paper concise, preserve conceptual depth, use references and quotations for important claims, and keep the planning file available for later revision.

The AI contribution in this phase was to read and reorganize the planning material, strengthen the paper structure, improve the literature and prior-knowledge sections, validate and insert source anchors, and draft the paper. The AI synthesized the human-provided concepts into a more coherent essay structure: externalities as information failure; limits of existing categories; Agent, Resource, and Source; complexity and the black-box principle; a worked river case; the visibility-to-stewardship governance loop; ecological value without reduction to price; implementation as Source-NDO; and limits and risks. The AI also added references and performed coherence and diagnostic checks.

In the text improvement and refinement phase, the human author evaluated the draft and identified a weak point in the implementation section. The human author clarified that the full power of the Source primitive only becomes visible in the context of the Nondominium hApp, and supplied the architectural concepts that needed to be made explicit: organization-agnostic NDOs on the DHT, uncapturable commons and nondominium property regimes, NDO-embedded governance, governance-as-operator, the evolution of governance as a separate module, and Private Participation Receipts as a flexible privacy/accountability mechanism. The human author also connected these concepts back to the black-box ecological model: stewards use peripheral data and economic-event information to steer a complex source toward sustainable states without pretending to fully know its interior.

The AI contribution in this refinement phase was to inspect the Nondominium documentation and codebase, verify the current implementation status and architectural claims, and rewrite the implementation section accordingly. This included distinguishing implemented features, such as the Layer 0 `NondominiumIdentity` DHT anchor and PPR data structures, from normative architectural targets such as full governance-as-operator lifecycle integration. AI then strengthened the prose so that the implementation section explained why Source-NDO is not merely a conceptual addition to ValueFlows, but an implementation pattern made powerful by Nondominium's DHT identity, embedded governance, adaptive governance module, and private-but-verifiable participation records.

The collaboration was therefore hybrid. The human author supplied the original problem, philosophical and political motivation, domain knowledge, conceptual constraints, and evaluative direction. AI systems supplied cognitive offloading: retrieval, condensation, comparison, structure generation, prose drafting, and consistency checking. The resulting paper should be read as human-directed and AI-assisted: the AI helped transform a complex body of prior thinking into a written form, but the central thesis, purpose, framing, and responsibility for use remain with the human author.