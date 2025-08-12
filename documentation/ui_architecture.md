# Nondominium UI Architecture - Effect-TS + Multi-Layer Design

## Analysis Summary

### Reference Project Architecture Analysis
The **Nondominium** project demonstrates sophisticated architecture:

**Technology Stack:**
- SvelteKit + Svelte 5 + TypeScript + TailwindCSS ✅
- **Effect-TS** for functional programming paradigms
- Comprehensive testing (Unit, Integration, E2E)
- 7-layer architecture pattern

**7-Layer Architecture Pattern:**
```
DNA (Holochain Backend)
  ↓
HolochainClientService (Connection layer)
  ↓
Zome Services (Business logic adapters)
  ↓
Stores (State management with Effect-TS)
  ↓
Composables (Reusable business logic)
  ↓
Components (UI elements)
  ↓
Pages/Routes (Application structure)
```

## Recommendation: **YES** to Effect-TS + Multi-Layer Architecture

### Why Effect-TS is Beneficial for Nondominium

**✅ Advantages:**
1. **Error Handling**: Comprehensive error types with context tracking
2. **Async Composition**: Clean composition of Holochain operations
3. **Type Safety**: Full type safety across async boundaries
4. **Testability**: Pure functional approach improves testing
5. **Scalability**: Proven pattern in complex Holochain apps
6. **Future-Proofing**: Supports Phase 2 complexity (resources + governance)

**⚠️ Considerations:**
- Learning curve for Effect-TS paradigms
- More complex setup than vanilla reactive stores
- Overkill for simple PoC features

### Recommended Architecture for Nondominium

```
Multi-Layer Structure:

┌─────────────────────────────────────────────────┐
│ PAGES/ROUTES                                    │
│ /dashboard, /profile, /people, /settings        │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ COMPONENTS                                      │
│ PersonProfile, PersonCard, RoleManager, etc.    │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ COMPOSABLES                                     │
│ usePersonManagement, useRoleManagement          │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ STORES (Effect-TS)                              │
│ personStore, roleStore, authStore               │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ SERVICES                                        │
│ PersonService, RoleService, PrivateDataService  |
| ResourceService                                 |
| GovernanceService                               │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ HOLOCHAIN CLIENT SERVICE                        │
│ Connection, callZome, error handling            │
└─────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ DNA LAYER (Already Implemented)                               │
│ zome_person: Person, PrivateData, PersonRole                  |
| zome_resource: Resource, Resource specification               |
| zome_governance: Rule, Commitments, claims, economic events   |
└───────────────────────────────────────────────────────────────┘
```

## Current Backend Analysis

### Existing Zome Structure (Phase 1 Complete)
- **zome_person**: Agent identity, profiles, roles, capability-based access
- **zome_resource**: Resource specifications   
- **zome_gouvernance**: Commitments, claims, economic events

### Data Model
```typescript
// Core entities from backend analysis
Person {
  name: string,
  avatar_url?: string,
  bio?: string
}

PrivatePersonData {
  legal_name: string,
  email: string,
  phone?: string,
  address?: string,
  emergency_contact?: string,
  time_zone?: string,
  location?: string
}

PersonRole {
  role_name: string, // RoleType enum
  description?: string,
  assigned_to: AgentPubKey,
  assigned_by: AgentPubKey,
  assigned_at: Timestamp
}

// Role hierarchy (from backend)
RoleType = 
  | "Simple Agent"
  | "Accountable Agent" 
  | "Primary Accountable Agent"
  | "Storage Agent"
  | "Transporter Agent"
```

### Available Zome Functions
```rust
// Person management
create_person(PersonInput) -> Record
get_latest_person(ActionHash) -> Person
update_person(UpdatePersonInput) -> Record
get_all_persons() -> GetAllPersonsOutput
get_person_profile(AgentPubKey) -> PersonProfileOutput
get_my_person_profile() -> PersonProfileOutput

// Role management  
assign_person_role(PersonRoleInput) -> Record
get_person_roles(AgentPubKey) -> GetPersonRolesOutput
get_my_person_roles() -> GetPersonRolesOutput
has_person_role_capability(AgentPubKey, String) -> bool
get_person_capability_level(AgentPubKey) -> String

// Private data
store_private_person_data(PrivatePersonDataInput) -> Record
update_private_person_data(UpdatePrivatePersonDataInput) -> Record
get_my_private_person_data() -> Option<PrivatePersonData>
```

## Proposed Implementation Strategy

### Phase 1: Foundation Setup
1. **Migrate to SvelteKit** - Convert from vanilla Svelte
2. **Add Effect-TS dependencies** - `effect` + related packages
3. **Setup TailwindCSS** - Styling framework (sufficient for PoC)
4. **Create HolochainClientService** - Connection layer with Effect integration

### Phase 2: Service Layer
1. **PersonService** - CRUD operations for Person entries
2. **RoleService** - Role assignment and capability checking
3. **PrivateDataService** - Secure private data management
4. **Error handling** - Comprehensive error types and contexts

### Phase 3: Store Layer (Effect-TS)
1. **PersonStore** - Current user profile + community directory
2. **RoleStore** - Role assignments + capability checking
3. **AuthStore** - Authentication status + permissions
4. **Event system** - Inter-store communication

### Phase 4: Composables + Components
1. **Composables** - Reusable business logic (usePersonProfile, useRoleManagement)
2. **Components** - UI elements with proper separation of concerns
3. **Pages** - Route-based application structure

