/* Right-Click Prompt (Local) - side panel. No auth, no cloud. */

let folders = [];
let selectedFolderId = null;

async function loadFolders() {
  const { folders: f } = await chrome.storage.local.get({ folders: [] });
  folders = Array.isArray(f) ? f : [];
  render();
}

async function saveFolders() {
  await chrome.storage.local.set({ folders });
  chrome.runtime.sendMessage({ action: 'rebuildMenu' }).catch(() => {});
}

function render() {
  const listEl = document.getElementById('foldersList');
  listEl.innerHTML = '';
  folders.forEach(f => {
    const div = document.createElement('div');
    div.className = 'folder-item' + (f.id === selectedFolderId ? ' active' : '');
    div.dataset.id = f.id;
    div.innerHTML = `
      <div class="meta">
        <span class="name">${escapeHtml(f.name || 'Unnamed')}</span>
        <span class="count">${(f.prompts || []).length} prompts</span>
      </div>
      <button type="button" class="icon-btn" data-edit-folder="${f.id}" title="Rename folder" aria-label="Rename folder">✎</button>
    `;
    div.addEventListener('click', () => selectFolder(f.id));
    div.querySelector('[data-edit-folder]').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditFolderModal(f.id);
    });
    listEl.appendChild(div);
  });
  renderPrompts();
}

function selectFolder(id) {
  selectedFolderId = id;
  render();
}

function getSelectedFolder() {
  return folders.find(f => f.id === selectedFolderId);
}

function renderPrompts() {
  const emptyEl = document.getElementById('emptyState');
  const listEl = document.getElementById('promptsList');
  const folder = getSelectedFolder();

  if (!folder) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    emptyEl.textContent = folders.length === 0 ? 'Add a folder to get started.' : 'Select a folder or add one.';
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.classList.remove('hidden');
  const prompts = folder.prompts || [];
  listEl.innerHTML = '';

  if (prompts.length === 0) {
    listEl.innerHTML = '<div class="empty">No prompts. Click "+ Prompt" to add one.</div>';
    return;
  }

  prompts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="title">${escapeHtml(p.title || 'Untitled')}</div>
      <div class="text">${escapeHtml((p.text || '').slice(0, 120))}${(p.text || '').length > 120 ? '…' : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="copy" data-id="${p.id}">Copy</button>
        <div class="actions-right">
          <button type="button" class="icon-btn" data-action="edit" data-id="${p.id}" title="Edit prompt" aria-label="Edit prompt">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Delete prompt" aria-label="Delete prompt">🗑</button>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

async function copyPrompt(promptId) {
  const folder = getSelectedFolder();
  const p = (folder && folder.prompts || []).find(x => x.id === promptId);
  if (!p) return;
  try {
    await navigator.clipboard.writeText(p.text);
    const btn = document.querySelector(`button[data-action="copy"][data-id="${promptId}"]`);
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); }
  } catch (e) {
    console.error(e);
  }
}

function deletePrompt(promptId) {
  const folderIndex = folders.findIndex(f => f.id === selectedFolderId);
  if (folderIndex < 0) return;
  const current = folders[folderIndex];
  current.prompts = (current.prompts || []).filter(p => p.id !== promptId);
  saveFolders().then(loadFolders);
}

