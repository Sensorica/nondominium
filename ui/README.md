# Nondominium UI

SvelteKit frontend for the Nondominium hApp. Renders the **Lobby → Group → NDO** holarchy and
talks to the Holochain conductor through a typed service + store layer.

- **Stack:** SvelteKit 2 + Svelte 5 (runes) + TypeScript + Vite 7 + UnoCSS + Melt UI next-gen + Effect-TS
- **Client:** `@holochain/client` ^0.20.0
- **Architecture:** [`documentation/specifications/ui_architecture.md`](../documentation/specifications/ui_architecture.md)
- **Requirements:** [`documentation/requirements/ui_design.md`](../documentation/requirements/ui_design.md)

> All commands run inside the nix dev shell (`nix develop`) from the repository root.
> This project uses **bun**, never npm or npx.

## Running

The UI is not meant to be started on its own for normal development. Use the multi-agent
harness from the repo root, which boots a bootstrap server, the conductors, and one Vite dev
server per agent:

```bash
bun run start              # 2 agents, one browser tab each
AGENTS=3 bun run network   # custom agent count
NO_OPEN=1 bun run start    # don't auto-open browser tabs
```

Each agent gets its own port (`5173 + agent-1`) and therefore its own origin, which keeps
`localStorage` isolated between agents. The conductor an origin binds to is pinned by
`VITE_DEV_AGENT`; `?agent=N` is a manual override.

To run only the Vite dev server against an already-running conductor:

```bash
bun run --filter ui start  # requires UI_PORT and a live ui/static/hc-connection.json
```

## Checks and tests

```bash
bun run --filter ui check     # svelte-check against tsconfig.json
bun run --filter ui lint      # prettier --check + eslint
bun run --filter ui format    # prettier --write

bun run e2e                   # Playwright E2E against real conductors (from repo root)
bun run e2e:ui                # Playwright UI mode
```

E2E details, architecture, and debugging: [`tests/README.md`](tests/README.md).

## Layout

```
ui/src/lib/
├── components/   # lobby/, group/, ndo/, shell/ + HolochainProvider.svelte
├── services/     # holochain.service, cell.manager, group-clone.helpers, zomes/
├── stores/       # Svelte 5 rune stores: app.context, lobby, group, ndo-cache,
│                 #   person, resource, governance
├── schemas/      # Runtime validation schemas
├── errors/       # Tagged error types and the error-context registry
└── utils/        # hc-connect and helpers
ui/tests/         # Playwright E2E suite
ui/static/        # hc-connection.json is written here by the launcher
```

Shared types live in [`packages/shared-types`](../packages/shared-types). A first
`bun install` may need `cd packages/shared-types && bun run build` before the UI type-checks,
since types resolve from its gitignored `dist/`.

## Distribution

```bash
bun run --filter ui package   # build + zip to ui/dist.zip
bun run package               # from repo root: full .webhapp bundle
```
