---
name: smartchat-template-modifier
description: Modify or create SmartChat WABA message templates from Excel rows or direct user-provided field text through an isolated browser-agent/browser-use session, the ChatGPT/Codex built-in browser, BrowserMCP Chrome, or Playwright. Use when the user asks for 模板修改skill, SmartChat WABA template changes, exact template-name search, replacing header/body/footer/remark, explicitly says 新建模板, requests browser-agent or browser-use mode, adapts this skill, or cleans SmartChat browser automation artifacts afterward.
---

# SmartChat Template Modifier

## Current Overrides

These rules override any older wording in this file:

- Enter the `Create New Template` workflow only when the user's request explicitly contains the exact keyword `新建模板`. Without that keyword, never infer creation intent and continue to use the existing-template modification workflow.
- In the `Create New Template` workflow, default the BSP to the exact visible option `1ENGAGE` unless the user explicitly requests a different BSP. Do not ask the user to repeat this default for each run.
- Treat a same-name template under a different BSP as allowed. Stop only when the exact template name already exists under the target BSP selected for the new template.
- In the `Create New Template` workflow, default the Category to the exact visible option `UTILITY` unless the user explicitly requests a different category.
- When a new-template body contains the variable `{{1}}`, map sequence `1` to the exact SmartChat parameter `pmsUserInfoName`; verify that the UI fills its example value automatically. Preserve the `{{1}}` placeholder in the body.
- If a BSP, Category, or parameter option is not found on the first dropdown open, click the same select again to close and reopen it, then inspect every visible dropdown menu and its bounding box. The menu may render above or below the control; do not search only below the field.
- Treat a multi-row Excel file as a batch. Each row is one complete template modification run.
- For every row, perform the row cycle: enter the full `template_name`, press `Enter`, choose only the row whose first template-name cell exactly matches, click `modify`, replace supplied fields, click `Confirm`.
- After one row is confirmed and checked, wait 5 minutes before starting the next row.
- Minimize token use: do not paste full snapshots or full Excel rows into progress updates; prefer `find`, targeted locators, and `run-code` summaries over full `snapshot` after the page shape is known.
- Support four automation modes: isolated Chrome through `browser-agent` plus `browser-use`, the ChatGPT/Codex built-in browser, existing Chrome through BrowserMCP, or a separate headed `playwright-cli` browser.
- Before every new template modification run, ask the user which browser mode to use. Do not reuse the mode from a prior run. If the current request explicitly names browser-agent/browser-use/isolated Chrome/background browser, use the isolated browser-agent mode; if it names the right-side/in-app/built-in browser, use the built-in browser; if it names Chrome/BrowserMCP/googlemcp, use existing Chrome; if it names Playwright/playwright-cli/original method, use Playwright without asking again.
- Before using built-in-browser mode, verify that the current session exposes callable tools for inspecting and interacting with that browser. Ambient UI state saying the browser is open is not a control interface. If inspection, click, or text-entry tools are missing, state that limitation and ask the user to choose browser-agent/browser-use, BrowserMCP, or Playwright; do not silently operate a different browser.
- In BrowserMCP mode, if the current BrowserMCP-selected Chrome tab is SmartChat, operate there. If no usable SmartChat tab is selected/open, open `https://scrm.adakamicorp.id/#/waba/template` in Chrome with `Start-Process chrome`; this reuses existing Chrome when it is running and starts Chrome only when needed.
- After opening or switching to SmartChat in Chrome, run `browser_snapshot`. If BrowserMCP still reports a different page, use `browsermcp-connect` on the visible SmartChat tab so the extension selects that tab before modifying anything.
- If BrowserMCP is disconnected or has `No selected tab ID`, use the `browsermcp-connect` skill to connect the Chrome extension, then continue.
- Keep chat usable during long batch gaps. Do not run a foreground blocking `Start-Sleep 300` unless the user explicitly wants unattended blocking execution; instead report the 5-minute pause point/deadline and continue when the user asks or when a non-blocking/background runner has been explicitly approved.
- If the user gives a new reusable requirement for this skill, update this skill in place at `C:\Users\shenqing01\.codex\skills\smartchat-template-modifier`, validate it, and report what changed.
- Keep new skill updates generic. Do not store real template text, Excel row content, login data, tokens, screenshots, or one-off business data in the skill.
- Ask the user before the final cleanup step. Run artifact deletion only after explicit confirmation for the current run.

