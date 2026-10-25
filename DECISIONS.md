# DECISIONS

Recorded for the next agent. Dates are approximate session dates.

## 2026-10-25 — Settings gear and interface language (shipped in 2.16)

- The "Sync" tab became a **Settings gear**; synchronization lives under it with
  a **Language** selector at the top.
- **English is the default** regardless of browser locale. Russian is a manual
  choice. The `language` preference is stored only in `chrome.storage.local`
  (`language` key), never synced or exported.
- All UI strings live in `i18n.js` as EN-keyed entries with RU translations;
  user-authored content (names, prompt text, templates) is never translated.

## 2026-10-25 — Sync UI is minimal, password kept (implemented in 2.17)

- User directive: no scenario pickers, diagnostics or advanced clutter. Result:
  **Gist URL, Gist token, Sync password, one Enable button**, automatic sync, status
  line, Disconnect.
- **Encryption stays.** The user chose a third visible field (password) over
  dropping encryption. The password is **persisted locally in syncConfig** (user
  chose this over memory-only) so automatic sync works after restart. Existing
  encrypted Gists remain readable; no migration.
- Auto-sync runs in the side panel only (crypto lives there). Never merges: on
  conflicts the user chooses. Diagnostic/validation feature from the 2.16.2 draft was
  removed; only a minimal pre-save token check remains.

## Bug root cause (recorded, not a code fix)

- The user's HTTP 401 was caused by an **expired GitHub token** (expiry 2026-10-21),
  not an extension regression. The UI now explains this and makes reconnecting trivial.
