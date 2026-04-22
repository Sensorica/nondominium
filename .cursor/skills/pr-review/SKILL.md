---
name: pr-review
description: Reviews pull requests for code quality, description compliance, merge state, CI, and docs gates; outputs APPROVE / REQUEST CHANGES / DISCUSS. Use when reviewing PRs or MRs, merge readiness, gh pr view, GitLab MRs, or when the user asks for a structured PR review.
---

# Pull request review

Perform a structured review of the pull request identified in the user message (PR/MR number, URL, or branch context). If no identifier is given, detect the PR from the current branch where the platform CLI supports it.

## Platform detection

Run:

```bash
REMOTE=$(git remote get-url origin 2>/dev/null)
if echo "$REMOTE" | grep -q "github\.com"; then
  GIT_PLATFORM="github"
elif echo "$REMOTE" | grep -q "gitlab"; then
  GIT_PLATFORM="gitlab"
elif echo "$REMOTE" | grep -q -E "(gitea|codeberg\.org)"; then
  GIT_PLATFORM="gitea"
else
  GIT_PLATFORM="unknown"
fi
echo "$GIT_PLATFORM"
```

If `GIT_PLATFORM` is `unknown`, stop and report that the git hosting platform cannot be detected.

## Step 0 — Project-specific review guidelines

```bash
for f in REVIEW.md REVIEWING.md .github/REVIEW.md docs/REVIEW.md PR_GUIDELINES.md; do
  [ -f "$f" ] && { echo "Found: $f"; cat "$f"; break; }
done
```

If a file is found, treat its contents as mandatory extra criteria. Violations are REQUEST CHANGES items.

## Step 1 — Gather PR context

Resolve `owner`, `repo`, and PR/MR number from the CLI output or remote URL as needed for API calls.

**GitHub**

```bash
# With PR number from user message:
gh pr view <PR> --json number,title,body,baseRefName,headRefName,url,state,mergeable,mergeStateStatus,files,reviews,comments,reviewRequests

# If no number — current branch:
gh pr view --json number,title,body,baseRefName,headRefName,url,state,mergeable,mergeStateStatus,files,reviews,comments,reviewRequests
```

For inline review comments, use `gh api` with the repo’s `owner`, `repo`, and PR number, for example:

```bash
gh api "repos/OWNER/REPO/pulls/PR_NUMBER/comments" \
  --jq '[.[] | {author: .user.login, path: .path, line: .line, body: .body}]'
```

**GitLab**

```bash
glab mr view <MR> --output json
# For discussions, encode project path and call API with namespace/repo and MR number.
```

**Gitea**

```bash
tea pr view <PR>
tea api "repos/OWNER/REPO/pulls/PR_NUMBER/reviews" | jq '.'
```

Extract: PR number, title, base and head refs, state, merge state, changed files, existing comments and reviews. Use comment threads to avoid repeating resolved issues and to highlight unresolved discussion.

## Step 2 — Diff

Substitute `baseRefName` and `headRefName` from Step 1:

```bash
git fetch origin BASE_REF HEAD_REF 2>/dev/null
git diff origin/BASE_REF...origin/HEAD_REF --name-only
git diff origin/BASE_REF...origin/HEAD_REF --stat
```

## Step 2.5 — Conflict / sync check

**GitHub** — use `mergeable` and `mergeStateStatus` from Step 1:

| `mergeable` | `mergeStateStatus` | Action |
| --- | --- | --- |
| `MERGEABLE` | `CLEAN` | Proceed |
| `MERGEABLE` | `BEHIND` | REQUEST CHANGES: branch is behind base — rebase to sync |
| `CONFLICTING` | `DIRTY` | REQUEST CHANGES: resolve merge conflicts before merge |
| `UNKNOWN` | any | Note that conflict status is pending |
| `MERGEABLE` | `BLOCKED` | Note informational |

**GitLab:** use `merge_status` and `has_conflicts` from Step 1 JSON.

**Gitea:**

```bash
tea api "repos/OWNER/REPO/pulls/PR_NUMBER" | jq '{mergeable: .mergeable}'
```

## Step 3 — PR description compliance

Check the PR body against guidelines from Step 0. Default checks:

| Section | Check |
| --- | --- |
| Intent / why | Present and answers why |
| Changes | Organized by concern, not a raw file list |
| How to test | Present and actionable |
| Related issues | Referenced when branch name suggests a ticket number |
| Documentation | Addressed if the repo has a docs tree |

**Title:** flag if it does not follow `type(scope): imperative summary` when that convention applies.

Each violation is a REQUEST CHANGES item.

## Step 4 — Code analysis on changed files

Review changed files from Step 2 for:

- **Security:** injection, auth bypass, sensitive data exposure, input validation
- **Quality:** logic errors, dead code, error handling gaps, missing edge cases
- **Architecture:** coupling, weak abstractions, broken project patterns

**Holochain (this repo):** also verify integrity zome validation completeness (entry and link types), cross-zome call error handling, correct HDK usage (`create_entry`, `create_link`, etc.), entry and link type registration, and validation callbacks (`validate_create_*`, `validate_update_*`, `validate_delete_*`).

Only **critical** and **high** severity issues are REQUEST CHANGES candidates. Medium and below are suggestions.

## Step 5 — Documentation gate

```bash
ls -d docs/ documentation/ specifications/ 2>/dev/null | head -1
```

If a docs directory exists and code changed (`.rs`, `.ts`, `.svelte`) but no doc files under that tree changed (`.md`), flag REQUEST CHANGES unless the change clearly needs no documentation.

## Step 6 — CI/CD status

**GitHub**

```bash
gh pr checks <PR> 2>/dev/null || gh pr view <PR> --json statusCheckRollup
```

**GitLab**

```bash
glab api "/projects/ENCODED_PATH/merge_requests/MR_NUMBER/pipelines" | jq '[.[] | {id, status, web_url}]'
```

| Outcome | Verdict impact |
| --- | --- |
| All passing | No impact |
| Pending | Note only — do not block on pending alone |
| Any failing | REQUEST CHANGES — list failing check names |
| Not configured | Note informational |

## Step 7 — Verdict

Use this template:

```markdown
## PR Review: #NUMBER — TITLE

**Verdict: APPROVE / REQUEST CHANGES / DISCUSS**

### Summary
- Changed files: N
- PR description: compliant / issues found
- Code findings: N critical, N high, N medium
- Merge state: clean / behind base / conflicts / pending
- CI/CD: all passing / pending / N failing / N/A
- Documentation gate: passed / failed / N/A

### Request Changes (must fix before merge)
- [ ] ITEM — location or section

### Suggestions (optional improvements)
- ITEM

### Notes
Architectural observations or open questions
```

**Verdict rules**

- **APPROVE** — no REQUEST CHANGES items; CI passing or absent
- **REQUEST CHANGES** — any blocker, or CI failing
- **DISCUSS** — no blockers but important design questions need conversation

## Step 8 — Sync (behind base only)

Only when merge state is behind base with no conflicts (for example GitHub `mergeStateStatus` is `BEHIND`):

```bash
git fetch origin BASE_REF HEAD_REF
git rebase origin/BASE_REF
# If clean: git push --force-with-lease origin HEAD_REF
```

If rebase conflicts appear, report REQUEST CHANGES and stop. Do not push a partially resolved state. Do not automate rebase when state is conflicting or dirty.
