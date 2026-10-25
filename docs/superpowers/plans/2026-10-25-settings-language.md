# Settings and Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accessible Settings gear, persistent English/Russian selection and full extension-owned UI localization.

**Architecture:** Shared classic-script `I18n` catalogue, English source strings as keys and named rich-guide entries. Explicit DOM translation attributes; translate dynamic rendering and worker menus using the same catalogue.

**Tech Stack:** Plain JavaScript, Chrome MV3, HTML/CSS, dependency-free Node verification scripts.

**Spec:** `docs/superpowers/specs/2026-10-25-settings-language-design.md`

## Global Constraints
- English default; English / Русский choices; language stays local and outside sync/exports.
- Preserve user content, drafts, encryption, existing menu restrictions and 25-folder/30-prompt limits.
- No dependencies/build pipeline. Source changes at repository root, release 2.16.0 / 2.16.

## Review Focus
- Missing/invalid preference: English fallback on panel open and worker cold start.
- Switching language: no draft, passphrase, search or selection loss.
- Names containing markup: remain data, never translated or executed.
- Worker restart/storage changes: localized menus and notifications use saved language.
- Sync and errors: translated descriptions without changing payloads or exposing secrets.

### Task 1: Shared catalogue
Files: create `i18n.js`, `tests/i18n.test.cjs`.
Interfaces: `I18n.t(key, params)`, `I18n.load()`, `I18n.setLanguage(value)`, `I18n.apply(root)`, `I18n.errorMessage(error)`; `I18n.language`.
- [x] Add failing Node tests for default/fallback, Russian translation, literal placeholder substitution and local persistence.
- [x] Run `node --test tests/i18n.test.cjs`, observe missing implementation failure.
- [x] Implement shared catalogue and DOM attributes, then rerun tests.

### Task 2: Panel and worker integration
Files: modify `sidepanel.html`, `sidepanel.js`, `background.js`; add integration tests in `tests/i18n.test.cjs`.
- [x] Add failing worker checks for localized menus and storage-change rebuilds; add real-DOM browser checks for settings, drafts and local-only preference.
- [x] Implement settings tab, translate static/dynamic UI, load preference before rendering, update via storage events without panel reload. Load locale before menus and notifications.
- [x] Run tests, verify expected labels and no data mutation, review coverage of static markers and dynamic translation calls.

### Task 3: Documentation and verification
Files: modify `README.md`, `manifest.json`.
- [x] Document Settings > Sync and language preference; bump version to 2.16.0 / 2.16.
- [x] Run all Node tests, `node --check` on all extension scripts, JSON validation, `git diff --check`.
- [x] Inspect panel in browser if available; explicitly report any manual checks not performed. Do not claim the Vivaldi toolbar bug is fixed.

## Execution record

- Work remains in the existing checkout to preserve and extend the preceding uncommitted user-approved changes; no worktree, automatic commit or publish was performed.
- Task 1: complete — four tests observed failing without the catalogue, then passing.
- Task 2: worker menu and language-event tests observed RED→GREEN; real Chromium DOM harness passes 21 checks. Conflict-error retranslation regression observed RED→GREEN. Screenshot inspected at 360px panel width with Russian settings.
- The browser harness substitutes Chrome APIs only; actual installed-extension menus, real Gist requests and Gemini are not exercised by it.
- Task 3: complete — `node --test`: 8/8; real Chromium harness: 21/21, no console errors; syntax and manifest checks pass, diff whitespace check passes (Git warns about existing mixed line endings in HTML).
- The initial full Node run also discovered the browser-only `panel.test.js` and failed because Node has no DOM. Renamed it `panel.browser.js`; full Node suite then passed, and the renamed browser harness was rerun successfully.
- Final review: fresh read-only reviewer found no Critical/Important issues; independently reran 8 Node tests and syntax checks. Browser checks and screenshot were performed by the implementer, not independently by the reviewer.
- Final: minor (deferred): broaden markup-escaping regression fixtures from prompt bodies to folder/prompt/target/selection-prompt names; implementation already escapes these names.
- Final: minor (deferred): add draft-preservation browser tests for folder, AI-target and selection-template dialogs in addition to the tested prompt and sync drafts.
