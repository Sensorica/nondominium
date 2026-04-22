# Lobby Zome (`zome_lobby`) Documentation

The Lobby zome implements the global discovery and federation layer for the nondominium network. It is a separate Holochain DNA (not a zome inside the nondominium DNA) that uses the canonical `network_seed: nondominium-lobby-v1` so all deployed hApps share the same Lobby DHT. This enables cross-network NDO discovery, agent profile presence, and group membership stubs until the Group DNA ships.

**Design decisions:** See ADR-LOBBY-01 through ADR-LOBBY-04 in PR #103 for the rationale behind the separate DNA, the canonical network seed, and the `NdoAnnouncement` vs `NdoDescriptor` naming choice.

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

#### `NdoAnnouncement`

Public descriptor for a registered NDO. Links to the `NondominiumIdentity` Layer 0 anchor inside the NDO's own DHT. Only `lifecycle_stage` is mutable after creation; all other fields are immutable.

```rust
pub struct NdoAnnouncement {
    pub ndo_name: String,
    pub ndo_dna_hash: DnaHash,
    pub network_seed: String,
    pub ndo_identity_hash: ActionHash, // Layer 0 NondominiumIdentity inside the NDO DHT
    pub lifecycle_stage: LifecycleStage,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub description: Option<String>,
    pub registered_by: AgentPubKey,    // must equal action.author at create time
    pub registered_at: Timestamp,
}
```

**Integrity constraints:**
- `ndo_name` must be non-empty
- `lifecycle_stage` cannot be `Deprecated` or `EndOfLife` at creation time
- `registered_by` must equal `action.author`
- Only the registrant (`action.author == original.registered_by`) may update the entry
- Only `lifecycle_stage` may change in an update; all other fields are immutable
- Delete operations are unconditionally rejected

**Validation design note:** Author checks for `NdoAnnouncement` updates are split across two HDI arms. `StoreEntry` validates entry content (field constraints); `StoreRecord` validates action metadata (author identity, immutability). Both arms run on every update — this is intentional per Holochain's dual-validation design.

### Link Types

| Link type | Base | Target | Purpose |
|---|---|---|---|
| `AllLobbyAgents` | `Path("lobby.agents")` | `LobbyAgentProfile` | Global agent discovery |
| `AgentProfileUpdates` | `LobbyAgentProfile` (original hash) | `LobbyAgentProfile` (updated hash) | Update chain for profile versioning |
| `AllNdoAnnouncements` | `Path("lobby.ndos")` | `NdoAnnouncement` | Global NDO discovery |
| `NdoAnnouncementByLifecycle` | `Path("lobby.ndo.lifecycle.{stage}")` | `NdoAnnouncement` | Filtered discovery by lifecycle stage |
| `AgentToNdoAnnouncements` | `registered_by AgentPubKey` | `NdoAnnouncement` | Agent-centric NDO discovery |
| `NdoAnnouncementUpdates` | `NdoAnnouncement` (original hash) | `NdoAnnouncement` (updated hash) | Update chain for lifecycle stage changes |

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
1. Reads the `AllLobbyAgents` anchor from `agent_info()` to find any existing profile link
2. If no profile exists: creates a new `LobbyAgentProfile` entry and creates an `AllLobbyAgents` link from the agent's pubkey to the new entry
3. If a profile exists: calls `update_entry` on the most recent profile hash, then creates an `AgentProfileUpdates` link from the previous hash to the new one

**Update chain pattern:** Discovery stays anchored on the original action hash via `AllLobbyAgents`. Updates are chained via `AgentProfileUpdates` links and walked by `resolve_update_chain()`. This avoids modifying the anchor link on every update.

**Returns:** Action hash of the created or updated entry.

---

#### `get_lobby_agent_profile(agent: AgentPubKey) -> ExternResult<Option<LobbyAgentProfile>>`

Get the lobby profile for a given agent, resolving to the latest version in the update chain.

