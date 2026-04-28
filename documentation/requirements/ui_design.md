# Nondominium UI Design Vision

## MVP

This section describes the minimalistic UI for MVP Layer 0 — NDO Identity (stable anchor; only `lifecycle_stage` evolves after creation; REQ-NDO-L0-*). The MVP UI implements the concepts of **Lobby**, **Groups**, and **NDO view**.

---

### Lobby

The Lobby is a permissionless digital environment that anyone can join. It is the persistent outer shell of the application, always visible regardless of which route is active.

**Implemented:**
- Persistent left sidebar present on all routes, containing:
  - **Browse NDOs** link → root page (`/`) listing all unique NDOs across all the user's groups, with filter chips (Lifecycle Stage, Resource Nature, Property Regime)
  - **Groups list** — links to each group the user has created or joined (`/group/:id`)
  - **+ New Group** — inline form: user enters a group name and confirms; they become the group creator
  - **→ Join Group** — inline form: user pastes an invite code or link
  - **My Profile / Edit profile** — at the bottom of the sidebar; opens the profile modal
- **First-time profile modal** — triggered automatically on first app launch when no lobby profile exists; requires at least a nickname; all other fields (real name, bio, email) are optional and stored in `localStorage`

---

### Groups

Groups are organizational contexts for NDOs. A user can create a solo Group or join an existing one. At MVP, group membership and NDO associations are tracked in `localStorage` (no DHT-backed group entries yet).

**Implemented:**
- **Group panel** (`/group/:id`): shows group name, list of NDO cards, and a "Create NDO" button
- **Group profile prompt**: on first visit to a group the user is asked how they wish to present themselves (anonymous / custom); stored in `localStorage`
- **NDO cards** in group: each card shows name, lifecycle-stage badge, property-regime badge, resource-nature badge, and description excerpt; clicking a card navigates to the NDO detail page
- **Switching groups**: navigating from one group to another correctly reloads the group name and NDO list

**Not yet implemented:**
- Invite other users to a group (multi-member groups; sharing an invite link)
- Displaying group members from DHT
- Group-level governance

---

### NDO Creation

NDOs can only be created from within a Group. The "Create NDO" button in a Group panel opens a creation form. NDO identity data is stored on the Holochain DHT as a `NondominiumIdentity` (Layer 0) entry; the `action_hash` of that entry is the NDO's permanent stable identity.

**Implemented fields:**

| Field | Control | Notes |
|---|---|---|
| `name` | text input | required; uniqueness warning shown if name already exists in the lobby |
| `property_regime` | select | 4 variants: **Private**, **Commons**, **Nondominium**, **CommonPool**; tooltip per option |
| `resource_nature` | select | 5 variants: Physical, Digital, Service, Hybrid, Information; tooltip per option |
| `lifecycle_stage` | select | restricted to initial stages: Ideation, Specification, Development, Stable, Hibernating |
| `description` | textarea | optional |

> Note: the original spec listed 6 property-regime variants (including Collective and Pool) and 4 initial lifecycle stages (including Prototype). Both have been revised — see the Rust `PropertyRegime` enum and `LifecycleStage` for current canonical values.

---

### NDO View

Clicking an NDO card navigates to `/ndo/:hash`.

**Implemented:**
- NDO name displayed in header (populated immediately from in-memory cache on card click; refreshed from DHT in the background)
- Truncated hash shown below the name
- **Detail card**: labeled fields for Description, Property Regime, Resource Nature, Lifecycle Stage, and Created date
- **Identity badges**: lifecycle-stage color badge, property-regime badge, resource-nature badge
- **Lifecycle transition button** (visible to NDO initiator only): advances the lifecycle stage
- **Join NDO** button — placeholder; shows "Coming soon" tooltip; no backend call yet
- **Associate with group** button — opens a modal listing the user's groups; the user can select one or more groups and the NDO hash is appended to their `ndoHashes` in `localStorage`
- **Fork this NDO** button — opens the fork form; visible only when the Holochain conductor is connected
- Tabs: Resources, Governance, Composition, Activity (stubs for post-MVP content)

