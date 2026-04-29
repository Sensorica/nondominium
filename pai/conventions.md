# Nondominium Project Conventions

> **This file is a quick-reference index for AI agents.**
> Sources of truth are in `documentation/`. When content here conflicts with
> `documentation/`, `documentation/` wins.

## Source Map

| Convention area | Canonical source |
|---|---|
| Branch model, commit format, PR process | `CONTRIBUTING.md` |
| Rust zome patterns, cross-zome calls, debug | `CLAUDE.md` + `documentation/specifications/specifications.md` |
| TypeScript / Svelte 5 / Effect-TS patterns | `CLAUDE.md` + `documentation/specifications/specifications.md §7` |
| Testing infrastructure | `CLAUDE.md` + `documentation/Testing_Infrastructure.md` |
| PR review checklist | `REVIEW.md` |
| Architecture and data model | `documentation/specifications/specifications.md` |
| Requirements and ontology | `documentation/requirements/requirements.md` |
| Project vision and AI operating principles | `documentation/TELOS.md` |

## Branch Model
Source: `CONTRIBUTING.md`

- `main` — production-stable, tagged releases only
- `dev` — integration branch, always deployable; all PRs target this
- Feature branches: `feat/<slug>`, fix: `fix/<slug>`, etc. (Conventional Commits prefixes)
- Open PR targeting `dev`. One approval required. Squash merge to keep `dev` clean.

## Commit Format
Source: `CONTRIBUTING.md`

Conventional Commits. Scopes: `person`, `resource`, `governance`, `ui`, `tests`,
`hrea`, `ci`, `nix`, `docs`. Example: `feat(resource): add NdoTransitionHistory`.

## Rust Conventions
Source: `CLAUDE.md` — Key Development Patterns

- `#[hdk_extern]` on every public zome function
- Entry creation: `create_entry(EntryTypes::X(x.clone()))` then create anchor links
- Anchor naming: `"all_[plural_type]"` (e.g., `"all_persons"`, `"all_ndos"`)
- Debug via `warn!("Checkpoint: {:?}", value)` — visible in Sweettest output
- Cross-zome calls: use HDK `call()`, never direct imports across zome boundaries

## TypeScript Conventions
Source: `CLAUDE.md` + `documentation/specifications/specifications.md §7`

- All zome calls wrapped via `wrapZomeCallWithErrorFactory` (Effect-TS)
- Services are `Context.Tag` / `Layer` values in Effect-TS
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props` — not `$:` reactive
- UnoCSS for styling; Melt UI next-gen (`melt`) for headless components — not shadcn

## File Naming
Source: `CLAUDE.md`

- Rust: `snake_case.rs`
- TypeScript/Svelte: `kebab-case.ts`, `PascalCase.svelte` for components
- Test files: match the zome name, e.g., `person.rs`, registered in `Cargo.toml [[test]]`

## Testing
Source: `CLAUDE.md` — Testing Commands + `documentation/Testing_Infrastructure.md`

- **Primary:** Sweettest (Rust) in `dnas/nondominium/tests/src/`
- `setup_two_agents()` / `setup_three_agents()` from `common::conductors`
- Multi-agent tests call `await_consistency(&[&cell_a, &cell_b]).await.unwrap()`
- **Deprecated:** Tryorama (`tests/` directory); do not add new tests there
- Run: `CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest`

## PR Checklist
Source: `REVIEW.md` — read before proposing any PR-shaped change

- Every new `#[hdk_extern]` needs a Sweettest test
- ValueFlows: EconomicEvents must have all required fields; PPR claim types from the 16-category enum
- Capability checks on functions that expose EncryptedProfile or role-privileged data
- Documentation updated per the table in `REVIEW.md §6`

## `pai/` Editing Workflow

- Edit `documentation/TELOS.md` → updates both Claude Code (via CLAUDE.md `@` reference) and
  Cursor (on next `nix develop`, symlinked or copied)
- Edit `pai/conventions.md` → updates both Claude Code and Cursor
- Edit `pai/cursor-rules/*.md` → updates Cursor rules only (on next `nix develop`)
- Edit `.claude/skills/nondominium-domain/*` → updates Claude Code skills immediately
  (no rebuild needed)
