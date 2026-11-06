# Chrome Web Store listing draft

## Single purpose
Save and organize reusable AI prompts and use them on selected text or in web-page editors.

## Description
Save AI prompts in folders and access them from the right-click menu. Copy a prompt or optionally insert it into a page's editor. Select text and apply a prompt using your chosen AI service. Manage prompts in the side panel, export a local backup, and optionally synchronize encrypted data with your own GitHub Gist.

Prompts and settings are stored locally. AI on Selection passes your selected text and prompt to the AI service you choose; some services receive the text in the URL, which may be recorded in browser history or server logs. If enabled, sync sends encrypted prompts and settings to GitHub. Your GitHub token is sent to GitHub for authentication and is stored locally alongside the sync password.

## Permission justifications
- `storage`: store prompts, targets and settings locally.
- `contextMenus`: offer saved prompts and selection actions on right-click.
- `clipboardWrite`: copy prompts or selected-text requests when requested.
- `sidePanel`: provide the prompt and settings interface.
- `activeTab` and `scripting`: copy or insert a chosen prompt in the user-invoked page.
- `https://gemini.google.com/*`: insert selected-text requests into Gemini's editor.
- `https://api.github.com/*`: communicate with GitHub for optional encrypted Gist sync.

## Dashboard checklist
- Publish `PRIVACY.md` at an accessible URL and provide the link in the privacy field; link the policy from the project homepage.
- Disclose applicable user-generated content and authentication information accurately, including transfers to the user's selected AI service and GitHub; review dashboard definitions before choosing categories and certifications.
- Declare no remotely hosted code only after reviewing the final submitted archive.
- Provide a 128×128 store icon and at least one accurate 1280×800 screenshot; fill category, language, support contact and distribution fields.
- Test a clean installation, all AI targets and optional sync; provide reviewers any necessary instructions. Do not submit until the listing and policy accurately describe the release.
