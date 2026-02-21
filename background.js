/* Right-Click Prompt (Local) - background service worker. No auth, no cloud. */

const MENU_ROOT = 'rcp_root';
const AI_MENU_ROOT = 'ai_selection_root';
const MAX_FOLDERS = 25;
const MAX_PROMPTS_PER_FOLDER = 30;

async function getFolders() {
  const { folders } = await chrome.storage.local.get({ folders: [] });
  return Array.isArray(folders) ? folders : [];
}

async function saveFolders(folders) {
  await chrome.storage.local.set({ folders });
}

async function getAiSelectionConfig() {
  const { aiOnSelectionEnabled, aiTargets, selectionPrompts } = await chrome.storage.local.get({
    aiOnSelectionEnabled: true,
    aiTargets: [],
    selectionPrompts: []
  });
  return {
    aiOnSelectionEnabled: aiOnSelectionEnabled !== false,
    aiTargets: Array.isArray(aiTargets) ? aiTargets : [],
    selectionPrompts: Array.isArray(selectionPrompts) ? selectionPrompts : []
  };
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

  await buildAiOnSelectionMenu();
}

async function buildAiOnSelectionMenu() {
  const { aiOnSelectionEnabled, aiTargets, selectionPrompts } = await getAiSelectionConfig();
  if (!aiOnSelectionEnabled) return;

  chrome.contextMenus.create({ id: AI_MENU_ROOT, title: 'AI on Selection', contexts: ['selection'] });

  if (selectionPrompts.length === 0) {
    chrome.contextMenus.create({
      id: 'ai_open_panel_empty_prompts',
      parentId: AI_MENU_ROOT,
      title: 'Add selection prompts in panel...',
      contexts: ['selection']
    });
    return;
  }

  if (aiTargets.length === 0) {
    chrome.contextMenus.create({
      id: 'ai_open_panel_empty_targets',
      parentId: AI_MENU_ROOT,
      title: 'Add AI targets in panel...',
      contexts: ['selection']
    });
    return;
  }

  for (const sp of selectionPrompts) {
    const promptId = 'ai_prompt_' + sp.id;
    chrome.contextMenus.create({
      id: promptId,
      parentId: AI_MENU_ROOT,
      title: (sp.name || 'Untitled').substring(0, 50),
      contexts: ['selection']
    });
    for (const target of aiTargets) {
      chrome.contextMenus.create({
        id: `ai_target__${sp.id}__${target.id}`,
        parentId: promptId,
        title: (target.name || 'AI').substring(0, 50),
        contexts: ['selection']
      });
    }
  }

  chrome.contextMenus.create({
    id: 'ai_open_panel',
    parentId: AI_MENU_ROOT,
    title: 'Open panel',
    contexts: ['selection']
  });
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
      func: async (t) => {
        function isTextLikeInput(el) {
          if (!el || el.tagName !== 'INPUT') return false;
          var type = (el.type || 'text').toLowerCase();
          return !/^(button|submit|reset|checkbox|radio|file|image|range|color|hidden)$/i.test(type);
        }
        function isEditable(el) {
          return !!(el && (el.tagName === 'TEXTAREA' || isTextLikeInput(el) || el.isContentEditable));
        }
        function isVisible(el) {
          if (!el) return false;
          var rect = el.getBoundingClientRect();
          return (el.offsetParent !== null || rect.height > 0 || rect.width > 0);
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
            try {
              el.textContent = t;
              el.dispatchEvent(new InputEvent('input', { bubbles: true, data: t }));
              return true;
            } catch (e) {}
            return false;
          }
          return false;
        }
        function dispatchPaste(el, text) {
          try {
            var dt = new DataTransfer();
            dt.setData('text/plain', text);
            var evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            return el.dispatchEvent(evt);
          } catch (e) {
            return false;
          }
        }
        function readEditableValue(el) {
          if (!el) return '';
          if (el.tagName === 'TEXTAREA' || isTextLikeInput(el)) return el.value || '';
          if (el.isContentEditable) return el.textContent || '';
          return '';
        }
        async function sleep(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        async function waitForElement(selectors, timeoutMs) {
          return new Promise((resolve) => {
            var done = false;
            var timeout = setTimeout(() => {
              if (done) return;
              done = true;
              observer.disconnect();
              resolve(null);
            }, timeoutMs || 7000);
            function check() {
              for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el && isVisible(el)) return el;
              }
              return null;
            }
            var found = check();
            if (found) {
              done = true;
              clearTimeout(timeout);
              resolve(found);
              return;
            }
            var observer = new MutationObserver(() => {
              var next = check();
              if (next && !done) {
                done = true;
                clearTimeout(timeout);
                observer.disconnect();
                resolve(next);
              }
            });
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
          });
        }
        function deepQuerySelector(selectors) {
          var queue = [document.documentElement];
          while (queue.length) {
            var node = queue.shift();
            if (!node) continue;
            if (node.nodeType === 1) {
              for (var i = 0; i < selectors.length; i++) {
                if (node.matches && node.matches(selectors[i])) return node;
              }
              if (node.shadowRoot) queue.push(node.shadowRoot);
              var children = node.children;
              for (var j = 0; j < children.length; j++) queue.push(children[j]);
            } else if (node instanceof ShadowRoot) {
              var srChildren = node.children;
              for (var k = 0; k < srChildren.length; k++) queue.push(srChildren[k]);
            }
          }
          return null;
        }
        function focusAndClick(el) {
          try {
            el.focus();
            el.click();
          } catch (e) {}
        }
        function clearEditable(el) {
          try {
            if (el.isContentEditable) el.textContent = '';
          } catch (e) {}
        }
        function setSelectionToEnd(el) {
          try {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e) {}
        }
        function dispatchInput(el, text) {
          try {
            var evt = new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' });
            el.dispatchEvent(evt);
          } catch (e) {}
        }
        function dispatchKeyEvents(el) {
          try {
            el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
          } catch (e) {}
        }
        function insertHtmlParagraph(el, text) {
          try {
            el.innerHTML = '';
            var p = document.createElement('p');
            p.textContent = text;
            el.appendChild(p);
            setSelectionToEnd(el);
            dispatchInput(el, text);
            el.dispatchEvent(new Event('change', { bubbles: true }));
            dispatchKeyEvents(el);
            return true;
          } catch (e) {
            return false;
          }
        }
        function tryPasteWithEvents(el, text) {
          focusAndClick(el);
          var before = readEditableValue(el);
          var dispatched = dispatchPaste(el, text);
          var after = readEditableValue(el);
          if (after !== before) return true;
          if (el && el.isContentEditable && dispatched === false) return true;
          if (dispatched) return true;
          try {
            if (document.execCommand('paste')) return true;
          } catch (e) {}
          try {
            if (document.execCommand('insertText', false, text)) return true;
          } catch (e) {}
          return false;
        }
        function isGemini() {
          return /(^|\.)gemini\.google\.com$/i.test(location.hostname || '');
        }
        async function tryGemini(text) {
          var selectors = [
            'rich-textarea .ql-editor[contenteditable="true"]',
            'rich-textarea .ql-editor',
            'div[contenteditable="true"][role="textbox"]',
            'div[contenteditable="true"]',
            '.ql-editor',
            '.input-area [contenteditable="true"]'
          ];
          var el = await waitForElement(selectors, 12000);
          if (!el) {
            el = deepQuerySelector(selectors);
          }
          if (!el) return false;
          await sleep(1200);
          focusAndClick(el);
          setSelectionToEnd(el);
          clearEditable(el);
          if (tryPasteWithEvents(el, text)) return true;
          try {
            if (document.execCommand('insertText', false, text)) return true;
          } catch (e) {}
          try {
            el.textContent = text;
            dispatchInput(el, text);
            dispatchKeyEvents(el);
            return true;
          } catch (e) {}
          if (insertHtmlParagraph(el, text)) return true;
          await sleep(50);
          return pasteInto(el);
        }
        var el = document.activeElement;
        if (el && isEditable(el)) {
          if (tryPasteWithEvents(el, t)) return true;
          if (pasteInto(el)) return true;
        }
        if (isGemini()) {
          if (await tryGemini(t)) return true;
        }
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
        var found = await waitForElement(selectors, 8000);
        if (found) {
          if (tryPasteWithEvents(found, t)) return true;
          if (pasteInto(found)) return true;
        }
        var textareas = document.querySelectorAll('textarea');
        for (var j = 0; j < textareas.length; j++)
          if (isVisible(textareas[j]) && (tryPasteWithEvents(textareas[j], t) || pasteInto(textareas[j]))) return true;
        var inputs = document.querySelectorAll('input');
        for (var m = 0; m < inputs.length; m++) {
          var input = inputs[m];
          if (!isTextLikeInput(input)) continue;
          if (isVisible(input))
            if (tryPasteWithEvents(input, t) || pasteInto(input)) return true;
        }
        var editables = document.querySelectorAll('[contenteditable="true"]');
        for (var k = 0; k < editables.length; k++)
          if (isVisible(editables[k]) && (tryPasteWithEvents(editables[k], t) || pasteInto(editables[k]))) return true;
        return false;
      },
      args: [text]
    });
    return result && result[0] && result[0].result === true;
  } catch (e) {
    return false;
  }
}

