# Group Zome (`zome_group`) Documentation

The Group zome implements per-group coordination within the Lobby → Group → NDO hierarchy. Each group occupies its own cloned cell (a separate DHT), providing network-level isolation between groups while sharing the same DNA template.

## Architecture

The Group DNA uses the **cloned-cell pattern**: a single DNA template is installed once, and each new group is provisioned by calling `clone_cell` with a unique network seed. Each cloned cell has its own DHT — agents, memberships, work logs, and soft links are scoped to the cell, not the global nondominium DHT.

This gives groups:
- Network isolation: one group's data does not appear in another's DHT
- Shared validation: all cells use the same integrity rules
- Deferred provisioning: cells are created on demand, not at install time (`deferred: true` in `workdir/happ.yaml`)

## Entry Types

### `GroupProfile`
Public profile for the group. Exactly one `GroupProfile` exists per cloned cell.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String` | Display name (1–100 characters) |
| `description` | `Option<String>` | Optional description |

**Derived from action header** (not stored in entry): initiator = `record.action().author()`, created_at = `record.action().timestamp()`.

**Anchor:** `all_groups` → `GroupProfile` (via `LinkTypes::AllGroups`)

### `GroupMembership`
Records an agent's membership in the group. Created by `join_group`, orphaned (but not deleted) by `leave_group` (Holochain entries are append-only; the membership entry serves as an audit trail).

| Field | Type | Description |
|-------|------|-------------|
| `group_hash` | `ActionHash` | Hash of the `GroupProfile` entry |
| `role` | `Option<String>` | Optional group-scoped role |

**Derived from action header**: member = `record.action().author()`, joined_at = `record.action().timestamp()`.

### `WorkLog`
Planning-level contribution record within the group context. Does not generate PPRs or `EconomicEvent` entries (ADR-GROUP-04).

| Field | Type | Description |
|-------|------|-------------|
| `group_hash` | `ActionHash` | Parent group hash |
| `description` | `String` | Work description (non-empty) |
| `hours` | `f32` | Hours logged (> 0) |

**Derived from action header**: author = `record.action().author()`, logged_at = `record.action().timestamp()`.

### `SoftLink`
Link from a group to an NDO. This is the Group → NDO relationship in the `Lobby → Groups → NDOs` hierarchy. Agents who belong to multiple groups are the bridges for NDOs to travel group-to-group (organic, fractal propagation). Rendered as a dashed border in the UI to distinguish from hard (committed) links. Does not generate PPRs or `EconomicEvent` entries (ADR-GROUP-04).

| Field | Type | Description |
|-------|------|-------------|
| `group_hash` | `ActionHash` | Parent group hash |
| `target_ndo_hash` | `ActionHash` | Target NDO action hash |
| `description` | `Option<String>` | Optional link label |

**Derived from action header**: created_by = `record.action().author()`, created_at = `record.action().timestamp()`.

## Link Types

| Link type | Source | Target | Purpose |
|-----------|--------|--------|---------|
| `AllGroups` | `all_groups` anchor | `GroupProfile` | Global discovery within cell |
| `GroupUpdates` | `GroupProfile` | `GroupProfile` | Version chain |
| `GroupToMembers` | `GroupProfile` | `GroupMembership` | Member enumeration |
| `MemberToGroups` | `AgentPubKey` | `GroupProfile` | Reverse lookup |
| `GroupToWorkLogs` | `GroupProfile` | `WorkLog` | Work log enumeration |
| `AgentToWorkLogs` | `AgentPubKey` | `WorkLog` | Per-agent work log lookup |
| `GroupToSoftLinks` | `GroupProfile` | `SoftLink` | Soft link enumeration |

## Coordinator Functions

### Group Profile

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `create_group` | `GroupProfileInput { name, description }` | `Record` | Creates a `GroupProfile` and the `all_groups` anchor link |
| `get_group` | `ActionHash` | `Option<Record>` | Retrieves a group by its action hash |
| `get_my_group` | `()` | `Option<Record>` | Returns the single `GroupProfile` in this cloned cell (one group per cell) |
| `update_group` | `UpdateGroupInput { previous_action_hash, original_action_hash, updated_name, updated_description }` | `Record` | Updates the group name/description; only the initiator may update; creates a `GroupUpdates` link |

### Membership

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `join_group` | `ActionHash` (group hash) | `Record` | Creates a `GroupMembership` entry; guards against duplicate joins |
| `leave_group` | `ActionHash` (group hash) | `()` | Deletes discovery links for the calling agent; entry remains on-chain as audit trail |
| `get_group_members` | `ActionHash` (group hash) | `Vec<Record>` | Returns Records for all current members; member = `record.action().author()` |
| `is_member` | `(AgentPubKey, ActionHash)` | `bool` | Predicate: does the given agent appear in `get_group_members`? |

### Work Logs

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `log_work` | `WorkLogInput { group_hash, description, hours }` | `Record` | Creates a `WorkLog` entry with `GroupToWorkLogs` and `AgentToWorkLogs` links |
| `get_work_logs` | `ActionHash` (group hash) | `Vec<Record>` | Returns Records for all work logs; author = `record.action().author()` |
| `get_my_work_logs` | `()` | `Vec<Record>` | Returns Records for work logs authored by the calling agent (uses `AgentToWorkLogs` links) |
| `delete_work_log` | `ActionHash` (work log hash) | `ActionHash` | Removes both discovery links and deletes the entry; only the original author may call this |

### Soft Links

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `create_soft_link` | `SoftLinkInput { group_hash, target_ndo_hash, description }` | `Record` | Creates a planning-only `SoftLink` entry |
| `get_soft_links` | `ActionHash` (group hash) | `Vec<Record>` | Returns Records for all soft links; creator = `record.action().author()` |
| `delete_soft_link` | `ActionHash` (soft link hash) | `ActionHash` | Removes the `GroupToSoftLinks` discovery link and deletes the entry; only the original creator may call this |

## Validation Rules

- `GroupProfile.name` must be non-empty and ≤ 100 characters
- `WorkLog.description` must be non-empty
- `WorkLog.hours` must be > 0

> Hash fields (`group_hash`, `target_ndo_hash`) are always 39 bytes and cannot be "empty". Existence of the referenced entry is validated at the coordinator level, not in the integrity zome (which has no DHT access).

## Error Types

Domain errors are defined in `nondominium_shared::GroupError`:

| Variant | When raised |
|---------|-------------|
| `AlreadyMember` | `join_group` called when agent already has a membership entry |
| `NotMember` | Membership expected but not found |
| `GroupNotFound(String)` | Group hash resolves to nothing |
| `NotAuthor` | Operation requires authorship check |
| `EntryOperationFailed(String)` | `create_entry` / `get` failure |
| `LinkOperationFailed(String)` | Link creation/deletion failure |
| `SerializationError(String)` | Entry deserialization failure |
| `InvalidInput(String)` | Caller-supplied value rejected |

## Architectural Decisions

**ADR-GROUP-03**: The `GroupService` TypeScript interface takes `groupCellId: CellId` (DnaHash + AgentPubKey). Groups are cloned cells — `CellId` is the correct Holochain API for addressing a specific clone. The `group_dna_hash` from a `GroupAnnouncement` in the Lobby DHT is used to resolve the `CellId` via `getGroupCellHandle(client, dnaHash)`. All Svelte components depend on `GroupServiceTag` — adding fields to the interface requires updating all callers.

**ADR-GROUP-04**: `WorkLog` and `SoftLink` entries are planning-only and do not generate `EconomicEvent` entries or PPRs. Generating PPRs for planning-level actions would misrepresent intent and inflate reputation counts.

## Testing

Tests live in `dnas/group/tests/src/group/mod.rs`. All tests use `setup_two_agents()` from `common::conductors` and `await_consistency_20_s` for cross-agent DHT sync.

Test coverage: group creation, `get_group` (fetch by hash), `get_my_group`, membership (join/leave/is_member/duplicate-join error), work logs (`log_work`, `get_work_logs`, `get_my_work_logs`, `delete_work_log`), soft links (`create_soft_link`, `get_soft_links`, `delete_soft_link`), `update_group`, and validation rejection cases (empty name, zero hours). 13 tests total — `--test-threads 6` required to avoid port exhaustion.

```bash
# Prerequisites
bun run build:happ

# Run all group tests (thread-limited — 12 tests × 2 conductors each)
CARGO_TARGET_DIR=target/native-tests cargo test --package group_sweettest --test group -- --test-threads 6

# Run a specific test
CARGO_TARGET_DIR=target/native-tests cargo test --package group_sweettest --test group create_group_returns_profile
CARGO_TARGET_DIR=target/native-tests cargo test --package group_sweettest --test group get_group_by_hash
```