---

### Browse NDOs

**Implemented:**
- "Browse NDOs" in sidebar → root page showing all unique NDOs from all groups the user has created or joined
- Filter chips by Lifecycle Stage, Resource Nature, and Property Regime (4 variants)
- NDO cards with name, badges, description excerpt, and truncated hash
- "No NDOs yet" state when the user has no groups or no NDOs

---

### User / Agent Identity

At the Lobby level the User can be anyone. At this level the User creates a Lobby Profile, stored in `localStorage`. At the Group level the User also has a profile, linked to the Lobby profile but customizable per group. As the User creates or links to an NDO, their identity is distilled into a Holochain Agent (as implemented in `zome_person`). Since NDOs are public and permissionless, no personal information is revealed at the NDO level — only a pseudonymous agent key address is shown. Access to personal data (e.g. PPR — Personal Participation Receipts) is selective and governed by the Governance zome.

**Implemented:**
- First-time Lobby profile modal: `nickname` required; `realName`, `bio`, `email` optional; stored in `localStorage`
- "Edit profile" in sidebar for returning users
- Group profile prompt on first group visit: user can choose how to present themselves (anonymous or with selected fields from their Lobby profile)
- Agent public key shown on the NDO initiator line when Holochain is connected

---

### MVP ToDos

1. **Multi-member groups — invite link**: implement invite-link generation and redemption so a group creator can share a link with other agents, who can then join the group and see its NDO list.

2. **NDO fork friction**: the "Fork this NDO" button opens a form but currently has no governance friction. Per spec, forking should present a notice about negotiation, consensus, and eventual payment (Unyt integration); the MVP version should at minimum display this notice before proceeding.

3. **Join NDO**: the "Join NDO" button is a placeholder ("Coming soon"). Define and implement the DHT-level action for an agent to register interest or membership in an existing NDO.

4. **NDO detail page — DHT refresh reliability**: the NDO detail page seeds its display from an in-memory card cache and then attempts a background DHT refresh. The DHT refresh path (`getMyNdos` → `getAllNdos`) should be validated end-to-end; if it consistently fails, the root cause in `get_ndo` / `get_all_ndos` zome calls should be investigated.

5. **Group member list**: the Group panel has a `MemberList` stub that currently shows an empty list. Implement fetching and displaying group members (requires the invite/join flow from ToDo 1).

6. **Browse NDOs onboarding**: when the user has no groups, the NDO browser shows nothing. Add a visible call-to-action ("Create or join a group to see NDOs") to guide new users.

7. **Update `agent.md`**: foundational document should be updated to reflect the three-tier identity model — Lobby profile (localStorage) → Group profile (localStorage, per-group) → DHT Agent (`zome_person`), including the pseudonymity guarantees at the NDO level.


## Post MVP
This section is about UI improvements after a functional MVP.

### Core Design Philosophy

- **Perspective-centric design**: Interface adapts to agent's role and context
- **Landscape as fundamental pattern**: Natural spatial metaphor for resource organization
- **Parallax 3D depth**: Isometric perspective with 3-4 layers creating intuitive navigation
- **Horizontal navigation**: Primary movement left-right through parallax layers
- **Intuitive interaction**: Natural gestures and spatial awareness
- **Symbolic representation**: Resources/entities as round icons with peripheral state indicators

### Three-Layer Depth System

#### 🔬 **Micro Layer** (z-index: 300)

- **Purpose**: Detailed resource view (modal/overlay)
- **Trigger**: Click/tap on resource entity
- **Opacity**: 1.0, no blur
- **Content**: Full resource details, actions, history
- **Navigation**: Close to return to meso, or jump to related entities

