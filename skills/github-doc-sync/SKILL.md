---
name: github-doc-sync
description: Synchronize GitHub project documentation with verified code or product changes, including README usage guidance, project docs, and the repository changelog, before an authorized commit or push.
---

# GitHub Documentation Sync

Use this skill when a user asks to update, publish, or push a repository change and the public GitHub documentation must describe the new behavior. It is especially useful for projects under `platform/`, but it can handle any tracked project path.

## Workflow

1. Establish the release scope before editing.

   - Read the repository root `AGENTS.md`, then the target project's `AGENTS.md` and `README.md` when present.
   - Check `git status --short --branch`, the current branch, `origin`, and the target path.
   - Preserve unrelated changes. Do not publish if the target or remote branch is ambiguous.

2. Inspect the actual implementation and its user-facing behavior.

   - Identify what changed from the diff and from the project's build or test output.
   - Do not document planned, inferred, or unverified behavior.
   - Keep documentation claims consistent with the current code, commands, paths, and deployment method.

3. Synchronize the smallest useful documentation set.

   - Update the target project's `README.md` when installation, running, capabilities, controls, configuration, or deployment changed.
   - Update a target `docs/` file when the change needs a detailed guide, schema, workflow, or troubleshooting note. Create one only when it has a clear owner and purpose.
   - Add one dated entry to the repository-root `CHANGELOG.md` for a publishable change. Include target, plain-language summary, changed paths, and validation.
   - Prefer concrete user-facing instructions and copyable commands. Remove obsolete instructions instead of appending contradictory notes.
   - Never invent screenshots, integrations, URLs, credentials, metrics, or supported features.

4. Validate the implementation and documentation together.

   - Run the target project's documented build, test, lint, or type check.
   - Run `git diff --check` and inspect `git diff --stat` plus the important documentation hunks.
   - Confirm generated folders, `node_modules`, `.env*`, credentials, browser profiles, and tokens are excluded.

5. Commit and publish only within explicit authorization.

   - If the user requested a GitHub push and the remote and authentication are valid, include the implementation and synchronized documentation in the same normal commit.
   - Use the repository's existing `github-auto-update` workflow or script when available; do not force-push or silently switch branches.
   - If authentication, `origin`, target path, or branch protection blocks publication, keep the validated local changes and report the exact blocker.
   - After pushing, verify the remote branch points to the new commit and report the GitHub URL and validation result.

## Documentation decision guide

| Change | Required documentation action |
| --- | --- |
| New user-facing feature or module | Add it to README capabilities and explain the first-use path |
| Changed command, port, environment variable, or deployment | Update the relevant setup or deployment section |
| Changed data format, API, or configuration schema | Update the detailed project guide and migration notes |
| Bug fix with visible behavior change | Record the effect in CHANGELOG and update usage guidance if needed |
| Internal refactor with no user-facing effect | CHANGELOG may be enough; do not add noisy documentation |

The skill synchronizes repository files. It does not by itself install the skill into another Codex profile, create a new GitHub repository, or grant permission to push.
