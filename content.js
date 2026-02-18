/* SimplestPrompt - content script for Gemini injection */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'injectGemini') return;
  injectGeminiText(msg.text || '').then((ok) => {
    sendResponse({ success: !!ok });
  });
  return true;
});

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function dispatchEvents(el, text) {
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
  } catch (e) {}
  try {
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  } catch (e) {}
  try {
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
  } catch (e) {}
}

function setSelectionToEnd(el) {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {}
}

function findGeminiEditor() {
  const selectors = [
    'rich-textarea .ql-editor[contenteditable="true"]',
    'rich-textarea .ql-editor',
    '.ql-editor[contenteditable="true"]',
    '.ql-editor',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]'
  ];
  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel);
    for (const node of nodes) {
      if (node && isVisible(node)) return node;
    }
  }
  return null;
}

async function waitForEditor(timeoutMs) {
  const start = Date.now();
  let editor = findGeminiEditor();
  if (editor) return editor;
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      editor = findGeminiEditor();
      if (editor) {
        observer.disconnect();
        resolve(editor);
      } else if (Date.now() - start > timeoutMs) {
        observer.disconnect();
        resolve(null);
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(findGeminiEditor());
    }, timeoutMs);
  });
}

async function injectGeminiText(text) {
  const editor = await waitForEditor(15000);
  if (!editor) return false;

  try {
    editor.focus();
    editor.click();
  } catch (e) {}

  // Quill editor expects content within <p>
  try {
    editor.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = text;
    editor.appendChild(p);
    setSelectionToEnd(editor);
    dispatchEvents(editor, text);
    return true;
  } catch (e) {}

  try {
    editor.textContent = text;
    setSelectionToEnd(editor);
    dispatchEvents(editor, text);
    return true;
  } catch (e) {}

  try {
    if (document.execCommand('insertText', false, text)) return true;
  } catch (e) {}

  return false;
}
