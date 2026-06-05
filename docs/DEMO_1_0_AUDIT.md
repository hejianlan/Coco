# Demo 1.0 Audit

Date: 2026-06-04
Version: 1.0.0

## Demo-ready paths

- Frontend is now inside this repository under `frontend`; Tauri builds from this repo and no longer depends on an external frontend folder.
- Chat, threads, projects, model provider settings, permissions approval, MCP management, skills, hooks, output styles, usage/balance, PTY terminal, file browser, rewind, diagnostics export, web search, and web fetch have backend IPC/tool paths.
- Model/provider settings are persisted in `%APPDATA%/coco/config.json` through `save_providers`; runtime model calls read provider config from that file.
- Web search settings are persisted in `%APPDATA%/coco/config.json` under `webSearch`; saving updates the running web tool state without app restart.
- Demo defaults to dark theme when no setting exists.
- Global React render errors show a concrete error page instead of a white screen.

## Web search providers

Implemented and selectable:

- Jina Search: optional API key; falls back to zero-config behavior when empty.
- DuckDuckGo HTML: zero-config fallback.
- Bocha AI Search: requires API key.
- Brave Search API: requires API key.
- Tavily: requires API key.

Visible but marked as `开发中...` because backend execution is not implemented yet:

- Exa
- Serper
- SerpAPI

## Backend done, frontend connected

- `get_config`, `set_config`, `save_providers`, `save_web_search_config`, `fetch_provider_models`, and `test_provider_connection` are connected from settings UI.
- `export_diagnostics` is connected in Developer settings.
- Web search tool cards render search results in chat.
- Thread history now returns segments, including reasoning and tool cards.

## Backend done, frontend limited

- MCP dynamic tools are available to the agent registry; settings currently focuses on server management/status rather than a full schema browser.
- `web_search` is usable by the agent; the manual composer toolbar search toggle is marked `开发中...`.

## Frontend visible, backend missing or not fully consumed

These are marked `开发中...` or disabled in the demo UI:

- Composer attachment button.
- Composer manual web search toggle.
- Capabilities: automatic Pro upgrade and automatic compaction controls.
- General: language and chat font-size controls.
- Permissions: new-session default permission mode and approval-timeout policy.
- Developer: runtime log-level switch, prompt dump, and opening database path in file manager.
- About: update check, project homepage, license viewer, and dependency list actions.
- Web search providers Exa, Serper, and SerpAPI.

## Packaging notes

- Workspace Rust version and frontend package version are `1.0.0`.
- Tauri bundle icons are present: `32x32.png`, `128x128.png`, `icon.ico`, plus source `coco.svg`.
- Packaged app does not require `.env`; API keys entered in settings are persisted and used from the app config file.
