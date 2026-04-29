# Rust Zome Development Patterns

> **Navigation index.** Sources of truth are in `documentation/` and `CLAUDE.md`.
> For full entry type definitions, read `documentation/specifications/specifications.md §4`.
> For review checklist, read `REVIEW.md`.

## Entry Creation (Standard Pattern)
Source: `CLAUDE.md — Key Development Patterns`, `documentation/specifications/specifications.md §4`

```rust
let entry = EntryType {
    field: value,
    agent_pub_key: agent_info()?.agent_initial_pubkey,
    created_at: sys_time()?,
};
let hash = create_entry(EntryTypes::EntryType(entry.clone()))?;

// Create discovery anchor links
let path = Path::from("all_entry_types");
create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::AllEntryTypes, LinkTag::new("tag"))?;
// Create agent-centric link
let my_key = agent_info()?.agent_initial_pubkey;
create_link(my_key, hash.clone(), LinkTypes::AgentToEntryType, ())?;
```

## Update Pattern
Source: `CLAUDE.md — Key Development Patterns`

```rust
let updated_hash = update_entry(original_action_hash, EntryTypes::EntryType(updated.clone()))?;
// Create update chain link for traversal
create_link(original_action_hash, updated_hash, LinkTypes::EntryTypeUpdates, ())?;
```

## Validation Pattern (Integrity Zome)
Source: `documentation/specifications/specifications.md §5`

```rust
pub fn validate_create_entry_type(
    _action: EntryCreationAction,
    entry: EntryType,
) -> ExternResult<ValidateCallbackResult> {
    if entry.field.is_empty() {
        return Ok(ValidateCallbackResult::Invalid("field cannot be empty".into()));
    }
    Ok(ValidateCallbackResult::Valid)
}
```

## Cross-Zome Calls
Source: `documentation/specifications/specifications.md §3.2`, `REVIEW.md §3`

```rust
// From resource coordinator to governance coordinator
let result: ExternResult<GovernanceTransitionResult> = call(
    CallTargetCell::Local,
    ZomeName::from("zome_gouvernance"),
    FunctionName::from("evaluate_state_transition"),
    None,
    &request,
)?;
```

## Private Entries (PPR Storage)
Source: `documentation/specifications/specifications.md §3.3.6`, `.claude/skills/nondominium-domain/ppr-system.md`

Private entries are not linked in DHT. Access via `query()` on source chain:
```rust
let records = query(ChainQueryFilter::new().entry_type(EntryType::App(AppEntryDef {
    entry_index: PPR_ENTRY_INDEX.into(),
    zome_index: zome_info()?.id,
    visibility: EntryVisibility::Private,
})))?;
```

## Debug in Tests
Source: `CLAUDE.md — Test Development Tips`

Use `warn!` macro — output visible in Sweettest console:
```rust
warn!("Processing NDO: action_hash = {:?}", action_hash);
warn!("Lifecycle transition: {:?} → {:?}", from, to);
```

## Patterns from REVIEW.md
Source: `REVIEW.md` — read in full before any PR

- ACCEPT: `Ok(())`, exhaustive `match` arms, anchor discovery chains
- FLAG: Cross-zome direct imports (must use `call()`), PPR grants >30 days,
  missing capability check on EncryptedProfile exposure
