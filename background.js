/* Right-Click Prompt (Local) - background service worker. No auth, no cloud. */

const MENU_ROOT = 'rcp_root';
const MAX_FOLDERS = 25;
const MAX_PROMPTS_PER_FOLDER = 30;

async function getFolders() {
  const { folders } = await chrome.storage.local.get({ folders: [] });
  return Array.isArray(folders) ? folders : [];
}

async function saveFolders(folders) {
  await chrome.storage.local.set({ folders });
}

async function buildContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ROOT, title: 'SimplestPrompt', contexts: ['all'] });

  const folders = await getFolders();
  const withPrompts = folders.filter(f => f.prompts && f.prompts.length > 0);

  if (withPrompts.length === 0) {
    chrome.contextMenus.create({ id: 'rcp_open_panel', parentId: MENU_ROOT, title: 'Add prompts in panel...', contexts: ['all'] });
  } else {
    const sliceFolders = withPrompts.slice(0, MAX_FOLDERS);
    for (const folder of sliceFolders) {
      chrome.contextMenus.create({
        id: 'folder_' + folder.id,
        parentId: MENU_ROOT,
        title: folder.name,
        contexts: ['all']
      });
      const prompts = (folder.prompts || []).slice(0, MAX_PROMPTS_PER_FOLDER);
      for (const p of prompts) {
        chrome.contextMenus.create({
          id: 'prompt_' + p.id,
          parentId: 'folder_' + folder.id,
          title: (p.title || 'Untitled').substring(0, 50),
          contexts: ['all']
        });
      }
      if ((folder.prompts || []).length > MAX_PROMPTS_PER_FOLDER) {
        chrome.contextMenus.create({
          id: 'more_' + folder.id,
          parentId: 'folder_' + folder.id,
          title: '... more in panel',
          contexts: ['all']
        });
      }
    }
    if (withPrompts.length > MAX_FOLDERS) {
      chrome.contextMenus.create({ id: 'rcp_more_folders', parentId: MENU_ROOT, title: '... more in panel', contexts: ['all'] });
    }
  }

  chrome.contextMenus.create({ id: 'rcp_sep1', type: 'separator', parentId: MENU_ROOT, contexts: ['all'] });
  chrome.contextMenus.create({ id: 'rcp_open_panel_2', parentId: MENU_ROOT, title: 'Open panel', contexts: ['all'] });
  chrome.contextMenus.create({ id: 'rcp_refresh', parentId: MENU_ROOT, title: 'Refresh menu', contexts: ['all'] });
}

function showToast(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    const url = tab.url || '';
    const restricted = /^(chrome|chrome-extension|devtools|edge|about):/i.test(url);
    if (restricted) {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 16px;border-radius:8px;z-index:2147483647;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
      },
      args: [message]
    }).catch(() => {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
    });
  });
}

async function copyToClipboard(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id && tab.url && !/^(chrome|chrome-extension|devtools|edge|about):/i.test(tab.url)) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (t) => navigator.clipboard && navigator.clipboard.writeText(t),
        args: [text]
      });
      return true;
    } catch (e) {
      // fallback: try worker clipboard if permitted
    }
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText)
      await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

