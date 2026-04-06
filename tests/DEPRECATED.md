# DEPRECATED: Tryorama Test Suite

This directory (`tests/`) contains the legacy Tryorama (TypeScript + Vitest) test suite.

## Status

**All tests in this directory are deprecated.** They are kept as a historical reference only and will not be maintained.

## Migration

The active test suite is **Sweettest (Rust)** located at:

```
dnas/nondominium/tests/src/
```

Run Sweettest tests with:

```bash
# Prerequisites: build the DNA bundles first
bun run build:happ

# Run all Sweettest tests
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest

# Run a specific test module
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person

# Run a specific test function
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person person_create_populates_hrea_agent_hash
```

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
| `resource/*.test.ts` | pending | Not started |
| `governance/*.test.ts` | pending | Not started |
| `governance/ppr-system/*.test.ts` | pending | Not started |
