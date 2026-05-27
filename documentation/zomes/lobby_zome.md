# Lobby Zome (`zome_lobby`) Documentation

The Lobby zome implements the global discovery and federation layer for the nondominium network. It is a separate Holochain DNA (not a zome inside the nondominium DNA) that uses the canonical `network_seed: nondominium-lobby-v1` so all deployed hApps share the same Lobby DHT. The Lobby is the entry point of the Lobby → Groups → NDOs hierarchy: it maintains agent profiles and a registry of Group cells so agents can discover and join groups.

**Design decisions:** See ADR-LOBBY-01 through ADR-LOBBY-04 in PR #103 for the rationale behind the separate DNA and canonical network seed.

---

## Core Data Structures

### Entry Types

#### `LobbyAgentProfile`

Public agent presence in the Lobby DHT. Permissionless to create; permanent anchor (cannot be deleted).

```rust
pub struct LobbyAgentProfile {
    pub handle: String,             // max 64 chars, non-empty
    pub avatar_url: Option<String>, // must start with "https://" if present
    pub bio: Option<String>,        // max 500 chars
    pub lobby_pubkey: AgentPubKey,  // must equal action.author at create time
    pub created_at: Timestamp,
}
```

**Integrity constraints:**
- `handle` must be non-empty and ≤ 64 characters
- `avatar_url`, if present, must start with `"https://"`
- `bio`, if present, must be ≤ 500 characters
- `lobby_pubkey` must equal `action.author` (enforced in `validate_create_lobby_agent_profile`)
- Only the profile owner (`action.author == original.lobby_pubkey`) may update their profile
- Delete operations are unconditionally rejected

#### `GroupAnnouncement`

Registry entry for a group cloned cell. Stored in the Lobby DHT so agents can discover which groups exist and obtain their `DnaHash` for `CellId` addressing. Core fields are immutable after creation; the entry cannot be deleted.

```rust
pub struct GroupAnnouncement {
    pub group_name: String,          // non-empty
    pub group_dna_hash: DnaHash,     // stable CellId key for the cloned cell
    pub network_seed: String,        // unique per group
    pub description: Option<String>,
    pub registered_by: AgentPubKey,  // must equal action.author
}
```

**Integrity constraints:**
- `group_name` must be non-empty
- `registered_by` must equal `action.author`
- Update operations are unconditionally rejected (immutable after creation)
- Delete operations are unconditionally rejected

### Link Types

| Link type | Base | Target | Purpose |
|---|---|---|---|
| `AllLobbyAgents` | `Path("lobby.agents")` | `LobbyAgentProfile` | Global agent discovery |
| `AgentProfileUpdates` | `LobbyAgentProfile` (original hash) | `LobbyAgentProfile` (updated hash) | Update chain for profile versioning |
| `AgentToLobbyProfile` | `AgentPubKey` | `LobbyAgentProfile` | Agent-centric lookup (used by `get_lobby_agent_profile` and upsert detection) |
| `AllGroupAnnouncements` | `Path("lobby.groups")` | `GroupAnnouncement` | Global group discovery |
| `AgentToGroupAnnouncements` | `AgentPubKey` | `GroupAnnouncement` | Agent-centric group discovery |

---

## Functions

### Agent Profile Functions

#### `upsert_lobby_agent_profile(input: LobbyAgentProfileInput) -> ExternResult<ActionHash>`

Create or update the calling agent's Lobby profile. Uses an update chain to avoid modifying the global discovery anchor.

**Input:**
```rust
pub struct LobbyAgentProfileInput {
    pub handle: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}
```

**Business Logic:**
1. Queries `AgentToLobbyProfile` links from the agent's pubkey to detect an existing profile
2. If no profile exists: creates a new `LobbyAgentProfile` entry, creates an `AllLobbyAgents` link from the global anchor, and creates an `AgentToLobbyProfile` link from the agent's pubkey
3. If a profile exists: calls `update_entry` on the most recent profile hash, then creates an `AgentProfileUpdates` link from the previous hash to the new one

**Returns:** Action hash of the created or updated entry.

---

