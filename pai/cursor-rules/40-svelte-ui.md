# Svelte 5 UI Patterns (Nondominium)

## Stack
- **Svelte 5** runes only (`$state`, `$derived`, `$effect`, `$props`). No Svelte 4 `$:` reactive.
- **UnoCSS** for styling (utility classes). No Tailwind directly in components.
- **Melt UI next-gen** (`melt`) for headless, accessible components. Not shadcn.
- **Effect-TS** for service layer and async data handling.

## Rune Patterns
```svelte
<script lang="ts">
  // State
  let count = $state(0);
  let doubled = $derived(count * 2);

  // Props
  let { ndoHash, onClose }: { ndoHash: ActionHash; onClose: () => void } = $props();

  // Side effects
  $effect(() => {
    // runs after DOM update
    return () => { /* cleanup */ };
  });
</script>
```

## Service Layer (Effect-TS)
All zome calls via `wrapZomeCallWithErrorFactory`:
```typescript
const wz = <T>(fnName: string, payload: unknown, context: string) =>
  wrapZomeCallWithErrorFactory<T, DomainError>(
    holochainClient, 'zome_resource', fnName, payload, context,
    DomainError.fromError
  );
```

## Store Pattern (Svelte 5 module-level state)
```typescript
// lobby.store.svelte.ts
let ndos = $state<NdoDescriptor[]>([]);
let activeFilters = $state<ActiveFilters>({ lifecycleStages: [], natures: [], regimes: [] });
let filteredNdos = $derived(applyFilters(ndos, activeFilters));

export const lobbyStore = { get ndos() { return ndos; }, /* ... */ };
```

## Key Types (`@nondominium/shared-types`)
`NdoDescriptor`, `NdoInput`, `UpdateLifecycleStageInput`, `NdoTransitionHistoryEvent`,
`GroupDescriptor`, `LobbyUserProfile`, `GroupMemberProfile`

## App Context
Global reactive state in `app.context.svelte.ts`:
```typescript
let lobbyUserProfile = $state<LobbyUserProfile | null>(loadProfileFromStorage());
```

## Navigation Hierarchy
Lobby (all NDOs, group sidebar) → Group view (group-scoped NDOs) → NDO detail
Route: `/` → `/group/{id}` → `/ndo/{hash}`

## Filter Logic
OR within each dimension, AND across dimensions. Empty filter set = show all.
