# Rust Zome Development Patterns

## Entry Creation (Standard Pattern)
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
```rust
let updated_hash = update_entry(original_action_hash, EntryTypes::EntryType(updated.clone()))?;
// Create update chain link for traversal
create_link(original_action_hash, updated_hash, LinkTypes::EntryTypeUpdates, ())?;
```

## Validation Pattern (Integrity Zome)
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
Private entries are not linked in DHT. Access via `query()` on source chain:
```rust
let records = query(ChainQueryFilter::new().entry_type(EntryType::App(AppEntryDef {
    entry_index: PPR_ENTRY_INDEX.into(),
    zome_index: zome_info()?.id,
    visibility: EntryVisibility::Private,
})))?;
```

## Debug in Tests
Use `warn!` macro — output visible in Sweettest console:
```rust
warn!("Processing NDO: action_hash = {:?}", action_hash);
warn!("Lifecycle transition: {:?} → {:?}", from, to);
```

## Patterns from REVIEW.md
- ACCEPT: `Ok(())`, exhaustive `match` arms, anchor discovery chains
- FLAG: Cross-zome direct imports (must use `call()`), PPR grants >30 days,
  missing capability check on EncryptedProfile exposure