Use this skill for SmartChat WABA template editing. The user-facing name is "模板修改skill".

## Required Behavior

Ask for the content source when it is missing:

- Ask whether the user will provide an Excel file path or direct text.
- If Excel: ask for the file path. If the file contains multiple rows, process every row by default unless the user gives a specific `template_name`.
- If direct text: ask for the SmartChat search template name plus any fields to replace: `header`, `body`, `footer`, `remark`.

Before starting a template modification run, ask once in that run whether to use isolated browser-agent/browser-use, the built-in browser, BrowserMCP/existing Chrome, or Playwright/playwright-cli. Only skip this question when the current user request explicitly selects the mode. After the mode is selected for that run, do not ask about routine navigation.

## Create New Template Workflow

Use this workflow only when the user's request explicitly contains `新建模板`.

1. Use the selected browser mode and navigate to `Waba` > `Message Template`.
2. Click the blue `Create New Template` button and verify the creation dialog opens.
3. For a positional Excel source, read row 2 and map columns as follows:
   - Column B -> `Template Name`
   - Column C -> `Header`
   - Column D -> `Body`
   - Column E -> `Footer`
4. If the workbook has recognized field headers instead, prefer those named fields while preserving the same destination mapping.
5. Select the BSP. Use the exact visible option `1ENGAGE` by default; only use another BSP when the user explicitly requests it. Match the visible option exactly. If it is not visible, close and reopen the select, then inspect menus rendered above and below the control.
6. Select the Category. Use the exact visible option `UTILITY` by default; only use another category when the user explicitly requests it. Match the visible option exactly. If it is not visible, close and reopen the select, then inspect menus rendered above and below the control.
7. Fill `Template Name`, `Header`, `Body`, and `Footer` with the mapped values. Fill `Remark` only when supplied. Leave all other controls unchanged unless the user explicitly specifies them.
8. For each `{{n}}` in the body or header, click the corresponding dynamic-parameter control and map it through the visible parameter selector. If the parameter is not visible on the first open, close and reopen the selector and inspect both above- and below-control menus. For `{{1}}`, select `pmsUserInfoName` and verify the example value is populated. Before submission, verify the exact values currently displayed in all supplied fields and mappings. Do not click `Confirm` until the user explicitly asks to submit or the original `新建模板` request explicitly authorizes end-to-end creation.
9. Click `Confirm` once. Do not repeat the click merely because the dialog remains visible.
10. Verify creation from the table, not from dialog closure alone. Confirm the exact template name appears and report its `BSP`, `Category`, status, `Status in WABAID`, and creation time. A table total increase is supporting evidence, not sufficient by itself.
11. If the exact template name already exists under the target BSP, stop before submission and report the conflict. A same-name row under another BSP does not block creation.

If the request does not contain `新建模板`, skip this entire section and follow the modification workflow below.

Built-in browser mode:

1. Confirm the session exposes callable built-in-browser inspection and interaction tools. Do not infer control from an `in-app-browser-context` block alone.
2. Inspect the current right-side page. If it is not SmartChat, navigate that same built-in-browser tab to `https://scrm.adakamicorp.id/#/waba/template`.
3. If redirected to login, ask the user to sign in inside the right-side browser, then inspect the page again.
4. If not already on the template page, open `Waba`, then `Message Template`.
5. For each Excel row or direct request, enter the full `TemplateName`, press `Enter`, and choose only the row whose first template-name cell exactly matches.
6. Open that row's `modify` dialog, replace only supplied fields, and click `Confirm` unless the user requested preview-only behavior.
7. Check compact result fields for that exact row: status, Status in WABAID, LastModifiedTime, or a visible error.
8. Wait 5 minutes before processing the next batch row, following the non-blocking pause rule above.
9. If the built-in-browser tools cannot reliably identify the exact row or fields, stop before editing and offer BrowserMCP or Playwright. Never use screen coordinates or visual guessing for production template changes.
10. Report the final status for every row. Built-in-browser mode creates no Playwright artifacts, so do not offer Playwright cleanup unless artifacts were created by a fallback explicitly chosen by the user.

BrowserMCP / existing Chrome mode:

1. Check BrowserMCP with `browser_snapshot`.
2. If the selected tab is already SmartChat, use it.
3. If SmartChat is not selected/open, open `https://scrm.adakamicorp.id/#/waba/template` in Chrome with `Start-Process chrome`.
4. Run `browser_snapshot` again. If it still shows a non-SmartChat page, use `browsermcp-connect` from the visible SmartChat tab to make BrowserMCP select it.
5. If redirected to login, ask the user to log in in the visible Chrome page, then continue.
6. If BrowserMCP is not connected, use `browsermcp-connect` and retry.
7. If not already on the template page, click left menu `Waba`.
8. Click `Message Template`.
9. For each Excel row or direct request, enter the full `TemplateName`, press `Enter`, and find the exact matching row.
10. Open only the exact row's `modify` dialog.
11. Replace only the fields supplied by the user or Excel row.
12. Click `Confirm`, unless the user explicitly says not to submit.
13. Check compact result fields for that exact row: status, Status in WABAID, LastModifiedTime, or visible error.
14. Wait 5 minutes, then repeat steps 9-13 for the next row.
15. Report the final status for every row.
16. Ask the user for confirmation before cleaning screenshots or Playwright artifacts.

Browser-agent / browser-use mode:

1. Read and follow the `browser-agent` and `browser-use` skills for the current environment.
2. Start or reuse the isolated browser-agent Chrome profile, then open `https://scrm.adakamicorp.id/#/waba/template` in that persistent session.
3. Inspect the isolated tab with `browser-use`. If the CDP connection is stale, restart only the browser-agent session and retry; do not kill or attach to the user's normal Chrome.
4. If redirected to login, ask the user to sign in inside the isolated browser. Stop for passwords, MFA, captcha, consent, or an ambiguous account choice, then continue after the user confirms login.
5. If not already on the template page, open `Waba`, then `Message Template`.
6. For each Excel row or direct request, enter the full `TemplateName`, press `Enter`, and inspect the result DOM or accessibility tree.
7. Require exactly one intended row. Prefer an exact first-cell template-name match; accept a normalized match only under the Data Mapping rule below. Stop on zero or multiple matches.
8. Open only that row's `modify` dialog. Resolve the row and control through DOM/accessibility evidence before clicking; never use blind screen coordinates.
9. Replace only fields supplied by the user or Excel row. Dispatch the page's expected input/change events and read the displayed values back before submission.
10. Click `Confirm` once unless the user explicitly requested preview-only behavior.
11. Verify the exact row after submission and capture compact result fields: status, Status in WABAID, LastModifiedTime, or a visible error.
12. Wait 5 minutes before processing the next batch row, following the non-blocking pause rule above.
13. Report the final status for every row. Keep the isolated profile and login state unless the user explicitly asks to reset them; ask before deleting any artifacts.

Playwright CLI mode:

1. Use the `playwright` skill and `playwright-cli` commands.
2. Open `https://scrm.adakamicorp.id/#/waba/template` in a headed browser.
3. If redirected to login, ask the user to log in in the visible browser, then continue.
4. For each Excel row or direct request, enter the full `TemplateName`, press `Enter`, and find the exact matching row.
5. Open only the exact row's `modify` dialog.
6. Replace only the fields supplied by the user or Excel row.
7. Click `Confirm`, unless the user explicitly says not to submit.
8. Check compact result fields for that exact row: status, Status in WABAID, LastModifiedTime, or visible error.
9. Wait 5 minutes before starting the next row.
10. Report the final status for every row.

## Data Mapping

Excel columns are expected to be:

- `template_name`: target template/search value.
- `header_text`: replacement for the SmartChat `Header` field.
- `body_text`: replacement for the SmartChat `Body` field.
- `footer_text`: replacement for the SmartChat `Footer` field.
- `remark`: replacement for `Remark`, when present.

If the web search normalizes the name, accept the selected result when it clearly matches the intended template. Example: Excel `push_call_other_number_temp4_1` may resolve to web result `push_call_othernumber_temp4_1`.

## Adaptive Updates

When the user says this skill should learn, remember, add flexibility, or follow a new reusable rule:

- Update this existing skill folder in place; do not create a new skill.
- Prefer editing `SKILL.md` for workflow rules and bundled scripts for repeatable mechanics.
- Keep the update concise and reusable.
- Do not save actual template content, row data, credentials, screenshots, tokens, or private one-off values into the skill.
- Validate the skill after editing when possible.
- Continue the user's current task after the update if the requested change does not require more input.

## Excel Helper