## Core Pages & Layout Design

### Application Structure
```
/                    # Dashboard (community overview)
/profile            # Personal profile management
/profile/edit       # Edit personal profile
/profile/private    # Private data management
/people             # Community members directory
/people/[id]        # Individual member profile
/roles              # Role management (governance only)
/settings           # App settings
```

### Component Architecture
**Layout Components:**
- `AppShell` - Main navigation + content area
- `Navigation` - Role-based menu items
- `Header` - User profile + notifications

**Person Management:**
- `PersonProfile` - Profile view/edit
- `PersonCard` - Directory listing
- `RoleManager` - Role assignment interface (governance only)
- `PrivateDataForm` - Secure data entry
- `CapabilityGuard` - Role-based access control

**Core Features:**
- `AgentConnector` - Connection status
- `RoleIndicator` - Visual role representation
- `DataTable` - Listing components
- `SearchFilter` - Member directory search

## Role-Based UI Access Control

### Capability Levels (from backend)
```typescript
type CapabilityLevel = 
  | "member"      // Basic profile management
  | "stewardship" // Community advocacy, resource stewardship  
  | "coordination"// Resource/community coordination, moderation
  | "governance"  // Community founding, governance coordination
```

### UI Permission Matrix
| Feature | Member | Stewardship | Coordination | Governance |
|---------|--------|-------------|--------------|------------|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| View community directory | ✅ | ✅ | ✅ | ✅ |
| View others' profiles | ✅ | ✅ | ✅ | ✅ |
| Assign roles | ❌ | ❌ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ | ✅ |
| Access governance | ❌ | ❌ | ❌ | ✅ |

## Data Flow Strategy

### Effect-TS Store Architecture
```typescript
// Example PersonStore structure
export const createPersonStore = (): E.Effect<PersonStore, never, PersonServiceTag> =>
  E.gen(function* () {
    const personService = yield* PersonServiceTag;
    
    // Reactive state
    let currentUser = $state<Person | null>(null);
    let communityMembers = $state<Person[]>([]);
    let loading = $state(false);
    let error = $state<string | null>(null);
    
    // Methods with Effect composition
    const createProfile = (input: PersonInput): E.Effect<Person, PersonError> =>
      pipe(
        personService.createPerson(input),
        E.tap((person) => E.sync(() => currentUser = person)),
        E.tap((person) => emitEvent('person:created', person))
      );
    
    return {
      get currentUser() { return currentUser; },
      get communityMembers() { return communityMembers; },
      get loading() { return loading; },
      get error() { return error; },
      createProfile,
      // ... other methods
    };
  });
```

### State Management Patterns
- **Holochain Stores**: Reactive stores for zome calls with Effect error handling
- **Profile Store**: Current agent profile + roles with capability checking
- **Community Store**: All persons + public data with search/filter
- **UI State**: Navigation, modals, forms with local state
- **Event Bus**: Cross-store communication for complex workflows

## Architecture Benefits for Nondominium

**Immediate (Phase 1):**
- Clean separation of concerns
- Type-safe Holochain interactions
- Comprehensive error handling
- Testable business logic
- Role-based access control

**Future (Phase 2):**
- Easy integration of resource management
- Governance workflows with complex state
- Multi-agent coordination
- ValueFlows compliance
- Scalable testing infrastructure

## Technical Implementation Notes

### Effect-TS Integration Patterns
```typescript
// Service layer with dependency injection
export class PersonServiceTag extends Context.Tag('PersonService')<
  PersonServiceTag, PersonService
>() {}

// Error handling with context
export const PersonError = Data.TaggedError('PersonError')<{
  message: string;
  context?: string;
  cause?: unknown;
}>();

// Composable async operations
const createAndLinkProfile = (input: PersonInput): E.Effect<Person, PersonError> =>
  pipe(
    personService.createPerson(input),
    E.flatMap((person) => linkToAgent(person)),
    E.flatMap((person) => updateCommunityDirectory(person)),
    E.catchAll((error) => PersonError({ message: 'Profile creation failed', cause: error }))
  );
```

### Holochain Integration Patterns
- Wrap zome calls in Effect for consistent error handling
- Cache management with expiration policies  
- Reactive updates via Holochain signals
- Capability-based access control in UI components
- Private data encryption/decryption flows

### Testing Strategy
- **Unit Tests**: Services and stores with mocked dependencies
- **Integration Tests**: Cross-layer interactions with test Holochain setup
- **E2E Tests**: Complete user workflows (profile creation, role assignment)
- **Component Tests**: UI components with mock stores
- **Mock Services**: Isolated testing with Effect test utilities

## Migration from Current Setup

### Current State
- Basic Svelte 5 setup with Holochain client connection
- No UI components yet - minimal scaffolding only
- TypeScript support configured
- Missing: SvelteKit, TailwindCSS, Effect-TS

### Migration Steps
1. **Convert to SvelteKit**: Update build config and routing
2. **Add dependencies**: Effect-TS, TailwindCSS
3. **Create service layer**: HolochainClientService with Effect integration
4. **Implement stores**: PersonStore, RoleStore with Effect patterns
5. **Build components**: Starting with PersonProfile and community directory
6. **Add routing**: Pages for profile management and community features

This architecture provides a robust foundation for the current PoC while being fully extensible for the complete ValueFlows implementation in Phase 2.