function handlePromptActionClick(e) {
  const btn = e.target.closest('button[data-action][data-id]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const action = btn.dataset.action;
  const promptId = btn.dataset.id;
  if (!promptId) return;
  if (action === 'copy') copyPrompt(promptId);
  if (action === 'edit') editPrompt(promptId);
  if (action === 'delete') deletePrompt(promptId);
}

function editPrompt(promptId) {
  const folder = getSelectedFolder();
  const p = (folder && folder.prompts || []).find(x => x.id === promptId);
  if (!p) return;
  document.getElementById('modalPromptTitle').textContent = 'Edit prompt';
  document.getElementById('promptTitle').value = p.title || '';
  document.getElementById('promptText').value = p.text || '';
  document.getElementById('modalPrompt').classList.remove('hidden');
  document.getElementById('savePrompt').dataset.editId = promptId;
}

function openAddFolderModal() {
  document.getElementById('modalFolderTitle').textContent = 'New folder';
  document.getElementById('folderName').value = '';
  document.getElementById('saveFolder').dataset.editFolderId = '';
  document.getElementById('modalFolder').classList.remove('hidden');
}

function openEditFolderModal(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  document.getElementById('modalFolderTitle').textContent = 'Edit folder';
  document.getElementById('folderName').value = folder.name || '';
  document.getElementById('saveFolder').dataset.editFolderId = folder.id;
  document.getElementById('modalFolder').classList.remove('hidden');
}

function openAddPromptModal() {
  if (!getSelectedFolder()) {
    alert('Select a folder first.');
    return;
  }
  document.getElementById('modalPromptTitle').textContent = 'New prompt';
  document.getElementById('promptTitle').value = '';
  document.getElementById('promptText').value = '';
  document.getElementById('savePrompt').dataset.editId = '';
  document.getElementById('modalPrompt').classList.remove('hidden');
}

function saveFolderFromModal() {
  const name = document.getElementById('folderName').value.trim();
  const editFolderId = document.getElementById('saveFolder').dataset.editFolderId;
  if (!name) return;
  if (editFolderId) {
    const folder = folders.find(f => f.id === editFolderId);
    if (!folder) return;
    folder.name = name;
  } else {
    folders.push({
      id: uuid(),
      name,
      prompts: []
    });
  }
  saveFolders().then(() => {
    document.getElementById('saveFolder').dataset.editFolderId = '';
    document.getElementById('modalFolder').classList.add('hidden');
    loadFolders();
  });
}

function savePromptFromModal() {
  const folder = getSelectedFolder();
  if (!folder) return;
  const title = document.getElementById('promptTitle').value.trim() || 'Untitled';
  const text = document.getElementById('promptText').value.trim();
  const editId = document.getElementById('savePrompt').dataset.editId;

  if (editId) {
    const p = folder.prompts.find(x => x.id === editId);
    if (p) {
      p.title = title;
      p.text = text;
    }
  } else {
    folder.prompts = folder.prompts || [];
    folder.prompts.push({
      id: uuid(),
      title,
      text,
      timestamp: new Date().toISOString()
    });
  }
  document.getElementById('modalPrompt').classList.add('hidden');
  saveFolders().then(loadFolders);
}

function exportToJson() {
  const data = JSON.stringify(folders, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rcp-prompts-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const raw = e.target.result;
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        alert('Invalid format: expected a JSON array of folders.');
        return;
      }
      const next = data.map(f => ({
        id: f.id || uuid(),
        name: f.name || 'Imported',
        prompts: Array.isArray(f.prompts) ? f.prompts.map(p => ({
          id: p.id || uuid(),
          title: p.title || 'Untitled',
          text: p.text || '',
          timestamp: p.timestamp || new Date().toISOString()
        })) : []
      }));
      folders = next;
      await saveFolders();
      loadFolders();
      document.getElementById('importFile').value = '';
      alert('Import done. ' + next.length + ' folder(s) loaded.');
    } catch (err) {
      alert('Invalid JSON or format: ' + (err.message || err));
    }
  };
  reader.readAsText(file);
}

async function loadAutoPasteState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getAutoPaste' }, (r) => {
      resolve(r && r.autoPaste);
    });
  });
}

function renderVersion() {
  const versionEl = document.getElementById('appVersion');
  if (!versionEl) return;
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version_name || manifest.version || 'unknown';
  versionEl.textContent = '(' + version + ')';
}

document.getElementById('addFolder').addEventListener('click', openAddFolderModal);
document.getElementById('addPrompt').addEventListener('click', openAddPromptModal);
document.getElementById('cancelFolder').addEventListener('click', () => document.getElementById('modalFolder').classList.add('hidden'));
document.getElementById('saveFolder').addEventListener('click', saveFolderFromModal);
document.getElementById('cancelPrompt').addEventListener('click', () => document.getElementById('modalPrompt').classList.add('hidden'));
document.getElementById('savePrompt').addEventListener('click', savePromptFromModal);

document.getElementById('exportBtn').addEventListener('click', exportToJson);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('promptsList').addEventListener('click', handlePromptActionClick);
document.getElementById('importFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importFromJson(f);
});

document.getElementById('autoPaste').addEventListener('change', (e) => {
  const on = e.target.checked;
  chrome.runtime.sendMessage({ action: on ? 'enableAutoPaste' : 'disableAutoPaste' }, () => {});
});

(async () => {
  renderVersion();
  const autoPaste = await loadAutoPasteState();
  document.getElementById('autoPaste').checked = !!autoPaste;
  loadFolders();
})();