#### 🎯 **Meso Layer** (z-index: 200) - _DEFAULT_

- **Purpose**: Contextual workspace, agent's primary focus
- **Scope**: Local context relevant to agent's role/location
- **Opacity**: 0.9-1.0, no blur
- **Content**: 10-20 most relevant resources/entities
  (4-5 on screen, but we can circle them while staying in meso view)
- **Interaction**: Full interactive capabilities

#### 🌍 **Macro Layer** (z-index: 100)

- **Purpose**: Global landscape, broader system context
- **Scope**: All entities less directly related to agent
- **Opacity**: 0.4-0.7, 2-4px blur
- **Content**: Overview of entire resource network
- **Interaction**: Hover preview, click to refocus meso layer

### Perspective Types

#### 👷 **Role Perspective**

Agent sees resources relevant to their role/capabilities

```yaml
maintainer_role:
  focus_filter: needs_maintenance = true
  priority_order: urgency_level
  color_scheme: earth_tones
  layout: spatial_proximity
```

#### 📦 **Resource Perspective**

Focus on specific resource types or categories

```yaml
resource_view:
  focus_filter: resource_type = selected
  group_by: category | location | status
  color_scheme: resource_type_colors
  layout: cluster_hierarchy
```

#### 👥 **Agent Perspective**

Social/collaborative view of other agents

```yaml
social_view:
  focus_filter: collaboration_potential
  relationship_mapping: trust_network
  color_scheme: relationship_strength
  layout: network_graph
```

#### 📍 **Geographic Perspective**

Location-based resource organization

```yaml
geographic_view:
  focus_filter: spatial_proximity
  center_point: agent_location
  radius: role_responsibility_area
  layout: concentric_circles
```

### Visual Design System

#### Entity Representation

```css
.resource-entity {
  shape: circle | rounded-square | hexagon;
  size: calc(proximity_score * base_size);
  background: resource_type_color;
  border: 2px solid state_color;

  /* Peripheral indicators */
  .state-badges: action_indicators[];
  .glow-effect: urgency_level;
  .pulse-animation: activity_state;
}
```

#### State Indicators

- 🟢 **Available/Healthy**: Ready for use, optimal condition
- 🟡 **Needs Attention**: Maintenance required, low priority
- 🔴 **Critical/Blocked**: Urgent action needed, system risk
- 🔵 **In Use/Reserved**: Currently engaged, not available
- ⚪ **Dormant/Archive**: Inactive, background status
- 🟣 **Pending**: Awaiting approval/assignment

#### Concentric Layout Pattern

- **Center**: Agent's current focus/role context
- **Inner Ring**: High-relevance resources (meso layer)
- **Outer Ring**: Background context (macro layer, blurred)
- **Smooth Transitions**: Elastic zoom and pan between layers

### Proximity Calculation Algorithm

```javascript
function calculateProximity(entity, agent_context) {
  const weights = {
    role_relevance: 0.4, // Match to agent's role/skills
    geographic_distance: 0.2, // Physical/logical proximity
    interaction_frequency: 0.2, // Historical engagement
    temporal_urgency: 0.1, // Time-sensitive needs
    governance_access: 0.1, // Permission/capability level
  };

  const proximity_score =
    weights.role_relevance * entity.roleMatch(agent_context.role) +
    weights.geographic_distance *
      (1 - entity.distance(agent_context.location)) +
    weights.interaction_frequency *
      entity.interactionHistory(agent_context.id) +
    weights.temporal_urgency * entity.urgencyScore() +
    weights.governance_access * entity.accessLevel(agent_context.capabilities);

  return Math.min(1.0, Math.max(0.0, proximity_score));
}

// Layer assignment
function assignLayer(proximity_score) {
  if (proximity_score >= 0.7) return "micro_candidate";
  if (proximity_score >= 0.4) return "meso";
  return "macro";
}
```

### Dynamic View Composition

#### Filter System

