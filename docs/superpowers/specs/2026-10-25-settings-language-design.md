# Settings and interface language

Approved scope: replace the Sync tab label with an accessible gear button opening Settings. Put an English / Русский selector first, followed by the existing sync controls and guide. Translate the entire extension-owned interface, context menus, dialogs, notices and errors. English remains the default.

Use a shared, dependency-free `i18n.js` catalogue in the panel and classic service worker. Keep the selected `language` in local storage only; never add it to sync payloads or exports. Unknown/missing languages fall back to English. Apply changes without reloading the panel or losing form contents, password, selected folder or search. Preserve user-authored names, prompt bodies, templates, storage shapes, encryption and menu context restrictions/limits.

Approaches: browser `_locales` alone follows browser language and cannot provide this manual switch; separate translated pages duplicate UI and logic. Selected approach: one shared runtime catalogue with explicit translation markers and parameter substitution. Trusted, fixed rich-text guide translations may contain markup; user values must remain escaped/text-only.

No changes to Vivaldi browser internals or sync behavior. Built-in prompt content remains data, not UI. Document the setting and release as 2.16.0 (display 2.16). Browser/API-originated technical details may retain their original text after a localized explanation.
