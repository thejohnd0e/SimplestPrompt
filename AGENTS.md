# Repository Instructions

## Project Shape

- This is a plain Chrome Manifest V3 extension; there is no package manager, build step, test runner, lint configuration, or CI workflow in the repository.
- `background.js` is the service worker: it owns context-menu construction, prompt copy/auto-paste, AI-on-Selection URL/paste handling, and storage change reactions.
- `sidepanel.html` and `sidepanel.js` are the management UI and persist prompt/AI configuration in `chrome.storage.local`; `content.js` is injected only on `https://gemini.google.com/*` to fill Gemini's editor.
- `manifest.json` is the executable wiring and permission source of truth. Update permissions, host matches, and entrypoints there rather than assuming another build system will generate them.

## Development And Verification

- There are no install or build commands. For syntax-only checks, run `node --check background.js`, `node --check sidepanel.js`, `node --check content.js`, and `node --check crypto.js` from the repository root; these files require Chrome APIs/DOM/Web Crypto and are not runnable as Node programs.
- Functional verification is manual: open `chrome://extensions`, enable Developer mode, use **Load unpacked** on the repository root, and click **Reload** after source or manifest changes.
- Exercise both paths after behavior changes: open the side panel and edit/reorder/import/export data, then use the page context menu for normal prompts and selected text. Test Gemini separately because it is the only content-script host.
- Browser-internal pages (`chrome://`, `edge://`, `about://`, and similar) cannot be scripted; use a regular web page when checking copy or auto-paste.

## Data And Behavior Constraints

- Stored keys are `folders`, `autoPaste`, `aiOnSelectionEnabled`, `aiTargets`, `selectionPrompts`, and `syncConfig`; preserve the user-data shapes when changing import/export or sync behavior.
- Selection prompt templates substitute `{{text}}`; AI targets either receive text through their configured query parameter or use the paste fallback. Gemini uses the dedicated content script/injection path.
- Context menus are rebuilt after local-storage updates. Chrome menu limits in `background.js` intentionally expose only the first 25 folders and first 30 prompts per folder; keep this behavior in mind when changing menu generation.
- Keep user data local by default. The optional GitHub Gist feature is manual, uploads only the encrypted sync envelope, and must never upload the GitHub token or encryption passphrase.
- Sync metadata is stored under `syncConfig`; the token persists locally for convenience, while the encryption passphrase remains in side-panel memory only.

## Repository Hygiene

- `dist/`, `build/`, `.tmp/`, and `*.zip` are ignored artifacts. Do not edit the staged/release copy under `.tmp/`; modify the root source files instead.
- `README.md` documents the user-facing data model and installation flow; `cursor.md` contains version notes but is ignored and is not a build or release configuration.
- `crypto.js` contains the client-side PBKDF2/AES-GCM envelope logic; keep encryption in the side panel so the passphrase is not persisted or sent to the service worker.
