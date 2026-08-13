---
name: github-auto-update
description: Safely publish verified local updates for a GitHub repository, including a dated change log entry and remote verification. Use when optimizing, fixing, updating, or adding a platform, skill, document, or other tracked repository content and the user expects the GitHub copy to be overwritten with the finished local version.
---

# GitHub Auto Update

Publish the completed local change to the repository's current branch and keep a concise, dated record in the repository root `CHANGELOG.md`. Treat the local implementation and validation as the source of truth, but never force-push or publish secrets without explicit approval.

## Workflow

### 1. Establish scope

- Locate the repository root and read its `AGENTS.md` and project-specific instructions.
- Identify the exact target path(s), current branch, and `origin` remote. Use the current branch by default; do not silently switch to `main`.
- Before editing, inspect `git status --short --branch`. Preserve unrelated user changes and stop if they make the requested update ambiguous.

### 2. Implement and validate locally

- Make the requested changes only inside the agreed target.
- Run the project's relevant tests, lint, type check, or production build. For a frontend, prefer the repository's documented build command and inspect the actual result.
- Run `git diff --check` and review `git diff --stat` plus the important hunks.
- Do not stage `.env*`, private keys, tokens, credentials, browser profiles, caches, `node_modules`, or build output. Stop and report if a changed file looks sensitive.

### 3. Record the update and publish

Keep a root `CHANGELOG.md`. Add one dated entry per publish with the target, a plain-language summary, changed paths, and validation performed. Do not create a second changelog inside a skill folder.

Run the bundled script from the repository root after local validation:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CODEX_HOME\skills\github-auto-update\scripts\publish-update.ps1" `
  -RepoRoot "C:\path\to\repository" `
  -Target "platform\your-project" `
  -Summary "Improve filtering and update the usage guide"
```

If `CODEX_HOME` is unset, use the installed skill path under `$HOME\.codex\skills\github-auto-update`.

The script will:

- fetch the current remote branch and stop if it has commits not in the local branch;
- scan changed paths for common secrets and generated files;
- append a dated `CHANGELOG.md` entry;
- stage only the requested target and the changelog;
- create a normal commit and push to `origin` on the current branch; and
- verify that the remote branch points at the new commit.

Use `-DryRun` to inspect the planned scope without writing, committing, or pushing. Use `-AllowUnrelatedChanges` only when the user explicitly confirms that other existing changes belong in this release.

### Conflict and failure rules

- If the remote branch is ahead, stop and ask the user to reconcile it; never use `git push --force` automatically.
- If the working tree has unrelated changes, do not include them silently.
- If validation fails, fix the local implementation first and do not publish a known-bad build.
- If push fails after a local commit, report the commit hash and the exact remote error so the user can resolve authentication or branch protection without losing the local work.
- Report the final branch, commit hash, changed paths, validation commands, and the GitHub URL in the handoff.

## New-computer handoff

Clone the repository, then copy or install this skill into the new Codex profile. For a local skill directory:

```powershell
git clone https://github.com/Nanako95/ai-workspace.git
Copy-Item -Recurse .\ai-workspace\skills\github-auto-update "$env:USERPROFILE\.codex\skills\github-auto-update"
```

Then ask the new AI to read the repository `AGENTS.md`, the relevant project instructions, and this skill before making changes. The repository copy is intentionally self-contained and contains no credentials.

## Bundled resource

`scripts/publish-update.ps1` performs the deterministic safety checks and publish sequence described above.
