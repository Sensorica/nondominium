# Svelte 5 UI Patterns (Nondominium)

> **Navigation index.** Sources of truth are in `documentation/specifications/specifications.md §7`
> and `CLAUDE.md`. For shared type definitions, read `packages/shared-types/src/`.

## Stack
Source: `CLAUDE.md — Technology Stack`, `documentation/specifications/specifications.md §7.1`

- **Svelte 5** runes only (`$state`, `$derived`, `$effect`, `$props`). No Svelte 4 `$:` reactive.
- **UnoCSS** for styling (utility classes). No Tailwind directly in components.
- **Melt UI next-gen** (`melt`) for headless, accessible components. Not shadcn.
- **Effect-TS** for service layer and async data handling.

## Rune Patterns
Source: Svelte 5 docs via `mcp__svelte` MCP server (always check for current API)

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
Source: `documentation/specifications/specifications.md §7.2`

All zome calls via `wrapZomeCallWithErrorFactory`:
```typescript
const wz = <T>(fnName: string, payload: unknown, context: string) =>
  wrapZomeCallWithErrorFactory<T, DomainError>(
    holochainClient, 'zome_resource', fnName, payload, context,
    DomainError.fromError
  );
```

## Store Pattern (Svelte 5 module-level state)
Source: `documentation/specifications/specifications.md §7.4`

```typescript
// lobby.store.svelte.ts
let ndos = $state<NdoDescriptor[]>([]);
let activeFilters = $state<ActiveFilters>({ lifecycleStages: [], natures: [], regimes: [] });
let filteredNdos = $derived(applyFilters(ndos, activeFilters));

export const lobbyStore = { get ndos() { return ndos; }, /* ... */ };
```

## Key Types (`@nondominium/shared-types`)
Source: `documentation/specifications/specifications.md §7.1`, `packages/shared-types/src/resource.types.ts`

`NdoDescriptor`, `NdoInput`, `UpdateLifecycleStageInput`, `NdoTransitionHistoryEvent`,
`GroupDescriptor`, `LobbyUserProfile`, `GroupMemberProfile`

## Navigation Hierarchy
Source: `documentation/requirements/requirements.md §4.5`, `documentation/specifications/ui_architecture.md`

Lobby (all NDOs, group sidebar) → Group view (group-scoped NDOs) → NDO detail
Route: `/` → `/group/{id}` → `/ndo/{hash}`

## Filter Logic
Source: `documentation/requirements/requirements.md REQ-UI-LOBBY-01`

OR within each dimension, AND across dimensions. Empty filter set = show all.
