# Versioning (Post-MVP)

Versioning in Nondominium is about **variations of a Resource over time and across forks**, and about expressing **affiliations and evolutions** of both:

- **Material resources** (physical instances and their designs)
- **Digital resources** (software, documents, CAD, manifests)
- **The Nondominium hApp itself**, treated as a versioned Application Resource

This capability is explicitly **post-MVP / future development**. The first proof-of-concept will operate without full versioning semantics; these requirements describe how we want to extend the system later.

More on the OVN license: `https://github.com/Sensorica/ovn-license/tree/v2.0`  
More on the OVN model: `https://ovn.world/`

---

## 1. Goals & Scope

- **G1 – Unified Versioning Model**: Provide a single conceptual model that applies to:
  - Material resources (and their designs)
  - Digital resources (code, documentation, CAD, manifests)
  - The Nondominium hApp (application as a resource)

- **G2 – Affiliation & Evolution Graph**: Represent resource evolution as a **directed acyclic graph (DAG)** of versions, including:
  - Linear evolution (v1 → v2 → v3)
  - Forks (branches)
  - Merges (reconciling branches)
  - Special relations (repair, augmentation, porting to a platform)

- **G3 – OVN-Compliant Contribution Propagation**: Extend versioning beyond Git semantics to include:
  - Explicit tracking of who contributed to which version
  - Propagation of contribution value upstream in the version graph, in line with the OVN model and license.

- **G4 – Non-Breaking Addition**: Implement versioning as an additional layer on top of existing:
  - `EconomicResource` / `ResourceSpecification`
  - Digital Resource Integrity manifests
  - Governance and PPR system

---

## 2. High-Level Requirements

### 2.1 Versioned Entity Model

- **R-VERS-01 – Base Identity vs Version Nodes**  
  The system shall distinguish between:
  - A **base identity** (“Versioned Entity”) that persists through its versions
  - Individual **version nodes** that represent specific states or variants

