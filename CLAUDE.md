# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` holds the authoritative repository rules (data constraints, sync/security rules, hygiene); read it too. Key points are summarized below.

## Commands

Plain Chrome Manifest V3 extension: no package manager, build, tests, or lint.

- Syntax check only (files need Chrome APIs/DOM, so they can't run in Node): `node --check background.js`, `node --check sidepanel.js`, `node --check content.js`, `node --check crypto.js`
- Run/verify manually: `chrome://extensions` → Developer mode → **Load unpacked** on the repo root → **Reload** after any source/manifest change. There is no automated way to run a single test.
- Use a regular web page to test copy/auto-paste (`chrome://`, `edge://`, `about:` pages can't be scripted). Test Gemini separately; it is the only content-script host.

## Architecture

- `manifest.json` is the source of truth for permissions, host matches, and entrypoints.
- `background.js` (service worker): builds the context menus (SimplestPrompt → Folder → Prompt, and the separate "AI on Selection" menu shown only with selected text), copies prompts / auto-pastes into the focused field via `chrome.scripting`, and opens AI targets. Menus are rebuilt on `chrome.storage.onChanged` and on a `rebuildMenu` runtime message from the side panel. Menus intentionally expose only the first 25 folders and 30 prompts per folder.
- `sidepanel.html` + `sidepanel.js`: management UI. Persists everything in `chrome.storage.local` and talks to the worker via `chrome.runtime.sendMessage` (`rebuildMenu`, `getAutoPaste`, `enableAutoPaste`/`disableAutoPaste`). Loads `crypto.js` as a plain script.
- `crypto.js`: PBKDF2/AES-GCM envelope for optional manual GitHub Gist sync. Sync runs entirely in the side panel so the passphrase (memory-only) never reaches the service worker or storage.
- `content.js`: injected only on `https://gemini.google.com/*`; fills Gemini's editor when the worker sends `injectGemini` (worker retries via `sendMessageWithRetry` while the page loads).
- AI on Selection: the selection prompt template's `{{text}}` is substituted, then the AI target either gets it through its configured query parameter or via the paste fallback (Gemini uses the content-script path).

## Data constraints

- Storage keys: `folders`, `autoPaste`, `aiOnSelectionEnabled`, `aiTargets`, `selectionPrompts`, `syncConfig`. Preserve these shapes in import/export and sync (see README "Data Model").
- Gist sync uploads only the encrypted envelope of the first five keys; never the GitHub token, `syncConfig`, or passphrase.
- `dist/`, `build/`, `.tmp/`, `*.zip` are ignored artifacts; never edit `.tmp/` release copies, edit root sources.
