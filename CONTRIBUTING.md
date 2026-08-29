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

**How to review:** Follow the `nondominium-review` skill (`pai/claude/skills/nondominium-review/`). It is the shared procedure: the order the six `REVIEW.md` areas get walked, the merge criteria checked, and the verdict shape every review ends in. It is materialized into `.claude/skills/`, `.cursor/skills/`, and `.agents/skills/` by `nix develop`, so the same procedure runs whichever editor or assistant you use. Reviewing by hand is fine; the point is that the standard is one both of us can read and run, not one that lives in a single person's tooling.

**Never approve on a pipeline that has not finished.** The CI stages are chained (`build` → `sweettest` → `e2e`), so early-passing jobs say nothing about the later ones. Wait for `gh pr checks <N> --watch` to settle before posting a verdict.

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

Two workflows run:

| Workflow | Jobs | Blocking |
|---|---|---|
| `build.yml` | `build` (nix, `bun install`, `build:happ`) → `sweettest` (5 sharded targets) → `e2e` (Playwright) | Yes — the stages are chained, so a failure anywhere stops the rest |
| `lint.yml` | `rustfmt` status report | No — advisory while the formatting backlog is cleared |

The chaining is the reason a review must wait for the whole pipeline rather than the first green check: `e2e` does not even start until all five `sweettest` shards pass.

`lint.yml` is advisory on purpose. Most Rust files in the workspace are not rustfmt-clean, and a blocking gate would fail every PR until someone reformats the workspace, which cannot happen safely while several branches are open. It reports the count on each PR so the debt is visible. Making it blocking is a one-line change once a dedicated formatting PR has landed.

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
| `pai/claude/skills/nondominium-domain/` | `.claude/skills/nondominium-domain/` + `.agents/skills/nondominium-domain/` | NDO domain knowledge updated; run `nix develop` to regenerate |
| `pai/claude/skills/nondominium-review/` | same three trees, as `nondominium-review` | The shared review procedure changed. Note it routes to `REVIEW.md` rather than restating it, so a change to what gets flagged belongs in `REVIEW.md` |
| `pai/claude/skills/complexity-oriented-programming/` | same three trees | Coordination-design vocabulary updated |
| flake input `holochain-agent-skill` | `.claude/skills/holochain/` + `.agents/skills/holochain/` | Run `nix flake update holochain-agent-skill` to pin a new version |

After editing any `pai/` file: `exit` the nix shell and `nix develop` to regenerate.
The `.claude/`, `.cursor/`, and `.agents/` directories are gitignored — never edit them directly.

---

## Questions?

Open an issue or ping in the team channel.
