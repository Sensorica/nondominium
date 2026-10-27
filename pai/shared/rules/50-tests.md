# Sweettest Patterns (Nondominium)

> **Navigation index.** Sources of truth are in `CLAUDE.md — Testing Commands` and
> `documentation/Testing_Infrastructure.md`. For review requirements, read `REVIEW.md §4`.

## Setup
Source: `dnas/nondominium/tests/src/common/conductors.rs` (authoritative)

```rust
// dnas/nondominium/tests/src/common/conductors.rs
pub async fn setup_two_agents() -> (SweetConductor, SweetConductor, SweetCell, SweetCell)
pub async fn setup_three_agents() -> (SweetConductor, SweetConductor, SweetConductor, SweetCell, SweetCell, SweetCell)
pub async fn setup_dual_dna_two_agents() -> (...)  // nondominium + hREA DNAs
```

## Test Structure
Source: `CLAUDE.md — Testing Commands`, `documentation/Testing_Infrastructure.md`

```rust
// dnas/nondominium/tests/src/person/mod.rs
#[tokio::test]
async fn test_create_person_populates_anchor() {
    let (conductor_a, _, cell_a, cell_b) = setup_two_agents().await;

    // Call a zome function
    let person: Record = conductor_a
        .call(&cell_a.zome("zome_person"), "create_person", PersonInput { name: "Alice".into() })
        .await;

    // DHT sync between agents before reads
    await_consistency(&[&cell_a, &cell_b]).await.unwrap();

    // Read from other agent's perspective
    let persons: Vec<Record> = conductor_a
        .call(&cell_b.zome("zome_person"), "get_all_persons", ())
        .await;

    assert_eq!(persons.len(), 1);
}
```

## Cargo.toml Registration
Source: `dnas/nondominium/tests/Cargo.toml` (authoritative)

```toml
[[test]]
name = "person"
path = "tests/src/person/mod.rs"

[[test]]
name = "resource"
path = "tests/src/resource/mod.rs"
```

## Run Commands
Source: `CLAUDE.md — Testing Commands`

```bash
# Prerequisites
bun run build:happ

# All tests
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest

# Specific module
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person

# Specific function
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person person_create_populates_hrea_agent_hash
```

## What Each Test Must Cover
Source: `REVIEW.md §4` — read before writing or reviewing tests

- Every `#[hdk_extern]` needs a Sweettest test
- Multi-agent scenarios: one creates, other reads after `await_consistency()`
- Cross-zome calls: test the full flow end-to-end (resource → governance → event created)
- `#[ignore]` for tests not yet ready

## Deprecated: Tryorama
Source: `tests/DEPRECATED.md`

`tests/` directory contains Tryorama (TypeScript) tests. All are deprecated per
`tests/DEPRECATED.md`. Do not add new tests there. Reference only for migration context.
