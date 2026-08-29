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

**How to review:** Follow the `nondominium-review` skill (`pai/shared/skills/nondominium-review/`). It is the shared procedure: the order the six `REVIEW.md` areas get walked, the merge criteria checked, and the verdict shape every review ends in. It is materialized into `.claude/skills/`, `.cursor/skills/`, and `.agents/skills/` by `nix develop`, so the same procedure runs whichever editor or assistant you use. Reviewing by hand is fine; the point is that the standard is one both of us can read and run, not one that lives in a single person's tooling.

**Never approve on a pipeline that has not finished.** The CI stages are chained (`build` → `sweettest` → `e2e`), so early-passing jobs say nothing about the later ones. Wait for `gh pr checks <N> --watch` to settle before posting a verdict.

**Merge method:** Squash merge — keeps `dev` history clean, one commit per feature.

---

## Resolving Merge Conflicts

The governing question is never "which version reads better". It is **which side was trying to change meaning, and which side was only trying to restate it.**

### The intention rule

Every conflicting hunk carries an intent. Sort the two sides before touching either:

- **Semantic** — changes what the system does or what a requirement obliges. New validation, a changed enum variant, a corrected `REQ-*`, a different default.
- **Presentational** — says the same thing differently. A rewrite, a reformulation, a reformat, a reordering, a clearer sentence.

**Presentational yields to semantic, always.** A rewrite must never quietly overwrite a behaviour change or a meaning change because it arrived later or reads better. Keeping the better wording is fine; keeping it *and dropping the other side's meaning* is the failure. If you keep a rewrite, carry the semantic change into it and say so in the PR.

**When both sides are semantic, you do not resolve it alone.** That is a decision between two authors, not a merge mechanic. Resolve provisionally, mark it clearly, and ask the other author on the PR before it is merged. Guessing here is precisely what this rule exists to prevent.

### What "fundamental" means in this project

- **Documentation** — a `REQ-*` entry's meaning is fundamental; its phrasing is not. If resolving a conflict changes what a requirement obliges, that is a scope change and needs its own discussion, not a merge commit.
- **Business logic** — the validation a function enforces and the state transitions it permits are fundamental. Naming, structure and factoring are not. A refactor arriving through a conflict must leave behaviour identical.
- **Ontology** — Valueflows field names and the NDO layer boundaries are fundamental. Nothing is ever resolved by renaming a VF field or moving a field between layers.

### Prove the resolution, do not assert it

A resolved conflict is a claim that meaning survived. Back it with evidence:

- **Code** — the Sweettest target covering the touched zome passes: `cargo test --package nondominium_sweettest --test <target>`. If nothing covers the resolved behaviour, that absence is the finding; write the test.
- **Documentation** — re-read the resolved section against the `REQ-*` or specification it describes and confirm both still say the same thing.
- **Lock files** (`Cargo.lock`, `bun.lock`, `flake.lock`) — never hand-resolved. Take either side, regenerate, commit the regenerated file.

Say in the PR what you resolved and how you checked it. A commit message reading "resolved conflicts" tells the reviewer nothing, and the reviewer is the person who has to trust it.

### Mechanics

Rebase onto `dev`; never merge `dev` into your branch. We squash-merge, so a rebase keeps the branch one clean commit while a merge commit adds noise the squash then hides. Rebase early and often: conflict size scales with how long a branch has been open, and both conflicting branches in this repo today are long-lived drafts.

### Known hotspots

| File | Why it conflicts | Resolution |
|---|---|---|
| `.rules` | one 181-line file that every agent-config change touches | Edits are usually in different sections, so both sides normally survive. Keep both unless they genuinely contradict. |
| integrity `lib.rs` (`EntryTypes`, `LinkTypes`) | both sides append variants to the same enum | Keep both variants, **appended at the end**. `#[hdk_entry_types]` and `#[hdk_link_types]` derive type indices from declaration order, so inserting a variant in the middle, or tidying the enum into alphabetical order while resolving, silently invalidates every entry already on the DHT. This is the intention rule in its sharpest form: the cosmetically nicer resolution is the one that breaks the data. |

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

Running `nix develop` materializes three AI asset directories (all gitignored):
- `.claude/` — Claude Code settings and skills
- `.cursor/` — Cursor always-loaded rules and skills
- `.agents/skills/` — Open Agent Skills for VS Code Copilot and compatible editors

### Source files and what they drive

| Source | Drives | When to edit |
|---|---|---|
| `documentation/TELOS.md` | `.cursor/rules/00-telos.mdc` + Claude Code context via `.rules` | Project purpose / operating principles changed |
| `pai/shared/conventions.md` | `.cursor/rules/10-conventions.mdc` | Coding/process conventions changed |
| `pai/shared/rules/*.md` | `.cursor/rules/20-50-*.mdc` | Architecture, Rust, Svelte, or test patterns changed |
| `pai/shared/skills/*/` | `.claude/skills/`, `.cursor/skills/`, `.agents/skills/` | A skill changed. These are harness-agnostic; every tool gets them |
| `pai/harnesses/claude/` | `.claude/settings.json` | Claude Code settings changed. Harness-specific source only |
| flake input `holochain-agent-skill` | the `holochain` skill in all three trees | Run `nix flake update holochain-agent-skill` to pin a new version |

`pai/shared/` is harness-agnostic and `pai/harnesses/` holds adapters. A directory appears under `harnesses/` only when a tool needs source files of its own; Cursor has none, because its adapter (`nix/cursor-pai.nix`) is a pure transform. Full architecture: `pai/README.md`.

After editing any `pai/` file: `exit` the nix shell and `nix develop` to regenerate. For a faster loop while iterating on a skill, `bun run pai:sync` copies `pai/shared/skills/` straight from the working tree. Note that nix only sees git-tracked files, so a newly created skill must be committed before `nix develop` picks it up; nothing errors, the skill is simply never invoked.

The `.claude/`, `.cursor/`, and `.agents/` directories are generated and gitignored. Never edit them directly.

---

## Questions?

Open an issue or ping in the team channel.
