---
description: Review a pull request for code quality, description compliance, CI/CD status, and merge readiness. Produces a structured APPROVE / REQUEST CHANGES / DISCUSS verdict.
---

Review the pull request: $ARGUMENTS

## Platform Detection

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
```

If `GIT_PLATFORM=unknown`, stop and report: "Cannot detect git hosting platform."

## Step 0 — Load project-specific review guidelines

```bash
for f in REVIEW.md REVIEWING.md .github/REVIEW.md docs/REVIEW.md PR_GUIDELINES.md; do
  [ -f "$f" ] && { echo "Found: $f"; cat "$f"; break; }
done
```

If found, treat its contents as mandatory additional criteria. Violations are REQUEST CHANGES items.

## Step 1 — Gather PR context

**GitHub:**
```bash
# If PR number provided:
gh pr view $ARGUMENTS --json number,title,body,baseRefName,headRefName,url,state,mergeable,mergeStateStatus,files,reviews,comments,reviewRequests

# If no number — detect from current branch:
gh pr view --json number,title,body,baseRefName,headRefName,url,state,mergeable,mergeStateStatus,files,reviews,comments,reviewRequests

# Inline review comments
gh api repos/{owner}/{repo}/pulls/{N}/comments \
  --jq '[.[] | {author: .user.login, path: .path, line: .line, body: .body}]'
```

**GitLab:**
```bash
glab mr view $ARGUMENTS --output json
ENCODED_PATH=$(python3 -c "import urllib.parse; print(urllib.parse.quote('{namespace/repo}', safe=''))")
glab api /projects/${ENCODED_PATH}/merge_requests/{N}/discussions | jq '.'
```

**Gitea:**
```bash
tea pr view $ARGUMENTS
tea api repos/{owner}/{repo}/pulls/{N}/reviews | jq '.'
```

Extract: PR number, title, base→head branch, state, merge state, changed files, existing comments/reviews.

Use comment context to avoid flagging already-acknowledged issues and surface unresolved threads.

## Step 2 — Get the diff

```bash
git fetch origin {baseRefName} {headRefName} 2>/dev/null
git diff origin/{baseRefName}...origin/{headRefName} --name-only
git diff origin/{baseRefName}...origin/{headRefName} --stat
```

## Step 2.5 — Conflict / sync check

**GitHub** — interpret `mergeable` + `mergeStateStatus` from Step 1:

| `mergeable` | `mergeStateStatus` | Action |
|---|---|---|
| `MERGEABLE` | `CLEAN` | Proceed |
| `MERGEABLE` | `BEHIND` | REQUEST CHANGES: "Branch is behind `{base}` — rebase to sync." |
| `CONFLICTING` | `DIRTY` | REQUEST CHANGES: "Branch has merge conflicts — resolve before merge." |
| `UNKNOWN` | any | Note "conflict status pending" |
| `MERGEABLE` | `BLOCKED` | Note informational |

**GitLab:** check `merge_status` and `has_conflicts` from Step 1 JSON.

**Gitea:**
```bash
tea api repos/{owner}/{repo}/pulls/{N} | jq '{mergeable: .mergeable}'
```

## Step 3 — PR description compliance

Check the PR body against any project guidelines found in Step 0. Evaluate required sections:

| Section | Check |
|---|---|
| Intent / Why | Present and answers "why"? |
| Changes | Organized by concern, not file list? |
| How to test | Present and actionable? |
| Related issues | Referenced when branch name contains a number? |
| Documentation | Addressed if a docs folder exists? |

**Title check:** Follows `{type}({scope}): imperative verb + scope` convention?

Flag each violation as a REQUEST CHANGES item.

## Step 4 — Code analysis on changed files

Review the changed files from Step 2 for:
- **Security:** injection, auth bypass, sensitive data exposure, input validation
- **Quality:** logic errors, dead code, incorrect error handling, missing edge cases
- **Architecture:** coupling violations, inappropriate abstractions, broken patterns

For this Holochain project specifically, also check:
- Integrity zome validation completeness (all entry/link types covered)
- Cross-zome call error handling
- Proper use of HDK macros (`create_entry`, `create_link`, etc.)
- Entry type registration in `entry_types!` / `link_types!`
- Validation callback coverage (`validate_create_*`, `validate_update_*`, `validate_delete_*`)

Only CRITICAL and HIGH severity findings are REQUEST CHANGES candidates. MEDIUM and below are suggestions.

## Step 5 — Documentation gate

```bash
ls -d docs/ documentation/ specifications/ 2>/dev/null | head -1
```

If a docs folder exists and code files changed (`.rs`, `.ts`, `.svelte`) but no doc files changed (`.md` under docs/): flag as REQUEST CHANGES unless the change clearly needs no documentation.

## Step 6 — CI/CD status

**GitHub:**
```bash
gh pr checks $ARGUMENTS 2>/dev/null || gh pr view $ARGUMENTS --json statusCheckRollup
```

**GitLab:**
```bash
glab api /projects/${ENCODED_PATH}/merge_requests/{N}/pipelines | jq '[.[] | {id, status, web_url}]'
```

| State | Verdict impact |
|---|---|
| All passing | No impact |
| Pending | Note — do not block |
| Any failing | REQUEST CHANGES — list failing check names |
| Not configured | Note informational |

## Step 7 — Verdict

Produce a structured review:

```markdown
## PR Review: #{number} — {title}

**Verdict: APPROVE / REQUEST CHANGES / DISCUSS**

### Summary
- Changed files: N
- PR description: ✅ compliant / ⚠️ issues found
- Code findings: N critical, N high, N medium
- Merge state: ✅ clean / ⚠️ behind base / ❌ conflicts / ⏳ pending
- CI/CD: ✅ all passing / ⏳ pending / ❌ N failing / N/A
- Documentation gate: ✅ passed / ⚠️ failed / N/A

### Request Changes (must fix before merge)
- [ ] {item} — {location or section}

### Suggestions (optional improvements)
- {item}

### Notes
{Architectural observations or open questions}
```

**Verdict rules:**
- `APPROVE` — no REQUEST CHANGES items, CI passing (or no CI configured)
- `REQUEST CHANGES` — one or more blockers present, or CI failing
- `DISCUSS` — no blockers but significant architectural questions warrant conversation

## Step 8 — Sync action (if branch is behind only)

Only if `mergeStateStatus` is `BEHIND` (diverged, no conflicts):

```bash
git fetch origin {baseRefName} {headRefName}
git rebase origin/{baseRefName}
# If clean: git push --force-with-lease origin {headRefName}
```

If conflicts arise during rebase, surface as REQUEST CHANGES and stop — do not push a partially-resolved state. Do NOT attempt automated rebase for `CONFLICTING`/`DIRTY` state.