function applySelectionTemplate(template, selectedText) {
  const base = (template || '').toString();
  return base.replace(/{{\s*text\s*}}/gi, selectedText || '');
}

function buildTargetUrl(baseUrl, queryParam, text) {
  if (!baseUrl) return null;
  const trimmed = String(baseUrl).trim();
  const paramRaw = (queryParam || '').toString().trim();
  if (!paramRaw) return trimmed;
  try {
    const url = new URL(trimmed);
    const key = paramRaw.includes('=') ? paramRaw.split('=')[0] : paramRaw;
    if (key) {
      url.searchParams.set(key, text);
      return url.toString();
    }
  } catch (e) {
    // fallback to string concat
  }
  const joiner = trimmed.includes('?') ? (trimmed.endsWith('?') || trimmed.endsWith('&') ? '' : '&') : '?';
  const prefix = paramRaw.endsWith('=') ? paramRaw : (paramRaw + '=');
  return trimmed + joiner + prefix + encodeURIComponent(text);
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs || 12000);
    const listener = (id, info) => {
      if (id !== tabId) return;
      if (info.status === 'complete') {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function handleAiOnSelectionClick(promptId, targetId, selectionText) {
  const { aiTargets, selectionPrompts } = await getAiSelectionConfig();
  const prompt = selectionPrompts.find(p => p.id === promptId);
  const target = aiTargets.find(t => t.id === targetId);
  if (!prompt || !target) return;

  const composed = applySelectionTemplate(prompt.template || '', selectionText || '');
  const usePasteFallback = !!target.usePasteFallback;
  const baseUrl = target.baseUrl || '';

  if (usePasteFallback) {
    await copyToClipboard(composed);
    const tab = await chrome.tabs.create({ url: baseUrl, active: true });
    if (!tab || !tab.id) return;
    await waitForTabComplete(tab.id, 15000);
    const isGemini = /(^|\.)gemini\.google\.com$/i.test((new URL(baseUrl)).hostname || '');
    if (isGemini) {
      const injected = await sendMessageWithRetry(tab.id, { action: 'injectGemini', text: composed }, 8, 600);
      showToast(injected ? 'Pasted!' : 'Copied! Paste with Ctrl+V');
      return;
    }
    const pasted = await tryPasteInTab(tab.id, composed);
    showToast(pasted ? 'Pasted!' : 'Copied! Paste with Ctrl+V');
    return;
  }

  const url = buildTargetUrl(baseUrl, target.queryParam || 'q=', composed);
  if (!url) return;
  await chrome.tabs.create({ url, active: true });
}

function sendMessageWithRetry(tabId, message, attempts, delayMs) {
  return new Promise((resolve) => {
    let count = 0;
    const trySend = () => {
      count += 1;
      chrome.tabs.sendMessage(tabId, message, (resp) => {
        if (chrome.runtime.lastError) {
          if (count < attempts) return setTimeout(trySend, delayMs || 400);
          return resolve(false);
        }
        resolve(resp && resp.success === true);
      });
    };
    trySend();
  });
}

async function tryFocusGemini(tabId) {
  if (!tabId || !chrome.scripting) return false;
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        function isVisible(el) {
          if (!el) return false;
          var rect = el.getBoundingClientRect();
          return (el.offsetParent !== null || rect.height > 0 || rect.width > 0);
        }
        async function waitForElement(selectors, timeoutMs) {
          return new Promise((resolve) => {
            var done = false;
            var timeout = setTimeout(() => {
              if (done) return;
              done = true;
              observer.disconnect();
              resolve(null);
            }, timeoutMs || 7000);
            function check() {
              for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el && isVisible(el)) return el;
              }
              return null;
            }
            var found = check();
            if (found) {
              done = true;
              clearTimeout(timeout);
              resolve(found);
              return;
            }
            var observer = new MutationObserver(() => {
              var next = check();
              if (next && !done) {
                done = true;
                clearTimeout(timeout);
                observer.disconnect();
                resolve(next);
              }
            });
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
          });
        }
        var selectors = [
          'div[contenteditable="true"][role="textbox"]',
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"]'
        ];
        var el = await waitForElement(selectors, 12000);
        if (!el) return false;
        try { el.focus(); el.click(); } catch (e) {}
        return true;
      }
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
  if (area === 'local' && (changes.folders || changes.quickAccessData || changes.aiTargets || changes.selectionPrompts || changes.aiOnSelectionEnabled))
    debouncedRebuild();
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
  if (id === 'ai_open_panel' || id === 'ai_open_panel_empty_prompts' || id === 'ai_open_panel_empty_targets') {
    if (tab && tab.id) chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  if (id.startsWith('ai_target__')) {
    const parts = id.split('__');
    const promptId = parts[1];
    const targetId = parts[2];
    if (promptId && targetId) {
      await handleAiOnSelectionClick(promptId, targetId, info.selectionText || '');
    }
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
