# Nondominium UI Design Vision

## MVP
This secton is about a minimalistic UI for MVP for Layer 0 — Identity (stable anchor, tombstone at end of life), only lifecycle_stage evolves after creation (REQ-NDO-L0-*)." as mentioned in `implementation_plan.md`. 

This inital MVP UI implements the ideas of **Lobby** and **Groups**.
- The Lobby is a permissionless digital environment that anyone can join. 
> Implement UI to match `lobby-architecture.md`

- Once a user enters the Lobby, he can create a Group. The user can also join an existing Group. Groups are the organizational and economic side of NDOs. They will be fully developed during the implementaton of Layer 1 — Specification: Activated by NDOToSpecification → ResourceSpecification (governance rules, discoverable form); may be dormant/archived while L0 remains (REQ-NDO-L1-*). They allow users to work together on lists on NDOs, to do planning for example. Groups have group-level Governance, which will be developed later. This governance could specify for example rules to link to other existing NDOs, to create new NDOs. Once the user creates a Group, he will be the only user in that Group. This group is called a solo Group. The user can invite other users in his solo Group, thus this Group will not be a solo Group anymore.
> Todo for MVP, once in the Lobby, a button to *Create* and *Join* Group. Once pressed, a form is exposed where the user can specify Group name to *create*, or provide an invite link to *join*. The newly created solo Group will have listed the creator user as a group creator. The joined Group will display group members and a list of NDOs that this group has created or has linked to (NDOs created by other groups). See more below. 

- The user can create an new NDO from his solo Group. The NDO will exist as a stand-alone entity, with its own DHT, forming its own network, since any other user from any group can interact with any NDO. The creation of a new NDO is done by cloning the Nondominium cell (See Holochain documentation about setting cloning limit option in the hApp manifest). The user will be seen as the progenitor of this new NDO, belonging to the Group from which the action of creating a new NDO has been triggered. The new NDO will be governed by its own Governance Zome, which is templetized, depending on the nature or type of the NDO (physical or digital, property regime, etc.). A link between the progenitor and the group from which he operates and the new NDO will be created. The progenitor has control rights over the NDO only if the NDO is created under the private property regime. The private property regime can also apply to a Group, if the Group represents or is created by a moral entity (some form of incorporated organization). So as we can see, the property regime associated with the new NDO will have consequences over its own Governance and the Governance of the Group. If the new NDO is created under commons or nondominium property regime, the projenitor and the Group (organizational context) don't have assymetrical rights over it, in this case any user has the same rights per the NDO's own Governance. This is well documented in foundational documents that speak about the uncapturability of NDOs. 
> Todo for MVP, a button to create an NDO in the context of a Group, a solo Group or another Group, as specified in Issue 102: 

```
NDO Fields: 
- name: required text input, uniqueness warning if a spec with same name exists
- property_regime: <select> with all 6 enum variants; tooltip per option explaining the regime
- resource_nature: <select> with all 5 enum variants; tooltip per option
- lifecycle_stage: <select> restricted to valid initial stages (Ideation, Specification, Development, Prototype); no - - terminal or suspended stages at creation
- description: optional textarea
```

- After joining an existing Group, the user can search existing NDOs that are listed within that Group. The Group-level Governance, which will be implemented in the post-MVP version, will govern what actions the user can perform on NDOs, on top of the NDOs'own Governance, which is more about group coordination and planning, economic logic, etc.
> Todo for MVP, brows NDO function exposed through the UI, in the context of a Group.

- The user can fork an existing project-NDO (NDOs of type Project, or those that represent a resource in development), but forking is subject to friction, subject to NDO's own Governance, asking for negociations and an attempt to reach concensus, with the idea of preserving the integrity of the collaborative network, and forking as an ultimate measure if concensus is not reached. Forking may also require payment, which will be governed by Unyt integration, smart agreements, with cascade payments to past contributors, down the tree of affiliates NDOs. This will be implemented later. Therfore, friction has two main functions, to reduce undesirable proliferation of projet-NDOs and reward past contributors. 
> Todo for the MVP, we can expose a button for forking an existing NDO, opening a new tab / page / popup (to be determined) stating the above.


**About User / Agent**

At the Lobby level, we speak about User, which can be anyone. At this level, the User can create a User Profile, which is only stored in the UI store.
At the Group level, the User also has a profile, which is linked to his profile at the Lobby level, but customized.
As the User interacts with NDOs, as he created a new NDO or linked to an existing NDO from a group, the User's profile is distilled into an Agent, in the sense of Nondominium person, as implemented in the zome_person.
Since NDOs are public and permissionless, private data related to the identity of the individual sits on the private chain (private person data). No personal information is revealed at the NDO level, only a number or address psedeunemously representing the individual can be seen. Access to personal data, for example data from PPR (Personal Participation Receipts) can be selectivelly accessed during interactions between Agents and Resources, which is used by the Governance zome for example. 
At the Group level, since Groups can be invitation only and private, more personal information can be revealed, by the Group Governance, for example if the Group is a private one, if it represents a traditional organization, or if the Group members require a higher level of social integration, non-anonymous collaboration. But Groups where the anonymity of members are also possible, again, this is per Group culture and Governance.
>Todo update the `agent.md` foundational document with this info. Implement User Profile in Lobby with all possible fields, as optional: real name, address, description, email, phone number, etc. Only a nickname is required. The user can at any time update or complete the profile. As the user creates or joines a Group, he is prompted to chose how to present himself in that Group. A simple option is anonymous, where only a pseudonyme is filled. The user can also opt to chose or eliminate any other field from his profile. 


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
