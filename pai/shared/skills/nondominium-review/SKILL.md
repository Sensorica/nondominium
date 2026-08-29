---
name: nondominium-review
description: >
  The shared pull request review procedure for nondominium. Gathers the diff, walks the
  six REVIEW.md check areas in a fixed order, applies the CONTRIBUTING.md merge criteria,
  and emits a verdict in a fixed shape so two different reviewers produce comparable
  output. USE WHEN reviewing a pull request, review this PR, is this PR ready to merge,
  PR review, code review on nondominium, approve or request changes, merge readiness.
license: AGPL-3.0
metadata:
  author: nondominium
  version: "1.0.0"
---

# Nondominium Review Skill

The review standard for this repository, in executable form. It exists so that a review is something any collaborator or agent can run and get the same shape of answer from, rather than a judgement that only one person's private tooling knows how to produce.

**This skill is the procedure. `REVIEW.md` is the content.** What to flag and what to accept lives in `REVIEW.md` and is not restated here; two copies of a checklist drift apart within a month. What lives here is the order of operations, the merge criteria, and the output contract.

## Inputs

Any of: a PR number, a branch name, or nothing (review the working diff against `dev`).

```bash
gh pr view <N> --json number,title,body,headRefName,baseRefName,isDraft,files
gh pr diff <N>
gh pr checks <N>
```

## Procedure

### Step 1 — Establish what changed

Read the diff before reading any opinion about it, including the PR description. Get the file list, then read the changed hunks. A review written from the PR body rather than the diff is a summary, not a review.

### Step 2 — Walk the six check areas, in this order

Each maps to a numbered section of `REVIEW.md`. Read that section before judging that area; the "Accept these patterns" lists exist to stop reviewers flagging correct Holochain idiom as a defect.

| Order | Area | `REVIEW.md` section |
|---|---|---|
| 1 | Holochain entry patterns | §1 |
| 2 | Capability and security model | §2 |
| 3 | ValueFlows compliance | §3 |
| 4 | Test coverage (Sweettest) | §4 |
| 5 | Zome boundary integrity | §5 |
| 6 | Documentation currency | §6 |

Security first among the substantive areas, because a capability leak is the one defect class this codebase cannot roll back once it is on a DHT.

### Step 3 — Apply the complexity lens

Nondominium is coordination infrastructure, not a deterministic application. Beyond the six areas, ask whether the change holds up as coordination structure: does it assume a global view the DHT cannot provide, does it centralise a decision that the governance zome should evaluate, does it add coupling that makes a zome boundary harder to move later. The `complexity-oriented-programming` skill in this repo carries the vocabulary for this.

### Step 4 — Check the merge criteria

From `CONTRIBUTING.md`, all of which are mechanical and none of which are judgement:

- [ ] PR targets `dev`, not `main` (a release PR from `dev` to `main` is the only exception)
- [ ] Branch name matches `{type}/issue-{N}-{slug}` or `{type}/{slug}`
- [ ] Commits follow Conventional Commits with a valid scope
- [ ] The PR template sections are filled, not left as comments
- [ ] Documentation updated per `REVIEW.md` §6, or the PR states why none was needed

If the branch resolved a merge conflict, review the resolution as its own finding under `CONTRIBUTING.md` § Resolving Merge Conflicts. The question is whether a presentational change overwrote a semantic one: check that a rewrite arriving through a conflict did not drop the other side's meaning, that no `EntryTypes` or `LinkTypes` variant moved position, and that the PR says what was resolved and how it was checked. `git log --merges` and the range diff against the base show what was touched. A resolution the author cannot explain is a blocking finding, not a style note.

### Step 5 — Wait for the whole CI pipeline

**Do not post an approval while any check is still running.** The pipeline is staged: `build`, then five sharded `sweettest` targets, then `e2e`. Later jobs are gated behind earlier ones, so a run that looks green early may still fail at the last stage.

```bash
gh pr checks <N> --watch
```

This step is written down because skipping it has already cost a public correction: an approval posted on the strength of early-passing shards had to be retracted when `e2e` failed afterwards. If the pipeline is not finished, the verdict is `BLOCKED`, never `APPROVE`.

## Output contract

Every review ends in exactly this shape. The verdict word is one of `APPROVE`, `CHANGES REQUESTED`, or `BLOCKED`.

```markdown
## Verdict: <APPROVE | CHANGES REQUESTED | BLOCKED>

<One sentence saying why, naming the deciding factor.>

### Blocking

<Numbered. Each: file:line, what is wrong, what would fix it. Empty section omitted.>

### Non-blocking

<Numbered. Suggestions the author may take or leave. Empty section omitted.>

### Checks

| Area | Result |
|---|---|
| Entry patterns | pass / n-a / <finding count> |
| Capability and security | pass / n-a / <finding count> |
| ValueFlows compliance | pass / n-a / <finding count> |
| Test coverage | pass / n-a / <finding count> |
| Zome boundaries | pass / n-a / <finding count> |
| Documentation currency | pass / n-a / <finding count> |
| Conflict resolution | n-a / pass / <finding count> |
| Merge criteria | pass / <what is missing> |
| CI | green / failing: <job> / still running |
```

Rules on the verdict:

- **`BLOCKED`** when CI has not finished, or has failed, or the PR is still a draft. Nothing about the code is being judged; the gate simply is not open.
- **`CHANGES REQUESTED`** when the Blocking section is non-empty.
- **`APPROVE`** only when Blocking is empty and CI is fully green. Non-blocking findings never hold up an approval.

Anchor every finding to `file:line`. A finding that cannot be anchored is an impression, and impressions go in the Non-blocking section or nowhere.

## Boundaries

**Will:** read the diff and the CI state, apply `REVIEW.md` and `CONTRIBUTING.md`, and emit the verdict block above.

**Will not:** merge the PR, mark it ready for review, push to the author's branch, or approve on a pipeline that has not finished. One human approval is still required before merge and this skill does not substitute for it.
