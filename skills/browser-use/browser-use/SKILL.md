---
name: browser-use
description: Use when you need to automate browser interactions for web testing, form filling, screenshots, or data extraction. Use when navigating websites, interacting with web pages, or extracting information.
---

# Browser Automation with browser-use

The `browser-use` command provides fast, persistent browser automation. A background daemon keeps the browser open across commands, giving ~50ms latency per call.

## Prerequisites

Ensure `browser-use` is installed:

```bash
pip install browser-use
browser-use doctor
```

## Core Workflow

1. **Navigate**: `browser-use open <url>` — launches headless browser and opens page.
2. **Inspect**: `browser-use state` — returns clickable elements with indices.
3. **Interact**: Use indices from state (e.g., `browser-use click 5`, `browser-use input 3 "text"`).
4. **Verify**: `browser-use state` or `browser-use screenshot` to confirm the action.
5. **Repeat**: The browser stays open between commands for efficiency.

If a command fails, run `browser-use close` first to clear any broken session, then retry.

## Browser Modes

- **Default**: `browser-use open <url>` (Headless Chromium).
- **Headed**: `browser-use --headed open <url>` (Visible window for debugging).
- **Connect to Chrome**: `browser-use connect` (Preserves your existing logins/cookies).
- **Cloud Browser**: `browser-use cloud connect` (Zero-config, requires API key).
- **Specific Profile**: `browser-use --profile "Default" open <url>` (Uses a specific Chrome profile).

## Command Reference

### Navigation
- `browser-use open <url>`: Navigate to a URL.
- `browser-use back`: Go back in history.
- `browser-use scroll down|up`: Scroll the page (`--amount N` for pixels).
- `browser-use tab list|new|switch|close`: Manage browser tabs.

### Page State & Inspection
- `browser-use state`: Get URL, title, and clickable elements with indices.
- `browser-use screenshot [path.png]`: Take a screenshot (base64 if no path).

### Interactions (Use indices from `state`)
- `browser-use click <index>`: Click an element.
- `browser-use input <index> "text"`: Clear and type into a field.
- `browser-use keys "Enter"`: Send keyboard keys (e.g., "Control+a").
- `browser-use select <index> "option"`: Select from a dropdown.
- `browser-use upload <index> <path>`: Upload a file.
- `browser-use hover|dblclick|rightclick <index>`: Mouse interactions.

### Data Extraction
- `browser-use eval "js code"`: Execute JavaScript and return the result.
- `browser-use get title|html|text|value|attributes|bbox`: Extract specific data.

### Cookies & Session
- `browser-use cookies get|set|clear|export|import`: Manage browser cookies.
- `browser-use close`: Close the browser and stop the daemon.
- `browser-use sessions`: List active sessions.

## Tips

1. **Always run `state` first**: You must identify the element indices before you can interact with them.
2. **Chain commands**: Use `&&` to run multiple commands in one `run_shell_command` call (e.g., `browser-use open <url> && browser-use state`).
3. **Use `--headed` for debugging**: If you are unsure why an interaction is failing, use the headed mode to see the browser's behavior.
4. **Persistence**: The browser session persists across tool calls until you call `browser-use close`.

## Troubleshooting

- **Browser won't start?** Run `browser-use close` then retry with `--headed`.
- **Element not found?** Try `browser-use scroll down` followed by `browser-use state` to refresh the element list.
- **Diagnostics**: Run `browser-use doctor` to check your configuration.
