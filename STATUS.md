# STATUS

Chrome MV3 extension "SimplestPrompt". No build step, no package manager.
Verification: `node --test` (17 tests) and a real-DOM browser harness
(`tests/panel.test.html` served over local HTTP, 45 checks).

## Last released

- **v2.18** — commit `eaf168c`, tag `2.18`, GitHub release published (SimplestPrompt-2.18.zip).
  Sync UX redesign: three fields, one button, automatic sync (see below).

## What 2.18 contains

Sync UX redesign is **implemented**:

- Settings → Syncing is now three fields (**Gist URL**, **Gist token**, **Sync
  password**) and one **Enable syncing** button, then a status box with last sync
  time and **Disconnect**. Manual version choice lives under "Advanced".
- Empty Gist URL = the extension creates a secret Gist on Enable.
- Sync is automatic **while the side panel is open**: debounced (3 s) push after
  a data change, check on panel open, on becoming visible, and every 5 minutes.
  Conflicts still ask the user (never merged); Cancel pauses auto-sync until the
  next data change or manual action.
- Token and password are both saved in `syncConfig` (local only, never uploaded or
  exported). Encryption format is unchanged, so existing encrypted Gists keep
  working with the same password; no migration needed.
- Enable verifies the candidate token with GitHub before saving; an expired token
  shows a friendly "create a new token" message and leaves the old connection
  untouched. A Gist without our file is treated as empty and filled on first sync.
- Removed: diagnostics ("Check connection", safe report), "Sync now", "Create a
  private Gist" button, scenario guide, backend select, and their i18n strings.
- Tests: `tests/sync-diagnostics.test.cjs` replaced by `tests/sync.test.cjs`;
  browser harness and fixture rewritten for the new flow. Docs updated: README
  sync section, `CLAUDE.md`, `AGENTS.md` (passphrase is now persisted locally).

## Known limits

- Auto-sync runs in the side panel (crypto lives there). Edits are only possible in
  the panel, so changes are covered; nothing syncs while the panel is closed.
- Vivaldi shows prompt context-menu items in the extension icon menu regardless of
  `contexts` (browser bug). Chrome is fixed via `PAGE_MENU_CONTEXTS`.
- The real extension was not loaded in Chrome in this session; only the harness
  and node tests ran. Do a manual pass (enable sync with a real token, second
  browser, expired token) before releasing.

## Next step

No open work. The release was not tested by hand in real Chrome before publishing; if the
user reports a problem with enabling sync, expired tokens or a second browser, start there.