#### `get_lobby_agent_profile(agent: AgentPubKey) -> ExternResult<Option<LobbyAgentProfile>>`

Get the lobby profile for a given agent, resolving to the latest version in the update chain.

**Business Logic:**
1. Queries `AgentToLobbyProfile` links from the agent's pubkey
2. Takes the most recent link by timestamp
3. Returns the decoded `LobbyAgentProfile` entry, or `None` if not found

---

#### `get_all_lobby_agents(_: ()) -> ExternResult<Vec<LobbyAgentProfileRecord>>`

Get all registered lobby agent profiles from the global discovery anchor. Each result contains the original action hash and the latest profile entry.

**Returns:** `Vec<LobbyAgentProfileRecord>` where each record contains `action_hash: ActionHash` and `entry: LobbyAgentProfile`.

---

### Group Registry Functions

#### `announce_group(input: AnnounceGroupInput) -> ExternResult<Record>`

Register a group's cloned cell in the Lobby DHT so other agents can discover it.

**Input:**
```rust
pub struct AnnounceGroupInput {
    pub group_name: String,
    pub group_dna_hash: DnaHash,
    pub network_seed: String,
    pub description: Option<String>,
}
```

**Business Logic:**
1. Creates a `GroupAnnouncement` entry with `registered_by = agent_info().agent_initial_pubkey`
2. Creates `AllGroupAnnouncements` link: `Path("lobby.groups")` → entry (global discovery)
3. Creates `AgentToGroupAnnouncements` link: agent pubkey → entry (agent-centric discovery)

**Returns:** The created `Record`.

---

#### `get_all_group_announcements(_: ()) -> ExternResult<Vec<Record>>`

Get all group announcements from the global discovery anchor (`Path("lobby.groups")`).

**Returns:** `Vec<Record>` — decode each record's entry as `GroupAnnouncement` to access fields.

---

#### `get_my_group_announcements(_: ()) -> ExternResult<Vec<Record>>`

Get all group announcements registered by the calling agent, via the `AgentToGroupAnnouncements` links from the agent's pubkey.

---

#### `get_group_announcement_by_dna_hash(dna_hash: DnaHash) -> ExternResult<Option<Record>>`

Look up a group announcement by its `group_dna_hash`. Scans the `AllGroupAnnouncements` anchor and returns the first entry whose `group_dna_hash` matches.

Used by the UI to resolve a `DnaHash` (from a `GroupDescriptorStub`) back to the full `GroupAnnouncement` for display or joining.

---

#### `get_my_groups(_: ()) -> ExternResult<Vec<GroupDescriptorStub>>`

Returns lightweight stubs for all groups the calling agent has announced. Derives stubs from `get_my_group_announcements()`.

```rust
pub struct GroupDescriptorStub {
    pub id: String,    // network_seed — stable group identifier
    pub name: String,  // group_name from the announcement
    pub is_solo: bool, // always false for real group cells
}
```

---

## Helper Functions

### `resolve_update_chain(original: ActionHash) -> ExternResult<ActionHash>`

Walks a `LobbyAgentProfile` update chain by following `AgentProfileUpdates` links until reaching the terminal hash. Used by `get_lobby_agent_profile` and `get_all_lobby_agents`.

---

## Sweettest Coverage

Tests live in `dnas/lobby/tests/src/lobby/mod.rs` (`package: lobby_sweettest`).

| Test | Coverage |
|---|---|
| `upsert_lobby_agent_profile` | Create + update profile, verify via `get_lobby_agent_profile` |
| `announce_group_single_agent` | Single-agent group announcement + read via `get_all_group_announcements` |
| `announce_group_cross_conductor` | Cross-conductor DHT consistency via `await_consistency_20_s` |
| `get_my_group_announcements_returns_own` | Agent-centric lookup returns only own announcements |
| `get_my_groups_returns_real_group` | `get_my_groups` returns a real `GroupDescriptorStub` with `is_solo: false` |

**Run:**
```bash
bun run build:happ
CARGO_TARGET_DIR=target/native-tests cargo test --package lobby_sweettest --test lobby
```
