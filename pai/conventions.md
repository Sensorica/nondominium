# Nondominium Project Conventions

Distilled from `CLAUDE.md`, `CONTRIBUTING.md`, and `REVIEW.md`. Complements
AGENTS.md (commands/patterns) with style and process.

## Branch Model
- `main` — production-stable, tagged releases only
- `dev` — integration branch, always deployable; all PRs target this
- Feature branches: `feat/<slug>`, fix: `fix/<slug>`, etc. (Conventional Commits prefixes)
- Open PR targeting `dev`. One approval required. Squash merge to keep `dev` clean.

## Commit Format
Conventional Commits. Scopes: `person`, `resource`, `governance`, `ui`, `tests`,
`hrea`, `ci`, `nix`, `docs`. Example: `feat(resource): add NdoTransitionHistory`.

## Rust Conventions
- `#[hdk_extern]` on every public zome function
- Entry creation: `create_entry(EntryTypes::X(x.clone()))` then create anchor links
- Anchor naming: `"all_[plural_type]"` (e.g., `"all_persons"`, `"all_ndos"`)
- Debug via `warn!("Checkpoint: {:?}", value)` — visible in Sweettest output
- Cross-zome calls: use HDK `call()`, never direct imports across zome boundaries

## TypeScript Conventions
- All zome calls wrapped via `wrapZomeCallWithErrorFactory` (Effect-TS)
- Services are `Context.Tag` / `Layer` values in Effect-TS
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props` — not `$:` reactive
- UnoCSS for styling; Melt UI next-gen (`melt`) for headless components — not shadcn

## File Naming
- Rust: `snake_case.rs`
- TypeScript/Svelte: `kebab-case.ts`, `PascalCase.svelte` for components
- Test files: match the zome name, e.g., `person.rs`, registered in `Cargo.toml [[test]]`

## Testing
- **Primary:** Sweettest (Rust) in `dnas/nondominium/tests/src/`
- `setup_two_agents()` / `setup_three_agents()` from `common::conductors`
- Multi-agent tests call `await_consistency(&[&cell_a, &cell_b]).await.unwrap()`
- **Deprecated:** Tryorama (`tests/` directory); do not add new tests there
- Run: `CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest`

## PR Checklist (See `REVIEW.md` for full details)
- Every new `#[hdk_extern]` needs a Sweettest test
- ValueFlows: EconomicEvents must have all required fields; PPR claim types from the 16-category enum
- Capability checks on functions that expose EncryptedProfile or role-privileged data
- Documentation updated per the table in `REVIEW.md §6`

## `pai/` Editing Workflow
- Edit `pai/TELOS.md` or `pai/conventions.md` → updates both Claude Code (via hook) and
  Cursor (on next `nix develop`)
- Edit `pai/cursor-rules/*.md` → updates Cursor rules only (on next `nix develop`)
- Edit `.claude/skills/nondominium-domain/*` → updates Claude Code skills immediately
  (no rebuild needed)