async function tryPasteInTab(tabId, text, frameId) {
  if (!tabId || !chrome.scripting) return false;
  try {
    const target = Number.isInteger(frameId) && frameId >= 0
      ? { tabId, frameIds: [frameId] }
      : { tabId };
    const result = await chrome.scripting.executeScript({
      target,
      func: (t) => {
        function isTextLikeInput(el) {
          if (!el || el.tagName !== 'INPUT') return false;
          var type = (el.type || 'text').toLowerCase();
          return !/^(button|submit|reset|checkbox|radio|file|image|range|color|hidden)$/i.test(type);
        }
        function setNativeValue(el, next) {
          if (!el) return;
          var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype : window.HTMLInputElement && window.HTMLInputElement.prototype;
          var desc = proto && Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) {
            desc.set.call(el, next);
          } else {
            el.value = next;
          }
        }
        function pasteInto(el) {
          if (!el) return false;
          el.focus();
          if (el.tagName === 'TEXTAREA' || isTextLikeInput(el)) {
            var start = el.selectionStart || 0, end = el.selectionEnd || 0, val = el.value || '';
            setNativeValue(el, val.slice(0, start) + t + val.slice(end));
            el.selectionStart = el.selectionEnd = start + t.length;
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: t, inputType: 'insertText' }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          if (el.isContentEditable) {
            if (document.execCommand('insertText', false, t)) return true;
            var sel = window.getSelection(), r = sel && sel.rangeCount && sel.getRangeAt(0);
            if (r) {
              r.deleteContents();
              var tn = document.createTextNode(t);
              r.insertNode(tn);
              r.setStartAfter(tn);
              r.setEndAfter(tn);
              sel.removeAllRanges();
              sel.addRange(r);
              el.dispatchEvent(new InputEvent('input', { bubbles: true, data: t }));
              return true;
            }
            return false;
          }
          return false;
        }
        var el = document.activeElement;
        if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable))
          if (pasteInto(el)) return true;
        var selectors = [
          '#prompt-textarea', '[id^="prompt-textarea"]',
          'form input:not([type]), form input[type="text"], form input[type="search"], form input[type="email"], form input[type="url"], form input[type="tel"], form input[type="password"], form input[type="number"]',
          'div[contenteditable="true"][data-id="root"]',
          '[data-testid="composer-input-container"] [contenteditable="true"]',
          '.ProseMirror[contenteditable="true"]',
          '[data-testid="composer-input"]',
          'form textarea', 'main textarea', '.input textarea', '.composer textarea',
          'div[contenteditable="true"]'
        ];
        for (var i = 0; i < selectors.length; i++) {
          var found = document.querySelector(selectors[i]);
          if (found && (found.offsetParent !== null || found.getBoundingClientRect().height > 0))
            if (pasteInto(found)) return true;
        }
        var textareas = document.querySelectorAll('textarea');
        for (var j = 0; j < textareas.length; j++)
          if (textareas[j].offsetParent !== null && pasteInto(textareas[j])) return true;
        var inputs = document.querySelectorAll('input');
        for (var m = 0; m < inputs.length; m++) {
          var input = inputs[m];
          if (!isTextLikeInput(input)) continue;
          if (input.offsetParent !== null || input.getBoundingClientRect().height > 0)
            if (pasteInto(input)) return true;
        }
        var editables = document.querySelectorAll('[contenteditable="true"]');
        for (var k = 0; k < editables.length; k++)
          if (editables[k].offsetParent !== null && pasteInto(editables[k])) return true;
        return false;
      },
      args: [text]
    });
    return result && result[0] && result[0].result === true;
  } catch (e) {
    return false;
  }
}

async function handlePromptCopy(promptId, text) {
  const { autoPaste } = await chrome.storage.local.get({ autoPaste: false });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab && tab.id;
  const url = tab && tab.url || '';
  const restricted = /^(chrome|chrome-extension|devtools|edge|about|centbrowser):/i.test(url);

  if (autoPaste && tabId && !restricted) {
    const pasted = await tryPasteInTab(tabId, text);
    if (pasted) {
      showToast('Pasted!');
      return;
    }
  }
  if (restricted) {
    showToast('Blocked on browser internal pages. Use a regular website tab.');
    return;
  }
  const ok = await copyToClipboard(text);
  showToast(ok ? 'Copied! Paste with Ctrl+V' : 'Failed to copy');
}

let debounceTimer;
function debouncedRebuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(buildContextMenu, 300);
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  await buildContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.folders || changes.quickAccessData)) debouncedRebuild();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = info.menuItemId;
  if (id === 'rcp_open_panel' || id === 'rcp_open_panel_2' || id === 'rcp_more_folders') {
    if (tab && tab.id) chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  if (id === 'rcp_refresh') {
    await buildContextMenu();
    showToast('Menu refreshed');
    return;
  }
  if (id.startsWith('more_')) {
    if (tab && tab.id) chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  const promptMatch = id.startsWith('prompt_') && id.slice(7);
  if (promptMatch) {
    const folders = await getFolders();
    for (const folder of folders) {
      const prompt = (folder.prompts || []).find(p => p.id === promptMatch);
      if (prompt) {
        const { autoPaste } = await chrome.storage.local.get({ autoPaste: false });
        const url = tab && tab.url || '';
        const restricted = /^(chrome|chrome-extension|devtools|edge|about|centbrowser):/i.test(url);
        if (autoPaste && tab && tab.id && !restricted) {
          const pasted = await tryPasteInTab(tab.id, prompt.text, info.frameId);
          if (pasted) {
            showToast('Pasted!');
            return;
          }
        }
        await handlePromptCopy(prompt.id, prompt.text);
        return;
      }
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getFolders') {
    getFolders().then(f => sendResponse({ folders: f }));
    return true;
  }
  if (msg.action === 'saveFolders') {
    saveFolders(msg.folders).then(() => { debouncedRebuild(); sendResponse({ success: true }); }).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (msg.action === 'rebuildMenu') {
    buildContextMenu().then(() => sendResponse({ success: true }));
    return true;
  }
  if (msg.action === 'enableAutoPaste') {
    chrome.storage.local.set({ autoPaste: true }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (msg.action === 'disableAutoPaste') {
    chrome.storage.local.set({ autoPaste: false }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (msg.action === 'getAutoPaste') {
    chrome.storage.local.get({ autoPaste: false }).then(o => sendResponse({ autoPaste: o.autoPaste }));
    return true;
  }
});
