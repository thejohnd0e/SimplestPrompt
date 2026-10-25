# TODO

Next agent: read STATUS.md and DECISIONS.md first.

## Open

- [ ] Manual check in real Chrome of the released 2.18 (enable sync with a real token, empty and
      existing URL, second browser with the same password, expired token, Disconnect).

## Done (sync UX redesign)

- [x] Encryption model: keep password field, persist it locally (user choice).
- [x] Three fields + one button, automatic sync, status + Disconnect.
- [x] Expired-token path, diagnostics/validation clutter removed.
- [x] README, CLAUDE.md, AGENTS.md, tests updated; released as 2.18.

## Ideas (not requested)

- Sync while the panel is closed would require moving crypto into the service worker.
