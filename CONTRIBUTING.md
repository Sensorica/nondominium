# Contributing to Nondominium

Development workflow for the Soushi + Tibi core team.

---

## Branch Model

```
main          ← production-stable, tagged releases only
  └── dev     ← integration branch, always deployable
        └── feat/issue-N-short-slug    ← feature work
        └── fix/issue-N-short-slug     ← bug fixes
        └── refactor/short-slug        ← refactoring
        └── docs/short-slug            ← documentation
        └── chore/short-slug           ← maintenance, deps, config
```

**Rules:**
- `main` — no direct pushes. Only merges from `dev` via PR when cutting a release.
- `dev` — integration branch. Feature PRs land here first.
- Feature branches — fork from `dev`, PR back to `dev`. Short-lived.

---

## Starting a Feature

```bash
git checkout dev
git pull origin dev
git checkout -b feat/issue-N-short-slug
```

Branch name format: `{type}/issue-{N}-{slug}` or `{type}/{slug}` when not tied to an issue.

| Type | When |
|------|------|
| `feat` | New capability |
| `fix` | Bug fix |
| `refactor` | Restructure without behavior change |
| `docs` | Documentation only |
| `chore` | Deps, config, CI, maintenance |
| `test` | Tests only |

Examples:
- `feat/issue-56-resource-lifecycle`
- `fix/issue-42-capability-grant-validation`
- `chore/bump-holochain-0-4`
- `docs/governance-zome-api`

---

## Commit Messages

Conventional Commits format — already in use, keep it consistent.

```
{type}({scope}): imperative verb + specific object
```

**Scopes:** `person`, `resource`, `governance`, `ui`, `tests`, `hrea`, `ci`, `nix`, `docs`

```
feat(governance): add resource claim validation
fix(person): capability grant not persisting across conductor restart
refactor(resource): extract lifecycle state machine into module
docs(governance): add PPR system sequence diagram
chore(ci): extend build check to dev branch PRs
test(person): add multi-agent capability revocation scenario
```

Breaking changes: add `!` after the scope, or add `BREAKING CHANGE:` footer.

```
feat(governance)!: rename EconomicEvent fields to match ValueFlows 2.0
```

---

## Opening a Pull Request

1. Push your branch: `git push -u origin feat/issue-N-slug`
2. Open PR **targeting `dev`** (not `main`)
3. Fill the PR template (Intent, Changes, Decisions, How to test, Documentation, Related)
4. Open as **Draft** while work is in progress
5. Mark **Ready for Review** when complete and CI passes

**Review:** One approval required before merge. Soushi reviews Tibi's PRs, Tibi reviews Soushi's. Mexi is notified for visibility but doesn't block merges.

**Merge method:** Squash merge — keeps `dev` history clean, one commit per feature.

---

## Releasing to main

When `dev` is stable and ready for a release:

1. Open a PR from `dev` to `main`
2. PR title: `release: vX.Y.Z`
3. Merge using **merge commit** (preserves the release boundary in history)
4. Tag immediately after merge: `git tag vX.Y.Z && git push origin vX.Y.Z`

**Versioning:** Semantic versioning. Increment:
- `MAJOR` for breaking changes to zome APIs or DNA hash
- `MINOR` for new features (backward-compatible)
- `PATCH` for bug fixes and docs

---

## Branch Cleanup

Delete feature branches after merge:
```bash
git branch -d feat/issue-N-slug           # local
git push origin --delete feat/issue-N-slug  # remote
```

GitHub's "Delete branch" button on the merged PR does both.

---

## CI

The build pipeline runs on:
- Push to `main`
- PRs targeting `main`
- PRs targeting `dev`

Checks: Nix environment, `bun install`, `build:happ` (WASM compilation).

Tests are included but non-blocking while the test suite is being stabilized. Once stable, tests will be promoted to a required check.

---

## Worktrees (Soushi)

Soushi uses git worktrees for feature branches (via PAI tooling). Worktrees live in
`.worktrees/` (gitignored). If you see a `.worktrees/` directory, that's normal.

Tibi: standard `git checkout` workflow works fine — worktrees are optional.

---

## Current Branch State (as of 2026-03)

| Branch | Status | Action |
|--------|--------|--------|
| `main` | Production-stable | Protected — PR only |
| `dev` | Integration | Active — base for new features |
| `feat/issues-51-52-53-55-hrea-person-bridge` | In-progress hREA Phase 1 | PR to `dev` when ready |

---

## AI Tooling Conventions

Running `nix develop` materializes two AI asset directories (both gitignored):
- `.cursor/rules/` — Cursor always-loaded rules from `pai/`
- `.agents/skills/` — Open Agent Skills for Cursor, VS Code Copilot, and compatible editors

### Source files and what they drive

| Source | Drives | When to edit |
|---|---|---|
| `documentation/TELOS.md` | `.cursor/rules/00-telos.mdc` + Claude Code session context | Project purpose / operating principles changed |
| `pai/conventions.md` | `.cursor/rules/10-conventions.mdc` | Coding/process conventions changed |
| `pai/cursor-rules/*.md` | `.cursor/rules/20-50-*.mdc` | Architecture, Rust, Svelte, or test patterns changed |
| `.claude/skills/nondominium-domain/` | `.agents/skills/nondominium-domain/` + Claude Code | NDO domain knowledge updated (no rebuild needed) |
| `.claude/skills/holochain-agent-skill/` | `.agents/skills/holochain/` | Submodule update only — don't edit directly |

After editing any `pai/` file: `exit` the nix shell and `nix develop` to regenerate.
Skill changes (`.claude/skills/nondominium-domain/`) take effect immediately in Claude Code.
The `.cursor/` and `.agents/` directories are gitignored.

---

## Questions?

Open an issue or ping in the team channel.