- **R-VERS-02 – Common Model for All Resource Types**  
  The same versioning model shall support:
  - Material resource *instances* (e.g. “CNC #42”)
  - Material resource *designs* (specifications, assemblies)
  - Digital resources (software releases, CAD, documents)
  - Application-level resources (Nondominium hApp itself)

- **R-VERS-03 – DAG of Versions**  
  The system shall represent versions as nodes in a **DAG** (no cycles), supporting:
  - `Initial` versions
  - `EvolvedFrom` (linear changes)
  - `ForkedFrom` (branches)
  - `MergedFrom` (multiple parents)
  - `RepairedFrom`, `AugmentedFrom`, `PortedToPlatform`, etc.

### 2.2 Material Resources

- **R-VERS-MAT-01 – Structural Changes as Versions**  
  For material resources, the system shall create new version nodes when there are **structural or functional changes**, such as:
  - Significant repairs
  - Augmentations (e.g. a stool to which one adds a backrest)
  - Upgrades (e.g. new motor, new controller)

- **R-VERS-MAT-02 – Simple Updates vs Versions**  
  Non-structural updates (quantity, location, temporary states) shall continue to use existing `EconomicResourceUpdates` and **do not** create new version nodes.

- **R-VERS-MAT-03 – Instance vs Design**  
  The system shall distinguish:
  - Versioning of the **generic design** (`ResourceSpecification`)
  - Versioning of a **specific instance** (`EconomicResource`)
  and must be able to link both graphs when appropriate.

### 2.3 Digital Resources

- **R-VERS-DIG-01 – Manifest-Backed Versions**  
  Each digital resource version shall be associated with a **digital integrity manifest** (Merkle root, chunk hashes, etc.) as specified in the Digital Resource Integrity requirements.

- **R-VERS-DIG-02 – Git Alignment (Optional)**  
  When a resource is developed in Git or a similar VCS, the versioning model shall be able to:
  - Store a reference to the Git commit/tag
  - Use Git semantics (branches, merges) as hints for version DAG construction

- **R-VERS-DIG-03 – Composite Digital Resources**  
  The system shall support **composite digital resources** whose versions depend on versions of sub-resources (libraries, modules, CAD sub-assemblies), aligning with the fractal/composable architecture.

### 2.4 Nondominium hApp as a Resource

- **R-VERS-APP-01 – Application as Versioned Entity**  
  The Nondominium hApp shall be modeled as a **Versioned Entity** of type “Application”, with:
  - A base identity (“Nondominium hApp”)
  - A set of `ResourceVersion` nodes representing releases (e.g. `v1.0.0`, `v2.0.0-org`).

- **R-VERS-APP-02 – Release Versioning**  
  Each release version of the hApp shall:
  - Reference its **hApp manifest** and/or DNA/Web hApp bundles
  - Have a semantic version label (e.g. `v1.3.0-org`)
  - Be linked via `EvolvedFrom`, `ForkedFrom`, etc. to previous versions

- **R-VERS-APP-03 – Forks & Flavors**  
  Forks of Nondominium (e.g. pure P2P vs ERP/Tiki-focused variants) shall:
  - Be created as new branches in the version DAG (or as new entities that `ForkedFrom` the original)
  - Maintain affiliation links required by the OVN license

- **R-VERS-APP-04 – Compatibility Metadata**  
  Application versions shall be able to describe:
  - Supported deployment contexts (Pure P2P, Organizational, Mixed)
  - Compatibility ranges for data formats and bridge protocols.

---

## 3. Version Graph & Affiliation Semantics

- **R-VERS-GRAPH-01 – Typed Relations**  
  The system shall support **typed relations** between versions, at minimum:
  - `Initial`
  - `EvolvedFrom`
  - `ForkedFrom`
  - `MergedFrom`
  - `RepairedFrom`
  - `AugmentedFrom`
  - `PortedToPlatform` (e.g. port to Tiki, ERP, other UI)

- **R-VERS-GRAPH-02 – Multiple Parents**  
  Version nodes shall support multiple parents (merge scenarios).

- **R-VERS-GRAPH-03 – Traversal**  
  The system shall allow:
  - Traversal from a version to its ancestors (provenance)
  - Traversal from a version to its descendants (evolution paths)
  - Extraction of full **affiliation trees** for OVN accounting.

---

## 4. Contribution Propagation (OVN Model)

- **R-VERS-OVN-01 – Version-Level Contributions**  
  The system shall be able to attach **contribution records** to specific versions, indicating:
  - Who contributed (Agent)
  - In what role (e.g. design, implementation, repair, integration, translation)
  - Links to relevant PPRs (Private Participation Receipts)

- **R-VERS-OVN-02 – Upstream Propagation**  
  OVN accounting processes shall be able to:
  - Walk the version graph upstream from a given version
  - Aggregate contribution information according to OVN rules
  - Respect the OVN license, ensuring appropriate recognition and value flow to previous contributors.

- **R-VERS-OVN-03 – License Integrity**  
  Versioning shall not allow “cutting off” affiliation; all forks and derived versions must retain:
  - Links to their ancestors
  - References to the OVN license and model.

---

## 5. Integration with Existing Nondominium Architecture

- **R-VERS-INT-01 – Non-Breaking Addition**  
  Versioning shall be implemented as an additional **zome / module** (e.g. `zome_versioning`) that:
  - References existing entries (`EconomicResource`, `ResourceSpecification`, manifests, etc.)
  - Does not change the core data model of existing zomes.

- **R-VERS-INT-02 – Event-Triggered Version Creation**  
  Certain **EconomicEvents** (e.g. repair, augmentation, major upgrade, new hApp release) shall be able to trigger:
  - Creation of a new version node
  - Linking to the corresponding process and PPRs.

- **R-VERS-INT-03 – ValueFlows Compatibility**  
  Version information shall:
  - Integrate cleanly with ValueFlows concepts (Resources, Events, Agents)
  - Respect the Knowledge / Plan / Observation layering.

- **R-VERS-INT-04 – Digital Resource Integrity Alignment**  
  For digital resources, versioning shall:
  - Reuse the manifest-based integrity model
  - Allow verification of specific versions through their manifests and Merkle roots.

---

## 6. UX & API Considerations (High-Level, Post-MVP)

- **R-VERS-UX-01 – Human-Friendly Version View**  
  Users shall be able to:
  - See a **version history** and **fork graph** for a given resource
  - Distinguish between minor updates and major forks.

- **R-VERS-UX-02 – Semantic Version Actions**  
  Beyond “update resource”, the UI/API shall support actions like:
  - “Declare new version (repair/augmentation)”
  - “Fork this resource / fork Nondominium”
  - “Merge branches” (where appropriate).

- **R-VERS-UX-03 – OVN-Aware Attribution View**  
  Users shall be able to:
  - Inspect who contributed to which versions
  - Understand how contributions propagate across forks and merges.

---

## 7. Post-MVP Status

- These requirements are **explicitly post-MVP** and will be addressed **after** the first Nondominium proof-of-concept is complete.
- Early implementation steps will likely focus on:
  - Treating the **Nondominium hApp** itself as a versioned Application Resource
  - Adding basic version tracking for key digital resources (code, manifests, critical designs)
  - Gradually extending to full material resource versioning and OVN-aware contribution propagation.

Nondominium itself is a Resource. People will be able to fork Nondominium to create versions that better match their use, within the constraints of the OVN license, and this versioning architecture is designed to make those forks **explicit, accountable, and economically integrated**.