```javascript
const meso_composition = {
  keywords: ["maintenance", "urgent", "mechanical"],
  tags: ["infrastructure", "public"],
  date_range: "last_30_days",
  proximity_threshold: 0.6,
  max_entities: 20,
  sort_by: "urgency_desc",
};
```

#### Adaptive Personalization

- **Learning**: System learns from agent's interaction patterns
- **Preferences**: Custom color themes, entity sizes, layout density
- **Context Switching**: Quick perspective toggles based on current task

### Navigation Patterns

#### Primary Navigation (Horizontal)

- **Left/Right Scrolling**: Move through perspective layers
- **Parallax Effect**: Different scroll speeds per layer (macro slower than meso)
- **Momentum Scrolling**: Natural deceleration with bounce effects
- **Breadcrumb Trail**: Visual path showing navigation history

#### Secondary Navigation (Vertical)

- **Zoom In**: Meso → Micro (entity details)
- **Zoom Out**: Meso → Macro (broader landscape)
- **Elastic Transitions**: Smooth scaling with momentum physics
- **Quick Return**: One-click return to default meso view

#### Interaction Gestures

- **Click/Tap**: Open micro view or refocus meso
- **Double-Click**: Quick action (depends on entity type)
- **Long Press**: Context menu with available actions
- **Pinch/Zoom**: Layer transition control
- **Swipe**: Navigate between related entities

### Use Case Examples

#### 🌲 **Forester Agent Example**

**Role**: Forest maintenance specialist
**Meso View**: Trees/forest sections under their responsibility

- Focus: Trees needing attention (disease, damage, scheduled maintenance)
- Layout: Geographic clusters by forest section
- Priority: Health status and maintenance urgency

**Micro View**: Individual tree details

- Health metrics, species info, maintenance history
- Available actions: Schedule maintenance, mark for removal, update status

**Macro View**: Entire forest ecosystem

- All forest resources beyond immediate responsibility
- Ability to see broader patterns and request assistance

#### 🔧 **Maintenance Coordinator Example**

**Role**: Equipment and infrastructure maintenance
**Meso View**: Equipment requiring maintenance within their jurisdiction

- Priority filter: Critical systems first, then scheduled maintenance
- Status indicators: Operational, needs attention, critical failure
- Timeline view: Maintenance schedules and deadlines

#### 🏗️ **Resource Allocation Agent Example**

**Role**: Optimizing resource distribution across projects
**Meso View**: Available resources and current allocations

- Filter by: Resource type, availability, location, project needs
- Visual flow: Resource movement between projects
- Optimization indicators: Efficiency metrics, bottlenecks

### Responsive Design Considerations

#### Mobile Adaptation

- **Single Layer Focus**: Simplified view with layer swipe transitions
- **Larger Touch Targets**: Minimum 44px touch areas for entities
- **Simplified Indicators**: Essential state information only
- **Gesture Navigation**: Swipe for layers, tap for details

#### Desktop Enhancement

- **Full Parallax Experience**: All three layers simultaneously visible
- **Keyboard Shortcuts**: Layer navigation, entity selection, quick actions
- **Multi-Selection**: Batch operations on multiple entities
- **Rich Hover States**: Detailed tooltips and preview information

#### Accessibility Features

- **High Contrast Mode**: Enhanced visual differentiation
- **Screen Reader Support**: Semantic markup and ARIA labels
- **Keyboard Navigation**: Full functionality without mouse
- **Motion Preferences**: Respect user's motion sensitivity settings

### Technical Implementation Notes

- **Rendering**: Canvas-based or WebGL for smooth 3D transitions
- **Data Binding**: Real-time updates from Holochain DHT
- **Performance**: Virtualized rendering for large entity sets
- **Caching**: Intelligent prefetching based on proximity scores
- **State Management**: Maintain layer states and user preferences

"/home/soushi888/Téléchargements/PXL_20250828_013350143.jpg"
