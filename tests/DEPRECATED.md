# DEPRECATED: Tryorama Test Suite

This directory (`tests/`) contains the legacy Tryorama (TypeScript + Vitest) test suite.

## Status

**All tests in this directory are deprecated.** They are kept as a historical reference only and will not be maintained.

## Migration

The active test suite is **Sweettest (Rust)**. Each DNA has its own package:

```
dnas/nondominium/tests/src/    # nondominium_sweettest
dnas/group/tests/src/          # group_sweettest
dnas/lobby/tests/src/          # lobby_sweettest
```

Quick start:

```bash
bun run build:happ    # prerequisite: build the DNA bundles first
bun run sweettest     # build + run the nondominium suite
```

Full command reference for every suite, plus the Playwright E2E suite:
[`documentation/TEST_COMMANDS.md`](../documentation/TEST_COMMANDS.md).

## Why Sweettest

nondominium is a Rust-native Holochain application. Sweettest runs the conductor in-process using native Rust types — no TypeScript serialization layer, faster iteration, and direct DHT database inspection. It is the official Holochain team recommendation for integration testing.

## Test Coverage Migration Status

| Tryorama file | Sweettest equivalent | Status |
|---|---|---|
| `misc/misc.test.ts` | `dnas/nondominium/tests/src/misc/mod.rs` | Migrated |
| `person/person-hrea-bridge-tests.test.ts` | `dnas/nondominium/tests/src/person/mod.rs` | Migrated |
| `person/person-foundation-tests.test.ts` | pending | Not started |
| `person/person-integration-tests.test.ts` | pending | Not started |
| `person/person-scenario-tests.test.ts` | pending | Not started |
| `person/person-capability-based-sharing.test.ts` | pending | Not started |
| `person/device-*.test.ts` | pending | Not started |
| `resource/*.test.ts` | `dnas/nondominium/tests/src/resource/mod.rs` | Partial |
| `governance/*.test.ts` | `dnas/nondominium/tests/src/governance/mod.rs` | Partial |
| `governance/ppr-system/*.test.ts` | pending | Not started |

Sweettest coverage added since this suite was frozen, with no Tryorama predecessor:

| Sweettest module | Covers |
|---|---|
| `dnas/nondominium/tests/src/nondominium/` | NDO Layer 0 (`NondominiumIdentity`) lifecycle |
| `dnas/lobby/tests/src/lobby/` | Lobby agent profiles, group announcements |
| `dnas/group/tests/src/group/` | Group lifecycle, membership, work logs, soft links |
| `dnas/group/tests/src/ndo_anchor/` | NDO anchors on the group DHT |
| `ui/tests/` (Playwright) | Browser-level Lobby → Group → NDO flows |
