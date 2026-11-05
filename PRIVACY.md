# Privacy Policy for SimplestPrompt

**Last updated:** November 5, 2026

SimplestPrompt is a local-first Chrome extension for saving AI prompts and accessing them from the right-click context menu and side panel.

## 1. Data Storage (Local by Default)

By default, all data you create or configure in SimplestPrompt is stored strictly on your device using Chrome's local extension storage (`chrome.storage.local`), including:
- Saved folders and prompts
- AI targets and selection prompt templates
- Extension preferences (`autoPaste`, `aiOnSelectionEnabled`, interface `language`)

SimplestPrompt does **not** operate any developer servers, analytics, telemetry, tracking scripts, or advertising.

## 2. Optional Encrypted GitHub Gist Sync

If you choose to enable the optional **Syncing** feature in Settings:
- Your prompts, folders, AI targets, selection prompts, and toggle settings are encrypted **on your device** using **AES-GCM (256-bit)** with a key derived from your sync password via **PBKDF2-SHA-256** before leaving the browser.
- The encrypted payload (`simplestprompt-data.json`) is sent directly from your browser to `https://api.github.com` using the GitHub Personal Access Token and Gist that you provide.
- Your GitHub token and sync password are stored locally in `chrome.storage.local` so automatic sync continues across browser restarts. The token is sent to GitHub in the HTTPS authorization header; it is not included in the Gist or JSON backups. The sync password is not sent to GitHub or included in backups. Anyone with access to your browser profile may be able to read these locally stored credentials.

## 3. Interaction with Web Pages and AI Services

- **Prompt insertion & clipboard:** When you select a prompt from the context menu, the extension copies it to your clipboard or inserts it into the currently focused text field on the active tab.
- **AI on Selection:** When you highlight text on a webpage and choose an AI target from the context menu, the extension opens your chosen AI service (such as ChatGPT, Claude, Grok, Gemini, Perplexity, or a custom HTTPS URL you configured) and passes the formatted prompt via URL parameter, clipboard, or editor injection (on `https://gemini.google.com/*`). URL parameters may appear in browser history and in the service's or intermediaries' logs. The chosen service's own privacy policy applies. Clipboard content may be accessible to other applications.

## 4. Third-Party Sharing

SimplestPrompt does not sell or rent your data. The extension transfers data to third parties in these user-directed cases:
1. Trigger an **AI on Selection** action to send selected text to the AI service you chose, or
2. Enable **GitHub Gist Sync**, which sends client-side encrypted data and an authorization token to GitHub via `api.github.com`.

After you enable sync, the extension may check and update your Gist automatically while the side panel is open. Export creates a readable local backup. SimplestPrompt's use and transfer of information complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## 5. Contact

If you have questions or concerns about this policy, please open an issue on the project repository:
https://github.com/thejohnd0e/SimplestPrompt/issues