Read Excel data with:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\smartchat-template-modifier\scripts\read-template-source.ps1" -Path "<xlsx-path>" [-TemplateName "<template_name>"] [-SheetName "<sheet>"]
```

The script is pure OpenXML PowerShell and does not require Excel COM. Without `-TemplateName`, it prints all rows as JSON for batch processing. With `-TemplateName`, it prints only the matched row.

## Existing Chrome Workflow

Use the mode selected by the user. Use browser-agent plus browser-use against the isolated Chrome profile when that mode is selected. Use BrowserMCP against the user's existing Chrome when Chrome/BrowserMCP is selected. Use Playwright CLI when Playwright is selected or explicitly requested.

For isolated browser-agent/browser-use mode, start or reuse the profile and open SmartChat with:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\start-chrome.ps1"
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\open-url.ps1" -Url "https://scrm.adakamicorp.id/#/waba/template"
```

Then use `browser-use` for targeted CDP/DOM inspection and interaction. Prefer accessibility-tree or DOM-backed element resolution, whole-field value writes with the required events, and compact readback checks. Do not print full message bodies in command output or progress updates.

To open SmartChat without a separate browser:

```powershell
Start-Process chrome "https://scrm.adakamicorp.id/#/waba/template"
```

Opening this URL may not automatically change BrowserMCP's selected tab. Verify with `browser_snapshot`; if it still points at a different page, connect the BrowserMCP extension from the visible SmartChat tab using `browsermcp-connect`.

Use `browser_snapshot` only when needed for login/navigation state, stale refs, or a new dialog structure. Otherwise use targeted BrowserMCP actions and compact DOM/field summaries.

## Playwright CLI Workflow

Use this workflow only when the user chooses or explicitly requests Playwright. Keep it headed so the user can see the page.

Open / resume:

```powershell
npx --yes --package @playwright/cli playwright-cli open "https://scrm.adakamicorp.id/#/waba/template" --headed --session smartchat
```

Typical commands:

```powershell
npx --yes --package @playwright/cli playwright-cli snapshot --session smartchat
npx --yes --package @playwright/cli playwright-cli click <ref> --session smartchat
npx --yes --package @playwright/cli playwright-cli fill <ref> "<text>" --session smartchat
npx --yes --package @playwright/cli playwright-cli press Enter --session smartchat
```

Take snapshots after navigation, search, dialog open, and submit. Prefer compact status extraction over screenshots. Do not create screenshots unless needed for debugging or the user asks.

Navigation:

- Click `Waba`.
- Snapshot.
- Click `Message Template`.
- Snapshot.

Search:

- Focus the top `TemplateName` control.
- Clear it, type the full `template_name`, and press `Enter`.
- Locate rows whose first `TemplateName(Meta)` cell equals `template_name` exactly.
- If exact-match count is 0, stop the batch at that row and report completed rows.
- If exact-match count is greater than 1, stop and ask for a more specific target.
- If fuzzy search returns many rows but exactly one row has a first-cell exact match, continue with that exact row.

Modify:

- Click the exact row's `modify`.
- If normal click is intercepted by fixed table columns, use a DOM/event click fallback on the visible `modify` element inside the exact row.
- Snapshot after opening the dialog only if field refs are unknown or stale.

Field replacement:

- `header_text` -> textbox named `Enter Header`.
- `body_text` -> textbox named `Enter Body`.
- `footer_text` -> textbox named `Enter Footer`.
- `remark` -> textbox named `Enter Remark`.
- Leave unspecified fields unchanged.

Submit:

- Click `Confirm` unless the user explicitly requested preview/no submit.
- After submit, avoid full snapshots when possible; report only compact status fields such as `PENDING`, `APPROVED`, `Status in WABAID`, `LastModifiedTime`, or visible errors.
- For batch Excel input, finish one row completely before starting the next row.
- Wait 5 minutes after a successful row before starting the next row.
- If a row fails after `Confirm`, stop and report the row number, `template_name`, visible error, and rows already completed.

## Cleanup

Avoid OS screenshots. Browser automation artifacts should be rare. If any screenshot, browser-use, or Playwright artifact is created, ask the user before deleting it:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\smartchat-template-modifier\scripts\cleanup-smartchat-artifacts.ps1"
```

Only run cleanup after explicit user confirmation, unless the user has already granted cleanup approval for the current run. Do not delete user Excel files, the isolated browser-agent profile, installed browser runtimes, or browser-use itself.
