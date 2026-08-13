---
name: ycloud
description: Create and submit WABA message templates in the Ycloud / WABANAP back-office site at backwaba.adakamicorp.id. Use when the user asks to open Ycloud, WABANAP, backwaba.adakamicorp.id, add a template, create a WABA template from an Excel row, choose Indonesian language, set header type Text, split Excel content into header/body, or clean Ycloud browser automation artifacts.
---

# Ycloud

## Scope

Use this skill for the Ycloud WABANAP template-management site:

- Login URL: `https://backwaba.adakamicorp.id/#/login`
- Template list route: `https://backwaba.adakamicorp.id/#/modManage/messageTemplate`
- New template route: `https://backwaba.adakamicorp.id/#/modManage/createMessageTemplate?type=add`

Prefer the isolated `browser-agent` Chrome profile plus `browser-use` CDP control so the work does not interfere with the user's foreground browser. Stop for passwords, MFA, or manual captcha entry. On every login-page visit, check that `img.code` is loaded and visibly rendered before asking the user to log in; do not change credentials.

## Login Captcha Check

Run the bundled check every time the browser is on the login page, before asking the user to log in:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\ycloud\scripts\ensure-login-captcha.ps1"
```

This is a mandatory gate, not an optional visual check. Do not ask the user whether the captcha is visible until the script returns `"readable": true`. The script performs the following checks and applies the allowed display-only resize automatically:

1. Locate `img.code` and verify its `src`, natural dimensions, rendered rectangle, `display`, `visibility`, and `opacity`.
2. If the image is not loaded or has zero natural dimensions, wait briefly and check again. If it still is not loaded, report the problem and stop for manual handling.
3. Treat a rendered width below 80 px or height below 30 px as unreadable even when the image has loaded.
4. For an unreadably narrow image, temporarily set `width: 120px`, `min-width: 120px`, `max-width: 120px`, `height: 48px`, and `flex-shrink: 0` with `!important` on `img.code`.
5. Read the rendered rectangle again and verify the captcha is at least 80 x 30 px before asking the user to enter it.
6. Never inspect, solve, transcribe, or fill the captcha value. Leave credentials, captcha entry, MFA, and final login action to the user.
7. If the script exits nonzero or returns `"readable": false`, stop and report that the captcha could not be made readable. Do not continue the login workflow.

## Excel Row Mapping

When the user provides an Excel file and row number for a new template:

- Use column 2 as `Template Name`.
- Use column 3 as message text.
- Split column 3 at the first literal period `.`.
- Put the first sentence including the period into `Header Content`.
- Put the remaining text into `Body`.
- Use only the requested row unless the user explicitly asks for batch creation.

Use the bundled parser:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\ycloud\scripts\read-ycloud-template-row.ps1" -Path "<xlsx-path>" -RowNumber <n>
```

If the generated header exceeds the site's 60-character limit, stop and ask the user whether to shorten the header or let them edit it manually. If the user says they already edited the page, submit the current page as-is after checking no visible validation errors remain.

## Create Template Workflow

1. Open or reuse the isolated browser-agent Chrome session.
2. Navigate to the template list route.
3. If redirected to login, run `scripts/ensure-login-captcha.ps1`. Ask the user to log in only after it returns `"readable": true`, and continue only after login succeeds.
4. In the left menu, open parent `Template` and click the child `Template` item, which is the second visible `Template` label.
5. Click `Add Template`.
6. If the URL changes but the main area still shows the old list page, run `location.reload()` and wait for `Basic Info`.
7. Set `Language` to `Indonesian`.
8. Leave `Category` as the default unless the user says otherwise.
9. Set `Header Type` to `Text`.
10. Fill `Template Name`, `Header Content`, and `Body`.
11. Prefer whole-field DOM value writes with `input` and `change` events for long text; do not use the system clipboard unless the user explicitly asks.
12. Read fields back before submit: template name, selected language, header type, header length, body length, and visible validation errors.
13. Click `Submit`.
14. Confirm success by returning to the template list and checking the new row appears with status such as `In review`.

## Browser Automation Notes

- Ant Design select input ids such as `rc_select_5` are dynamic. Locate selects by their form-label text (`Language`, `Header Type`) instead of hardcoding dynamic ids.
- Select options by opening the select and clicking the visible `.ant-select-item-option` whose normalized text exactly matches the desired option.
- After SPA navigation, the URL can change before the main panel rerenders. Verify page body text, not URL alone.
- Keep progress updates compact; do not print full Excel rows or full message bodies unless the user asks.

## Cleanup

After each run, clean only automation artifacts unless the user asks to keep them:

- Close blank or unrelated tabs in the isolated browser.
- Clear browser HTTP cache with CDP `Network.clearBrowserCache`.
- Empty `%USERPROFILE%\.browser-harness\tmp`.
- Empty `%USERPROFILE%\.browser-harness\runtime`.
- Remove Playwright temp directories named `playwright-artifacts-*`, `playwright-download-*`, or `playwright_chromiumdev_profile-*` under `%TEMP%`.
- Run `uv cache clean` and `npm cache clean --force` only when these tools were used or the user asks for cache cleanup.

Do not delete the Excel source file, the installed browser runtimes, the `browser-use` tool installation, or the isolated Chrome profile unless the user explicitly asks to reset installed tools or login state.

