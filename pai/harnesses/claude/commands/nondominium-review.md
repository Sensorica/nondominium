---
name: nondominium-review
description: "Review a nondominium pull request against REVIEW.md and CONTRIBUTING.md, and report merge readiness in this project's verdict shape."
argument-hint: "[PR number, or empty for the current branch]"
---

Run the project's shared review procedure on $ARGUMENTS (a PR number, or the current branch when empty).

Read `.claude/skills/nondominium-review/SKILL.md` and follow it exactly. It is the procedure of record for this repository: the order the six `REVIEW.md` areas get walked, the `CONTRIBUTING.md` merge criteria, the merge-conflict check, and the verdict block every review ends in. The skill is generated from `pai/shared/skills/nondominium-review/` by `nix develop`, so it is the same procedure whichever editor or assistant a contributor runs.

**This command needs nothing outside this repository.** Everything it depends on is committed here: the skill, `REVIEW.md`, `CONTRIBUTING.md`. That is the point of it existing as a project command rather than as a personal one.

If a general-purpose PR review skill happens to be installed on the machine, use it only for forge mechanics: fetching the diff, reading CI state, posting comments. The judgement, the check order, and the verdict shape still come from `nondominium-review`. A project's own rules outrank a general reviewer's defaults, and a review that silently applied another repo's conventions is the failure this command exists to prevent.

Without one, `gh` covers the mechanics:

```bash
gh pr view <N> --json number,title,body,headRefName,baseRefName,isDraft,files
gh pr diff <N>
gh pr checks <N>
```

Two rules from the skill are worth restating because they are the ones most often skipped under time pressure:

- **Read the diff before the description.** A review written from the PR body is a summary, not a review.
- **Never post a verdict while CI is still running.** Our stages are chained (`build`, then five sharded `sweettest` targets, then `e2e`), so early green says nothing about the end. If the pipeline has not settled, the verdict is `BLOCKED`.
