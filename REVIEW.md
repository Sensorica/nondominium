# PR Review Guidelines — nondominium

> For Devin (and any AI PR reviewer): this file defines what to **check**, **flag**, and **accept**
> when reviewing pull requests in this repo.
> Development setup, build commands, and architecture context live in `CLAUDE.md` — do not duplicate them here.

---

## Scope of Review

For every PR, check:

1. [Holochain Entry Patterns](#1-holochain-entry-patterns)
2. [Capability and Security Model](#2-capability-and-security-model)
3. [ValueFlows Compliance](#3-valueflows-compliance)
4. [Test Coverage (Sweettest)](#4-test-coverage-sweettest)
5. [Zome Boundary Integrity](#5-zome-boundary-integrity)
6. [Documentation Currency](#6-documentation-currency)

---

## 1. Holochain Entry Patterns

### Required for any new entry type

- [ ] Entry struct derives: `Clone, Serialize, Deserialize`
- [ ] `EntryTypes` enum updated in the integrity zome
- [ ] `create_entry()` call is followed by anchor link creation
- [ ] Anchor path matches naming convention: `"all_[plural_type]"` (e.g., `"all_resources"`)
- [ ] Both `get_[type]()` and `get_all_[type]()` externs exist
- [ ] `delete_[type]()` cleans up anchor links, not just the entry

### Accept these patterns — do NOT flag as issues

- `sys_time()?` — Holochain's only time source; correct and intentional
- `agent_info()?.agent_initial_pubkey` — standard agent identity access
- `#[hdk_extern]` on every callable function — required WASM export macro
- `create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::..., LinkTag::new("..."))` — anchor discovery pattern, intentional chaining
- `Ok(())` with no returned value from externs — valid Holochain extern signature
- Long exhaustive `match` arms on `Op::` variants — validation exhaustiveness is required by HDI
- `warn!("...")` calls in zome functions — intentional debug logging visible in Sweettest output

---

## 2. Capability and Security Model

### Flag if

- A new `get_*` extern exposes `EncryptedProfile` or private data without a capability check
- A new role assignment function lacks link tag validation (role assignments store metadata in link tags)
- `grant_private_data_access()` is modified to allow grants exceeding 30 days (hard cap per `PrivateDataCapabilityMetadata`)
- A new entry type containing PII is marked public (not `Private` in entry def)

### Accept

- `get_all_persons()` without auth gate — public agent discovery is intentional
- `Person` entries (name, avatar) with no capability restriction — public profile data by design
- Open anchor traversal for resource specifications — public catalog is by design

---

## 3. ValueFlows Compliance

This hApp implements the ValueFlows economic ontology. Flag if any of these are violated:

- `EconomicEvent` entry is missing `action`, `provider`, `receiver`, or `resource_quantity` field
- `Commitment` is created without a linked `EconomicResource`
- Field names diverge from the VF spec — required names: `action`, `provider`, `receiver`,
  `resourceInventoriedAs`, `resourceQuantity`, `effortQuantity`, `hasBeginning`, `hasEnd`
- A new economic process (Use, Transport, Storage, Repair) bypasses the governance zome's
  `evaluate_state_transition()` call
- PPR issuance outside the 16 defined categories (see `documentation/specifications/governance/private-participation-receipt.md`)

---

## 4. Test Coverage (Sweettest)

- [ ] Any new `#[hdk_extern]` function has at least one corresponding Sweettest test
      in `dnas/nondominium/tests/src/`
- [ ] Tests use shared setup from `common::conductors`:
      `setup_two_agents()`, `setup_three_agents()`, or `setup_dual_dna_two_agents()`
      — not ad-hoc conductor setup
- [ ] Multi-agent tests call `await_consistency(&[&cell_a, &cell_b]).await.unwrap()`
      before asserting cross-agent state
- [ ] New test modules are declared in `dnas/nondominium/tests/src/lib.rs`

### Do NOT flag

- Absence of Tryorama (TypeScript) tests — those are deprecated; see `tests/DEPRECATED.md`
- Tests in `tests/` directory — deprecated, ignore for review purposes
- `#[ignore]` on incomplete tests — acceptable during development

---

## 5. Zome Boundary Integrity

Three coordinators: `zome_person`, `zome_resource`, `zome_gouvernance`.

### Flag if

- A coordinator zome directly `use`s types from another coordinator's internal module
  (cross-zome data sharing must go through HDK `call()` or shared integrity types)
- Entry types belonging to one zome are `create_entry()`-d inside a different coordinator
- Link types defined in one integrity zome are created inside a different coordinator
  without an explicit `call()` crossing the boundary

### Accept

- Shared types imported from the integrity zome (e.g., `nondominium_integrity::EntryTypes`) — this is correct
- `call(CallTargetCell::Local, "zome_resource", ...)` patterns — proper cross-zome calls

---

## 6. Documentation Currency

When a PR changes code, documentation may need to be updated. Use the table below to determine
which files are affected. Flag any case where code changed but the corresponding doc was not updated.

### Change-to-Doc Mapping

| What changed in the PR                                | Documentation file to check                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| New or modified `#[hdk_extern]` in `zome_person`      | `documentation/zomes/person_zome.md`, `documentation/API_REFERENCE.md`                                             |
| New or modified `#[hdk_extern]` in `zome_resource`    | `documentation/zomes/resource_zome.md`, `documentation/API_REFERENCE.md`                                           |
| New or modified `#[hdk_extern]` in `zome_gouvernance` | `documentation/zomes/governance_zome.md`, `documentation/API_REFERENCE.md`                                         |
| New entry type added to any zome                      | `documentation/zomes/architecture_overview.md`                                                                     |
| New cross-zome call added                             | `documentation/specifications/governance/cross-zome-api.md`                                                        |
| Governance rule evaluation logic changed              | `documentation/specifications/governance/governance-operator-architecture.md`                                      |
| PPR categories added or modified                      | `documentation/specifications/governance/private-participation-receipt.md`, `documentation/DOCUMENTATION_INDEX.md` |
| Feature milestone completed (phase advancement)       | `documentation/IMPLEMENTATION_STATUS.md`, `documentation/DOCUMENTATION_INDEX.md`                                   |
| New Sweettest test module added                       | `documentation/TEST_COMMANDS.md`, `documentation/Testing_Infrastructure.md`                                        |
| New `cargo test` command or flag documented           | `documentation/TEST_COMMANDS.md`                                                                                   |
| hREA integration code changed                         | `documentation/hREA/integration-strategy.md`                                                                       |
| New requirement added or scope changed                | `documentation/requirements/ndo_prima_materia.md`                                                                  |

### How to flag a documentation gap

Comment on the PR:

> `documentation/zomes/person_zome.md` does not reflect the new `[function_name]` extern added
> in `[file path]`. Please update the API table and function description.

### Files that do NOT need updating for code PRs

These are historical, aspirational, or research files — do not flag them as stale:

- `documentation/archives/` — frozen historical documents
- `documentation/research/` — research notes, not living documentation
- `documentation/Applications/` — application concept docs, not tied to implementation
- `documentation/requirements/post-mvp/` — post-MVP stubs, updated only when scope changes
- `documentation/specifications/post-mvp/` — same as above
