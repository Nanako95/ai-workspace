---
name: browser-agent
description: Launch, reuse, and attach to an isolated Chrome browser with Chrome DevTools Protocol for low-cost persistent browser automation. Use when the user wants background browser operation, a long-lived browser session, isolated login/profile state, or Playwright control that should not affect their normal browser.
---

# Browser Agent

Use this skill when a browser should stay available across commands without blocking chat or using the user's normal Chrome profile.

## Workflow

1. Start or reuse the isolated Chrome/CDP browser:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\start-chrome.ps1"
   ```

2. Open a URL in the persistent session:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\open-url.ps1" -Url "https://example.com"
   ```

3. List tabs or get a lightweight page snapshot:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\tabs.ps1"
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\browser-agent\scripts\snapshot.ps1"
   ```

4. Use normal `playwright-cli open/snapshot/click` for one-off element-ref workflows. In this environment, persistent CDP is for browser/profile reuse; `playwright-cli attach --cdp` is not the default path because it may not register as a reusable CLI session.

## Notes

- This uses a separate Chrome profile under `%USERPROFILE%\.codex\browser-agent\chrome-profile`.
- The script lets Chrome pick an available debugging port, then stores the endpoint in `%USERPROFILE%\.codex\browser-agent\session.json`.
- Prefer plain `playwright-cli open` for one-off pages. Use this skill for persistent state, isolated login, or repeated browser work.
- Do not use the user's default Chrome profile for automation.
- If the endpoint is stale, run `start-chrome.ps1` again; it will start a new agent browser without killing the user's normal Chrome.