**Business Logic:**
1. Queries `AllLobbyAgents` links from the agent's pubkey
2. Takes the most recent link by timestamp
3. Walks the `AgentProfileUpdates` chain via `resolve_update_chain()` to find the latest hash
4. Returns the decoded `LobbyAgentProfile` entry, or `None` if not found

---

#### `get_all_lobby_agents(_: ()) -> ExternResult<Vec<LobbyAgentProfileRecord>>`

Get all registered lobby agent profiles from the global discovery anchor. Each result is resolved to its latest update.

**Returns:** `Vec<LobbyAgentProfileRecord>` where each record contains the original `action_hash` and the latest `LobbyAgentProfile` entry.

---

### NDO Announcement Functions

#### `announce_ndo(input: AnnounceNdoInput) -> ExternResult<ActionHash>`

Announce an NDO to the global Lobby DHT so other agents can discover it. Creates three discovery links.

**Input:**
```rust
pub struct AnnounceNdoInput {
    pub ndo_name: String,
    pub ndo_dna_hash: DnaHash,
    pub network_seed: String,
    pub ndo_identity_hash: ActionHash,
    pub lifecycle_stage: LifecycleStage,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub description: Option<String>,
}
```

**Business Logic:**
1. Creates a `NdoAnnouncement` entry with `registered_by = agent_info().agent_initial_pubkey`
2. Creates `AllNdoAnnouncements` link: `Path("lobby.ndos")` → entry (global discovery)
3. Creates `AgentToNdoAnnouncements` link: agent pubkey → entry (agent-centric discovery)
4. Creates `NdoAnnouncementByLifecycle` link: `Path("lobby.ndo.lifecycle.{stage}")` → entry (filtered discovery)

**Returns:** Action hash of the created `NdoAnnouncement` entry.

---

#### `get_all_ndo_announcements(_: ()) -> ExternResult<Vec<NdoAnnouncementRecord>>`

Get all NDO announcements from the global discovery anchor (`Path("lobby.ndos")`). Each result is resolved to its latest lifecycle stage update.

**Returns:** `Vec<NdoAnnouncementRecord>` containing the original `action_hash` and latest `NdoAnnouncement` entry.

---

#### `get_my_ndo_announcements(_: ()) -> ExternResult<Vec<NdoAnnouncementRecord>>`

Get all NDO announcements registered by the calling agent, via the `AgentToNdoAnnouncements` links from the agent's pubkey.

---

### Group Functions (Stub)

#### `get_my_groups(_: ()) -> ExternResult<Vec<GroupDescriptorStub>>`

Returns the calling agent's group memberships. **Stub implementation** — returns a single solo workspace entry until the Group DNA is implemented in issue #101.

```rust
pub struct GroupDescriptorStub {
    pub id: String,    // "solo"
    pub name: String,  // "Solo workspace"
    pub is_solo: bool, // true
}
```

---

## Helper Functions

### `resolve_update_chain(original: ActionHash) -> ExternResult<ActionHash>`

Walks an update chain by repeatedly calling `get_details` and following `updates` until reaching a record with no further updates. Returns the most recent action hash in the chain, determined by `action().timestamp()`.

Used by both `get_lobby_agent_profile` / `get_all_lobby_agents` (for `LobbyAgentProfile` entries) and `get_all_ndo_announcements` / `get_my_ndo_announcements` (for `NdoAnnouncement` entries).

---

## Sweettest Coverage

Tests for this zome live in `dnas/lobby/tests/src/lobby/mod.rs` (`package: lobby_sweettest`).

| Test | Coverage |
|---|---|
| `announce_ndo_single_agent` | Single-agent creation + read via `get_all_ndo_announcements` |
| `announce_ndo_cross_conductor` | Cross-conductor DHT consistency via `await_consistency` |
| `upsert_lobby_agent_profile` | Create + update profile, verify via `get_lobby_agent_profile` |
| `get_my_groups_returns_stub` | Stub always returns solo workspace |

**Run:**
```bash
bun run build:happ
CARGO_TARGET_DIR=target/native-tests cargo test --package lobby_sweettest --test lobby
```
