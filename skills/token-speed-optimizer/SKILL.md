---
name: token-speed-optimizer
description: Reduce token use and speed up Codex work. Use when the user asks to minimize token consumption, improve runtime speed, work efficiently, avoid unnecessary context, optimize long tasks, handle large repositories/files, reduce tool/output noise, or keep Codex responses concise while still completing engineering work safely.
---

# Token Speed Optimizer

## Core Rules

Apply these rules without weakening correctness or safety:

1. Prefer the smallest sufficient context.
2. Read only files directly relevant to the task.
3. Use `rg` / `rg --files` before broad directory reads.
4. Parallelize independent reads with available parallel tooling.
5. Avoid repeating unchanged context in updates or final answers.
6. Prefer deterministic local checks over extra reasoning.
7. Keep user-facing updates short and high-signal.
8. Stop expanding investigation once the answer is supported.
9. Ask for clarification only when a safe assumption is not reasonable.
10. Never skip required approvals, tests, or safety checks to save tokens.

## Work Protocol

Use this sequence for coding tasks:

1. Identify the smallest set of files likely involved.
2. Inspect filenames and targeted symbols before opening full files.
3. Read focused ranges or small files first.
4. Make scoped edits that follow existing patterns.
5. Run the narrowest useful test or static check.
6. Summarize only changed files, verification, and next steps.

For research or docs tasks:

1. Use primary sources first.
2. Fetch only the relevant page or section.
3. Extract the decision-relevant facts.
4. Cite sources when browsing was used.
5. Do not paste long source text into the response.

For large files or large outputs:

1. Use search, counts, heads/tails, or structured parsers before full reads.
2. Summarize large data into compact tables or bullets.
3. Avoid sending full logs, full JSON dumps, or full generated artifacts unless explicitly requested.

## Communication Style

Keep responses compact:

1. Use one short paragraph for tiny tasks.
2. Use bullets only when they improve scanning.
3. Include commands and paths exactly when useful.
4. Do not narrate obvious internal steps.
5. In final answers, mention failed or skipped verification clearly.

## Safety Exceptions

Do not optimize away:

1. Required human approval.
2. Security-sensitive checks.
3. User-requested details.
4. Test execution for risky code changes.
5. Source verification for current or high-stakes facts.

