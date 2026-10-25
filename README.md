<div align="center">

# SimplestPrompt

**Your prompts, one right-click away. Instant AI on any selected text.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Latest release](https://img.shields.io/github/v/release/thejohnd0e/SimplestPrompt?label=release)](https://github.com/thejohnd0e/SimplestPrompt/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/thejohnd0e/SimplestPrompt/total)](https://github.com/thejohnd0e/SimplestPrompt/releases)
[![Issues](https://img.shields.io/github/issues/thejohnd0e/SimplestPrompt)](https://github.com/thejohnd0e/SimplestPrompt/issues)
[![Privacy: local-first](https://img.shields.io/badge/privacy-local--first-brightgreen.svg)](#-sync-between-browsers)
[![Browser](https://img.shields.io/badge/Chrome-Extension-green.svg)](#installation)
[![Manifest](https://img.shields.io/badge/Manifest-V3-informational.svg)](#tech-stack)

[Download](https://github.com/thejohnd0e/SimplestPrompt/releases/latest) · [Install](#installation) · [Sync](#-sync-between-browsers) · [Report an issue](https://github.com/thejohnd0e/SimplestPrompt/issues)

</div>

Stop copying and pasting the same prompts into ChatGPT, Claude, Grok, Gemini and Perplexity over and over.

- **Select text → right-click → pick a prompt → pick an AI.** The AI opens with your text already inserted.
- **Save your favorite prompts** in folders. They live in the right-click menu: one click to copy or auto-paste anywhere.
- **Everything stays on your computer** by default. Optional [encrypted sync](#-sync-between-browsers) between browsers is available when you want it.

Good for quick translations, rewriting posts, summarizing articles, analyzing comments, improving your own text — all in one right-click.

## Preview

<p align="center">
  <img src="assets/screenshot.png" width="380" alt="Prompts tab: folders and saved prompts with Copy buttons">
  <img src="assets/screenshot-2.png" width="380" alt="AI on Selection tab: AI targets and selection prompts">
</p>
<p align="center">
  <img src="assets/screenshot-3.png" width="380" alt="Right-click menu with your folders and prompts">
  <img src="assets/screenshot-4.png" width="380" alt="Right-click menu: AI on Selection with prompts and AI targets">
</p>
<p align="center">
  <img src="assets/screenshot-5.png?v=2" width="380" alt="Settings: language and automatic encrypted sync through a GitHub Gist">
</p>

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Features](#features)
- [Sync between browsers](#-sync-between-browsers)
- [Troubleshooting](#troubleshooting)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Permissions](#permissions)
- [Known limitations](#known-limitations)
- [License](#license)

## Installation

1. Download the latest zip from the [Releases page](https://github.com/thejohnd0e/SimplestPrompt/releases/latest) and unzip it into a folder you will keep (for example `Documents\SimplestPrompt`).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
4. Pin the extension to the toolbar if you like.

**Updating:** download the new release, unzip it over the same folder, then click **Reload** on the extension's card in `chrome://extensions`. Your prompts and settings stay, as long as you keep using the same folder.

> **Tip:** Chrome keeps your data per extension install. If you load the extension from a different folder, it is treated as a new install with empty data. Use **Export** (or [sync](#-sync-between-browsers)) to move your data.

## Quick start

1. Click the extension icon to open the **side panel**.
2. **Prompts** tab: create a folder, then add prompts to it.
3. Drag cards to arrange them. This order is used in the right-click menu.
4. On any regular website, right-click and choose `SimplestPrompt → Folder → Prompt`.
5. The prompt is copied to the clipboard, or pasted straight into the field if [auto-paste](#auto-paste) is on.
6. **AI on Selection:** select some text, right-click, choose `AI on Selection → Prompt → AI`.

## Features

### Prompts and folders

- Save prompts in folders; reorder folders and prompts by drag-and-drop.
- Double-click a card to edit it; delete from the edit dialog.
- Import and export everything as one JSON file.
- The context menu rebuilds automatically after every change.

### Auto-paste

Turn on **Auto-paste into focused field** in the side panel to have the prompt inserted directly into the field you right-clicked. When it is off, the prompt is only copied and you paste it with `Ctrl+V` (you will see a "Copied" message).

### AI on Selection

A separate context menu that appears only when text is selected: `AI on Selection → Selection prompt → AI target`.

- **Selection prompts** are templates; `{{text}}` is replaced with your selected text.
- **AI targets** open in a new tab. The text is passed either through a URL query parameter or, where that is not possible, pasted into the AI's input box.
- Built-in targets: **ChatGPT, Claude, Grok, Gemini, Perplexity**. Add any other AI with its URL.
- Built-in prompts include Translate, Summarize, Key takeaways, Rewrite simpler, Improve clarity, Explain like I'm 5, Pros and cons and more. Edit or add your own.
- On the **AI on Selection** tab you can switch the menu on or off and import/export targets and prompts.

### Sync

Optional, automatic, end-to-end encrypted sync through a secret GitHub Gist, available under **Settings** (the gear button). See [Sync between browsers](#-sync-between-browsers).

### Interface language

Open **Settings** (the gear button) and use **Language** at the top to choose **English** or **Русский**. English is the default regardless of your browser language. The selection applies immediately to the panel, dialogs, help and extension context-menu labels, and is remembered in this browser only. It is not synced or exported. Your prompt text, folder names, AI target names and saved templates are never translated or changed by this setting.

## 🔄 Sync between browsers

Keep the same prompts on every computer or browser profile. Sync is **optional**: until you enable it, your data never leaves the browser. Once enabled it runs **automatically** while the side panel is open: changes are uploaded a few seconds after you make them, and the Gist is checked when the panel opens and every few minutes.

**What is synced:** your prompts and folders, AI targets, selection prompts, the AI on Selection switch, and the auto-paste setting.
**What is never synced:** your GitHub token, your password, the sync settings, and the interface language.

### Set it up

Open **Settings** (the gear button) and find **Syncing**. There are three fields and one button:

1. **Gist URL.** [Create a secret Gist](https://gist.github.com/) and paste its URL, or leave the field empty and the extension creates one for you.
2. **Gist token.** [Create a token (classic)](https://github.com/settings/tokens/new?scopes=gist&description=SimplestPrompt) with only the **`gist`** permission and paste it. It is saved in this browser only.
3. **Sync password.** Used to encrypt your data. Choose one and **use the same password in every browser**; it is saved in this browser only.
4. Click **Enable syncing**. The status box shows the Gist, the **Last sync** time and **Disconnect**. Once sync works, the button is called **Update connection**; use it to enter a new token or Gist.

### Another browser

Enter the **same Gist URL**, your token and the **same password**, then click **Enable syncing**. If this browser has no data, the Gist is downloaded. If it already has data, you are asked once whether to keep the local or the Gist version.

### Good to know

| Situation | What happens |
| --- | --- |
| You edit prompts | They are uploaded automatically a few seconds later |
| Another browser changed the Gist | The change is downloaded on the next check, when nothing changed locally |
| Both sides changed | Nothing is overwritten silently: you choose the local or the Gist version (data is not merged) |
| Your token expired or was rejected | The status says so. Create a new token, paste it into **Gist token** and click **Enable syncing**. The previous connection stays unchanged until GitHub accepts the new one |
| You want a specific version | Use **Advanced: choose a version manually** |
| You want to stop | Click **Disconnect** (removes the saved token, password and Gist from this browser; the Gist on GitHub is kept) |

### Security

- Your data is encrypted in the browser with **AES-GCM**, using a key derived from your password with **PBKDF2-SHA-256**, before it is sent. GitHub only receives the encrypted file `simplestprompt-data.json` (plus salt, IV and algorithm info), never your prompts, token or password.
- The **token and the password are saved locally** in the extension (`chrome.storage.local`) so syncing keeps working after a restart. They are never uploaded, exported or exposed to web pages. Anyone with access to your browser profile can read them.
- If you lose the password, nobody (including you and GitHub) can recover the encrypted copy.
- A secret Gist is unlisted, not access-restricted: anyone with the link can view the encrypted file. Use a strong password.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| The prompt is only copied, not pasted ("Copied") | Turn on **Auto-paste into focused field** in the side panel. Click inside the input field first, then use the right-click menu. |
| No menu appears | Reload the extension in `chrome://extensions`. Browser pages (`chrome://…`) are not supported. |
| Version did not change after updating | Click **Reload** on the extension card and check **Source** in the card's Details. Reload only re-reads the folder the extension was loaded from. |
| My prompts disappeared after switching folders | A different folder means a different install with empty data. Import your JSON export or use sync. |
| Sync stopped with an error | Read the status box under **Settings → Syncing**. An expired token is the most common cause: create a new token, paste it into **Gist token** and click **Enable syncing**. |

Still stuck? [Open an issue](https://github.com/thejohnd0e/SimplestPrompt/issues) and include your browser, OS, the extension version and the website.

## Data model

Stored in `chrome.storage.local`:

| Key | Purpose |
| --- | --- |
| `folders` | Folders with their prompts |
| `autoPaste` | Auto-insert on or off |
| `aiOnSelectionEnabled` | Show or hide the AI on Selection menu |
| `aiTargets` | AI services (name, base URL, query parameter, paste fallback) |
| `selectionPrompts` | Selection prompt templates using `{{text}}` |
| `syncConfig` | Local token and Gist metadata; **never** part of the sync payload |
| `language` | Local interface language (`en` or `ru`); **never** synced or exported |

The first five keys form the encrypted sync payload.

<details>
<summary>Examples</summary>

Folder:

```json
{
  "id": "uuid",
  "name": "General",
  "prompts": [
    {
      "id": "uuid",
      "title": "Summarize",
      "text": "Summarize the following text...",
      "timestamp": "2026-02-16T00:00:00.000Z"
    }
  ]
}
```

AI target:

```json
{
  "id": "uuid",
  "name": "Gemini",
  "baseUrl": "https://gemini.google.com/app",
  "queryParam": "",
  "usePasteFallback": true
}
```

Selection prompt:

```json
{
  "id": "uuid",
  "name": "Translate to Russian",
  "template": "Переведи на русский, сохраняя стиль и тон:\\n\\n{{text}}",
  "timestamp": "2026-02-16T00:00:00.000Z"
}
```

</details>

## Tech stack

- Chrome Manifest V3 extension, no build step
- Service worker (`background.js`) for menus, copy/auto-paste and AI opening
- Side panel UI (`sidepanel.html`, `sidepanel.js`)
- `chrome.storage.local` for data
- Content script for Gemini (`content.js`)
- GitHub Gist REST API with Web Crypto encryption for sync

## Project structure

| File | Role |
| --- | --- |
| `manifest.json` | Extension metadata, permissions, entry points |
| `background.js` | Context menus, clipboard, auto-paste, AI on Selection, Gist requests |
| `sidepanel.html` / `sidepanel.js` | Side panel layout and logic |
| `crypto.js` | PBKDF2 / AES-GCM encryption for sync |
| `i18n.js` | Shared English/Russian interface catalogue and language preference |
| `content.js` | Gemini input helper (runs only on `gemini.google.com`) |
| `icons/` | Extension icons (16, 48, 128) |

### Development checks

No dependencies or build step are required. With Node.js installed, run `node --check` on `background.js`, `sidepanel.js`, `content.js`, `crypto.js` and `i18n.js` for syntax checks. After a source change, reload the unpacked extension and manually check the side panel, the page context menus and Gemini integration.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save folders and prompts locally |
| `contextMenus` | Create the right-click entries |
| `clipboardWrite` | Copy prompt text |
| `sidePanel` | Show the management UI |
| `activeTab`, `scripting` | Insert text into the current page |
| Host `https://gemini.google.com/*` | Fill Gemini's input |
| Host `https://api.github.com/*` | Optional Gist sync |

## Known limitations

- Browser-internal pages (`chrome://`, `edge://`, `about:`) cannot be scripted.
- Sites with restrictive security policies or custom editors may limit insertion; the prompt is then copied instead.
- The context menu shows the first 25 folders and 30 prompts per folder (a Chrome menu limit); the rest are available in the side panel.
- Sync is optional, runs while the side panel is open, and needs a GitHub token with the `gist` scope.
- A lost sync password cannot be recovered.

## License

[MIT](LICENSE)
