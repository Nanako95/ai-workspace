---
name: browsermcp-connect
description: Connect or reconnect BrowserMCP/googlemcp in Chrome. Use when the user mentions BrowserMCP, googlemcp, MCP Chrome extension, browser extension connection, "No selected tab ID", "No connection to browser extension", or asks Codex to connect the browser through the Chrome extension menu.
---

# BrowserMCP Connect

Goal: make the BrowserMCP Chrome extension select a normal browser tab, then verify that `mcp__browsermcp` can operate on it.

## Workflow

1. Check whether BrowserMCP is already usable.
   - If `mcp__browsermcp` tools are not visible, discover them with `tool_search` using `browsermcp`.
   - Run `mcp__browsermcp.browser_snapshot`.
   - If it returns page content, it is connected; report the selected page URL/title.
   - If it returns `No selected tab ID` or `No connection to browser extension`, continue.

2. Ensure a Chrome UI exists.
   - If an existing Chrome window is open, use the current Chrome window and tab.
   - If no Chrome UI is open, launch a new Chrome window, preferably with `Start-Process chrome`, and open a normal web page such as Google or a new tab.
   - Use a normal web page tab. Do not rely on opening `chrome-extension://.../popup.html` as a tab, because that may not select the target web page.

3. Open the extension popup from Chrome.
   - In the Chrome toolbar, locate the bookmark star icon at the right side of the address bar.
   - The puzzle-piece icon beside the star opens the Extensions menu.
   - Click the puzzle-piece icon, then choose the BrowserMCP / Browser MCP / server entry.
   - In the extension popup, click the connect button. The label may be English `Connect` or the Chinese equivalent.
   - If the user has already asked to connect BrowserMCP, perform these routine UI clicks without asking for step-by-step confirmation. Still use required tool escalation when the tool system requires it.

4. Verify the connection.
   - Run `mcp__browsermcp.browser_snapshot` again.
   - If it returns page content, the connection is ready.
   - If it still says `No selected tab ID`, select a normal web page tab in Chrome and repeat the extension-menu connection.
   - If it says `No connection to browser extension`, confirm the local BrowserMCP server is running and then repeat the extension-menu connection.

5. Clean up temporary artifacts.
   - If OS screenshots were created only for this workflow, delete temporary `codex-shot-*.png` and related crop files after verification unless the user asked to keep them.
