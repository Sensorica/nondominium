# E2E Test Suite (Playwright + real conductors)

Browser-level end-to-end coverage of the Lobby → Group → NDO holarchy against
**real Holochain conductors** — no mocks. Sweettest (`dnas/nondominium/tests/`)
remains the primary backend suite; this suite covers the UI-to-conductor
integration seam and the multi-agent UX (invite join, member self-heal,
cross-agent visibility) that Sweettest cannot exercise through the UI.

## Running

```bash
# From the repo root, inside the nix dev shell:
bun run build:happ          # once, or after zome changes
nix develop --command bun run e2e        # headless run
nix develop --command bun run e2e:ui     # Playwright UI mode (debugging)
```

`bun run e2e` does NOT rebuild the happ — global-setup fails fast with a hint
if `workdir/nondominium.happ` is missing. First run of `bun install` may also
need `cd packages/shared-types && bun run build` (types resolve from its
gitignored `dist/`).

To inspect DHT state interactively alongside a run, set `E2E_PLAYGROUND=1`
(the launcher then also starts `hc playground`).

## Architecture

- **Conductor manager**: `scripts/launch-happ.mjs` in E2E mode (`E2E=1`) — the
  same harness as `bun run network`. Two conductors + two Vite dev servers, one
  origin per agent (ports **6173/6174**, deliberately distinct from the dev
  network's 5173+ so leftover-process port guards can never kill a dev
  session). Sandboxes live under the fixed short workdir `/tmp/ndo-e2e/sandbox`
  (lair-keystore's unix-socket path must stay under the ~108-byte SUN_LEN
  limit, and `$TMPDIR` is unstable across nested `nix develop` shells).
- **Setup/teardown**: `tests/setup/global-setup.ts` spawns the launcher
  detached (own process group) and polls `/tmp/ndo-e2e/ready.json` + HTTP 200
  per UI origin; `global-teardown.ts` kills the whole process group and then
  reaps by port. Leftovers are killed **by port, never `pkill -f <workdir>`**
  (which matches the killing shell's own argv).
- **Seeding client**: `tests/setup/harness.ts` `createSeedClient()` — direct
  zome calls from Node for prerequisites and DHT read-backs. Node ws clients
  must send an explicit `Origin` header, and must re-authorize signing
  credentials in their own process (credentials are per-process in
  @holochain/client). Never seed the exact thing a test claims to verify.
- **Specs**: ordered stories, single worker (`workers: 1`) — Holochain state
  is shared and ordered. `core-flows.spec.ts` (Phase 0 harness guards +
  Phase 1 single-agent flows), `multi-agent.spec.ts` (Phase 2 two-agent
  flows). Cross-agent assertions always poll via `expectEventually`, which
  drives the UI's own pull-refresh (focus/visibility triggers) rather than
  reloading.

## Conventions

- **Discovered app bugs**: when a spec fails because of a real application bug
  (not a test bug), capture it in `.local/e2e-discovered-bugs.md` (local
  handoff doc), TODO-mark the spec with a reference, and fix the bug in its
  own PR — never paper over it in the test.
- **Pending-backend assertions**: features tied to unmerged PRs are TODO-marked
  in the specs with the PR number (currently #114 profile sync, #117
  NDO-per-cell anchors, backend Phase 2.3 transition history).
