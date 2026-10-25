/* SimplestPrompt side panel. Local data plus optional Gist sync. */

const tr = I18n.t;

let folders = [];
let selectedFolderId = null;
let dragState = null;
let promptSearchQuery = '';
let aiTargets = [];
let selectionPrompts = [];
let aiOnSelectionEnabled = true;
let syncState = { hasToken: false, passphrase: '', gistId: '', revision: '', localHash: '', lastSyncAt: '' };
let pendingSyncConflict = null;
let lastSyncStatus = null;
let syncConflictError = null;
let syncGistDraftDirty = false;
const SYNC_DATA_KEYS = ['folders', 'autoPaste', 'aiOnSelectionEnabled', 'aiTargets', 'selectionPrompts'];
const SYNC_DEBOUNCE_MS = 3000;
const SYNC_POLL_MS = 5 * 60 * 1000;
let syncRunning = false;
let autoSyncPaused = false;
let syncTimer = null;

function setTranslatedText(id, key) {
  const el = document.getElementById(id);
  el.dataset.i18n = key;
  el.textContent = tr(key);
}

function applyInterfaceLanguage() {
  I18n.apply();
  document.getElementById('languageSelect').value = I18n.language;
  updateSecretPlaceholders();
  render();
  renderAiTab();
  if (lastSyncStatus) renderSyncMessage();
  if (syncConflictError) document.getElementById('syncConflictMessage').textContent = I18n.errorMessage(syncConflictError);
}

async function loadFolders() {
  const { folders: f } = await chrome.storage.local.get({ folders: [] });
  folders = Array.isArray(f) ? f : [];
  render();
}

async function loadAiConfig() {
  const { aiOnSelectionEnabled: enabled, aiTargets: targets, selectionPrompts: prompts } = await chrome.storage.local.get({
    aiOnSelectionEnabled: true,
    aiTargets: [],
    selectionPrompts: []
  });
  aiOnSelectionEnabled = enabled !== false;
  aiTargets = Array.isArray(targets) ? targets : [];
  selectionPrompts = Array.isArray(prompts) ? prompts : [];
  renderAiTab();
}

async function saveFolders() {
  await chrome.storage.local.set({ folders });
  chrome.runtime.sendMessage({ action: 'rebuildMenu' }).catch(() => {});
}

async function saveAiConfig() {
  await chrome.storage.local.set({
    aiOnSelectionEnabled,
    aiTargets,
    selectionPrompts
  });
  chrome.runtime.sendMessage({ action: 'rebuildMenu' }).catch(() => {});
}

function render() {
  const listEl = document.getElementById('foldersList');
  listEl.innerHTML = '';
  folders.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'folder-item' + (f.id === selectedFolderId ? ' active' : '');
    div.dataset.id = f.id;
    div.draggable = true;
    div.innerHTML = `
      <div class="meta">
        <span class="name">${escapeHtml(f.name || tr('Unnamed'))}</span>
        <span class="count">${escapeHtml(tr('Prompts: {count}', { count: (f.prompts || []).length }))}</span>
      </div>
    `;
    div.addEventListener('click', () => selectFolder(f.id));
    div.addEventListener('dblclick', () => openEditFolderModal(f.id));
    div.addEventListener('dragstart', (e) => onFolderDragStart(e, f.id));
    div.addEventListener('dragover', onItemDragOver);
    div.addEventListener('dragleave', onItemDragLeave);
    div.addEventListener('drop', (e) => onFolderDrop(e, f.id));
    div.addEventListener('dragend', onItemDragEnd);
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

function normalizeSearch(s) {
  return String(s || '').trim().toLowerCase();
}

function getSearchTokens() {
  return normalizeSearch(promptSearchQuery).split(/\s+/).filter(Boolean);
}

function promptMatchesSearch(prompt, folder, tokens) {
  if (tokens.length === 0) return true;
  const haystack = normalizeSearch([
    prompt.title || '',
    prompt.text || '',
    folder && folder.name || ''
  ].join(' '));
  return tokens.every(token => haystack.includes(token));
}

function getPromptLocation(promptId, folderId) {
  const folderList = folderId ? folders.filter(f => f.id === folderId) : folders;
  for (const folder of folderList) {
    const prompts = Array.isArray(folder.prompts) ? folder.prompts : [];
    const index = prompts.findIndex(p => p.id === promptId);
    if (index >= 0) return { folder, prompt: prompts[index], index };
  }
  return null;
}

function getPromptSearchResults(tokens) {
  const results = [];
  folders.forEach((folder) => {
    (folder.prompts || []).forEach((prompt) => {
      if (promptMatchesSearch(prompt, folder, tokens)) {
        results.push({ folder, prompt });
      }
    });
  });
  return results;
}

function createPromptCard(prompt, folder, showFolderName) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;
  card.dataset.folderId = folder.id;
  card.draggable = true;
  card.innerHTML = `
    <div class="title">${escapeHtml(prompt.title || tr('Untitled'))}</div>
    ${showFolderName ? `<div class="folder-name">${escapeHtml(folder.name || tr('Unnamed'))}</div>` : ''}
    <div class="text">${escapeHtml((prompt.text || '').slice(0, 120))}${(prompt.text || '').length > 120 ? '…' : ''}</div>
    <div class="actions">
      <button type="button" class="btn" data-action="copy" data-id="${prompt.id}">${tr('Copy')}</button>
    </div>
  `;
  card.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    editPrompt(prompt.id);
  });
  card.addEventListener('dragstart', (e) => onPromptDragStart(e, prompt.id, folder.id));
  card.addEventListener('dragover', onItemDragOver);
  card.addEventListener('dragleave', onItemDragLeave);
  card.addEventListener('drop', (e) => onPromptDrop(e, prompt.id, folder.id));
  card.addEventListener('dragend', onItemDragEnd);
  return card;
}

function renderPrompts() {
  const emptyEl = document.getElementById('emptyState');
  const listEl = document.getElementById('promptsList');
  const folder = getSelectedFolder();
  const searchTokens = getSearchTokens();
  const isSearching = searchTokens.length > 0;

  if (isSearching) {
    const results = getPromptSearchResults(searchTokens);
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = '';

    if (results.length === 0) {
      listEl.innerHTML = `<div class="empty">${escapeHtml(tr('No prompts found.'))}</div>`;
      return;
    }

    results.forEach(({ folder: resultFolder, prompt }) => {
      listEl.appendChild(createPromptCard(prompt, resultFolder, true));
    });
    return;
  }

  if (!folder) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    emptyEl.textContent = tr(folders.length === 0 ? 'Add a folder to get started.' : 'Select a folder or add one.');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.classList.remove('hidden');
  const prompts = folder.prompts || [];
  listEl.innerHTML = '';

  if (prompts.length === 0) {
    listEl.innerHTML = `<div class="empty">${escapeHtml(tr('No prompts. Click "+ Prompt" to add one.'))}</div>`;
    return;
  }

  prompts.forEach((p) => {
    listEl.appendChild(createPromptCard(p, folder, false));
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
  const location = getPromptLocation(promptId);
  if (!location) return;
  try {
    await navigator.clipboard.writeText(location.prompt.text || '');
    const btn = document.querySelector(`button[data-action="copy"][data-id="${promptId}"]`);
    if (btn) { btn.textContent = tr('Copied!'); setTimeout(() => { btn.textContent = tr('Copy'); }, 1500); }
  } catch (e) {
    console.error(e);
  }
}

function moveArrayItem(list, fromIndex, toIndex) {
  if (!Array.isArray(list)) return false;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return false;
  if (fromIndex === toIndex) return false;
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  return true;
}

function clearDragIndicators(selector) {
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
  });
}

function onFolderDragStart(e, folderId) {
  dragState = { type: 'folder', id: folderId };
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function onPromptDragStart(e, promptId, folderId) {
  dragState = { type: 'prompt', id: promptId, sourceFolderId: folderId };
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function onItemDragOver(e) {
  if (!dragState) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const insertAfter = e.clientY > rect.top + rect.height / 2;
  el.classList.toggle('drag-over-top', !insertAfter);
  el.classList.toggle('drag-over-bottom', insertAfter);
}

function onItemDragLeave(e) {
  e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
}

function onItemDragEnd() {
  dragState = null;
  clearDragIndicators('.folder-item');
  clearDragIndicators('.prompt-card');
  clearDragIndicators('.selection-prompt-card');
}

function getDestinationIndex(currentTarget, sourceIndex, targetIndex, pointerY) {
  const rect = currentTarget.getBoundingClientRect();
  const insertAfter = pointerY > rect.top + rect.height / 2;
  let destinationIndex = targetIndex + (insertAfter ? 1 : 0);
  if (sourceIndex < destinationIndex) destinationIndex -= 1;
  return destinationIndex;
}

function onFolderDrop(e, targetFolderId) {
  e.preventDefault();
  onItemDragLeave(e);
  if (!dragState) return;

  if (dragState.type === 'prompt') {
    movePromptToFolder(dragState.id, dragState.sourceFolderId, targetFolderId);
    return;
  }

  if (dragState.type !== 'folder') return;
  const sourceIndex = folders.findIndex(f => f.id === dragState.id);
  const targetIndex = folders.findIndex(f => f.id === targetFolderId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const destinationIndex = getDestinationIndex(e.currentTarget, sourceIndex, targetIndex, e.clientY);
  if (!moveArrayItem(folders, sourceIndex, destinationIndex)) return;
  saveFolders().then(loadFolders);
}

function movePromptToFolder(promptId, sourceFolderId, targetFolderId) {
  if (sourceFolderId === targetFolderId) return;
  const sourceLocation = getPromptLocation(promptId, sourceFolderId);
  const targetFolder = folders.find(f => f.id === targetFolderId);
  if (!sourceLocation || !targetFolder) return;
  const [moved] = sourceLocation.folder.prompts.splice(sourceLocation.index, 1);
  targetFolder.prompts = targetFolder.prompts || [];
  targetFolder.prompts.push(moved);
  selectedFolderId = targetFolderId;
  saveFolders().then(loadFolders);
}

function onPromptDrop(e, targetPromptId, targetFolderId) {
  e.preventDefault();
  onItemDragLeave(e);
  if (!dragState || dragState.type !== 'prompt') return;
  if (dragState.sourceFolderId !== targetFolderId) return;
  const folder = folders.find(f => f.id === targetFolderId);
  if (!folder || !Array.isArray(folder.prompts)) return;
  const sourceIndex = folder.prompts.findIndex(p => p.id === dragState.id);
  const targetIndex = folder.prompts.findIndex(p => p.id === targetPromptId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const destinationIndex = getDestinationIndex(e.currentTarget, sourceIndex, targetIndex, e.clientY);
  if (!moveArrayItem(folder.prompts, sourceIndex, destinationIndex)) return;
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
}

function renderAiTab() {
  const enabledEl = document.getElementById('aiSelectionEnabled');
  if (enabledEl) enabledEl.checked = !!aiOnSelectionEnabled;
  renderAiTargets();
  renderSelectionPrompts();
}

function renderAiTargets() {
  const listEl = document.getElementById('aiTargetsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (aiTargets.length === 0) {
    listEl.innerHTML = `<div class="empty">${escapeHtml(tr('No AI targets. Click "+ Target" to add one.'))}</div>`;
    return;
  }
  aiTargets.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'list-item';
    card.dataset.id = t.id;
    const queryLabel = (t.queryParam === '' || t.queryParam == null) ? '—' : (t.queryParam || 'q=');
    card.innerHTML = `
      <div class="title">${escapeHtml(t.name || tr('AI'))}</div>
      <div class="meta">${escapeHtml(t.baseUrl || '')}</div>
      <div class="meta">${tr('Query:')} ${escapeHtml(queryLabel)}${t.usePasteFallback ? tr(' · paste fallback') : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="edit-target" data-id="${t.id}">${tr('Edit')}</button>
      </div>
    `;
    card.addEventListener('dblclick', () => openEditAiTargetModal(t.id));
    listEl.appendChild(card);
  });
}

function renderSelectionPrompts() {
  const listEl = document.getElementById('selectionPromptsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (selectionPrompts.length === 0) {
    listEl.innerHTML = `<div class="empty">${escapeHtml(tr('No selection prompts. Click "+ Prompt" to add one.'))}</div>`;
    return;
  }
  selectionPrompts.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'list-item selection-prompt-card';
    card.dataset.id = p.id;
    card.draggable = true;
    const preview = (p.template || '').slice(0, 120);
    card.innerHTML = `
      <div class="title">${escapeHtml(p.name || tr('Untitled'))}</div>
      <div class="meta">${escapeHtml(preview)}${(p.template || '').length > 120 ? '…' : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="edit-selection" data-id="${p.id}">${tr('Edit')}</button>
      </div>
    `;
    card.addEventListener('dblclick', () => openEditSelectionPromptModal(p.id));
    card.addEventListener('dragstart', (e) => onSelectionPromptDragStart(e, p.id));
    card.addEventListener('dragover', onItemDragOver);
    card.addEventListener('dragleave', onItemDragLeave);
    card.addEventListener('drop', (e) => onSelectionPromptDrop(e, p.id));
    card.addEventListener('dragend', onItemDragEnd);
    listEl.appendChild(card);
  });
}

function editPrompt(promptId) {
  const location = getPromptLocation(promptId);
  if (!location) return;
  setTranslatedText('modalPromptTitle', 'Edit prompt');
  document.getElementById('promptTitle').value = location.prompt.title || '';
  document.getElementById('promptText').value = location.prompt.text || '';
  document.getElementById('savePrompt').dataset.editId = promptId;
  document.getElementById('savePrompt').dataset.editFolderId = location.folder.id;
  document.getElementById('deletePrompt').classList.remove('hidden');
  document.getElementById('modalPrompt').classList.remove('hidden');
}

function openAddAiTargetModal() {
  setTranslatedText('modalAiTargetTitle', 'New AI target');
  document.getElementById('aiTargetName').value = '';
  document.getElementById('aiTargetBaseUrl').value = '';
  document.getElementById('aiTargetQueryParam').value = 'q=';
  document.getElementById('aiTargetUsePaste').checked = false;
  document.getElementById('saveAiTarget').dataset.editId = '';
  document.getElementById('deleteAiTarget').classList.add('hidden');
  document.getElementById('modalAiTarget').classList.remove('hidden');
}

function openEditAiTargetModal(targetId) {
  const target = aiTargets.find(t => t.id === targetId);
  if (!target) return;
  setTranslatedText('modalAiTargetTitle', 'Edit AI target');
  document.getElementById('aiTargetName').value = target.name || '';
  document.getElementById('aiTargetBaseUrl').value = target.baseUrl || '';
  document.getElementById('aiTargetQueryParam').value = target.queryParam != null ? target.queryParam : 'q=';
  document.getElementById('aiTargetUsePaste').checked = !!target.usePasteFallback;
  document.getElementById('saveAiTarget').dataset.editId = target.id;
  document.getElementById('deleteAiTarget').classList.remove('hidden');
  document.getElementById('modalAiTarget').classList.remove('hidden');
}

function openAddSelectionPromptModal() {
  setTranslatedText('modalSelectionPromptTitle', 'New selection prompt');
  document.getElementById('selectionPromptName').value = '';
  document.getElementById('selectionPromptTemplate').value = '';
  document.getElementById('saveSelectionPrompt').dataset.editId = '';
  document.getElementById('deleteSelectionPrompt').classList.add('hidden');
  document.getElementById('modalSelectionPrompt').classList.remove('hidden');
}

function openEditSelectionPromptModal(promptId) {
  const prompt = selectionPrompts.find(p => p.id === promptId);
  if (!prompt) return;
  setTranslatedText('modalSelectionPromptTitle', 'Edit selection prompt');
  document.getElementById('selectionPromptName').value = prompt.name || '';
  document.getElementById('selectionPromptTemplate').value = prompt.template || '';
  document.getElementById('saveSelectionPrompt').dataset.editId = prompt.id;
  document.getElementById('deleteSelectionPrompt').classList.remove('hidden');
  document.getElementById('modalSelectionPrompt').classList.remove('hidden');
}

function openAddFolderModal() {
  setTranslatedText('modalFolderTitle', 'New folder');
  document.getElementById('folderName').value = '';
  document.getElementById('saveFolder').dataset.editFolderId = '';
  document.getElementById('deleteFolder').classList.add('hidden');
  document.getElementById('modalFolder').classList.remove('hidden');
}

function openEditFolderModal(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  setTranslatedText('modalFolderTitle', 'Edit folder');
  document.getElementById('folderName').value = folder.name || '';
  document.getElementById('saveFolder').dataset.editFolderId = folder.id;
  document.getElementById('deleteFolder').classList.remove('hidden');
  document.getElementById('modalFolder').classList.remove('hidden');
}

function openAddPromptModal() {
  if (!getSelectedFolder()) {
    alert(tr('Select a folder first.'));
    return;
  }
  setTranslatedText('modalPromptTitle', 'New prompt');
  document.getElementById('promptTitle').value = '';
  document.getElementById('promptText').value = '';
  document.getElementById('savePrompt').dataset.editId = '';
  document.getElementById('savePrompt').dataset.editFolderId = '';
  document.getElementById('deletePrompt').classList.add('hidden');
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
    document.getElementById('deleteFolder').classList.add('hidden');
    document.getElementById('modalFolder').classList.add('hidden');
    loadFolders();
  });
}

function saveAiTargetFromModal() {
  const name = document.getElementById('aiTargetName').value.trim() || tr('AI Target');
  const baseUrl = document.getElementById('aiTargetBaseUrl').value.trim();
  const queryParam = document.getElementById('aiTargetQueryParam').value.trim();
  const usePasteFallback = document.getElementById('aiTargetUsePaste').checked;
  const editId = document.getElementById('saveAiTarget').dataset.editId;

  if (editId) {
    const target = aiTargets.find(t => t.id === editId);
    if (target) {
      target.name = name;
      target.baseUrl = baseUrl;
      target.queryParam = queryParam;
      target.usePasteFallback = usePasteFallback;
    }
  } else {
    aiTargets.push({
      id: uuid(),
      name,
      baseUrl,
      queryParam,
      usePasteFallback
    });
  }

  document.getElementById('saveAiTarget').dataset.editId = '';
  document.getElementById('deleteAiTarget').classList.add('hidden');
  document.getElementById('modalAiTarget').classList.add('hidden');
  saveAiConfig().then(loadAiConfig);
}

function savePromptFromModal() {
  const editId = document.getElementById('savePrompt').dataset.editId;
  const editFolderId = document.getElementById('savePrompt').dataset.editFolderId;
  const folder = editId && editFolderId ? folders.find(f => f.id === editFolderId) : getSelectedFolder();
  if (!folder) return;
  const title = document.getElementById('promptTitle').value.trim() || tr('Untitled');
  const text = document.getElementById('promptText').value.trim();

  if (editId) {
    const p = (folder.prompts || []).find(x => x.id === editId);
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
  document.getElementById('savePrompt').dataset.editId = '';
  document.getElementById('savePrompt').dataset.editFolderId = '';
  document.getElementById('deletePrompt').classList.add('hidden');
  document.getElementById('modalPrompt').classList.add('hidden');
  saveFolders().then(loadFolders);
}

function saveSelectionPromptFromModal() {
  const name = document.getElementById('selectionPromptName').value.trim() || tr('Selection prompt');
  const template = document.getElementById('selectionPromptTemplate').value.trim();
  const editId = document.getElementById('saveSelectionPrompt').dataset.editId;

  if (editId) {
    const prompt = selectionPrompts.find(p => p.id === editId);
    if (prompt) {
      prompt.name = name;
      prompt.template = template;
    }
  } else {
    selectionPrompts.push({
      id: uuid(),
      name,
      template,
      timestamp: new Date().toISOString()
    });
  }

  document.getElementById('saveSelectionPrompt').dataset.editId = '';
  document.getElementById('deleteSelectionPrompt').classList.add('hidden');
  document.getElementById('modalSelectionPrompt').classList.add('hidden');
  saveAiConfig().then(loadAiConfig);
}

function deleteFolderFromModal() {
  const editFolderId = document.getElementById('saveFolder').dataset.editFolderId;
  if (!editFolderId) return;
  folders = folders.filter(f => f.id !== editFolderId);
  if (selectedFolderId === editFolderId) selectedFolderId = null;
  document.getElementById('saveFolder').dataset.editFolderId = '';
  document.getElementById('deleteFolder').classList.add('hidden');
  document.getElementById('modalFolder').classList.add('hidden');
  saveFolders().then(loadFolders);
}

function deleteAiTargetFromModal() {
  const editId = document.getElementById('saveAiTarget').dataset.editId;
  if (!editId) return;
  aiTargets = aiTargets.filter(t => t.id !== editId);
  document.getElementById('saveAiTarget').dataset.editId = '';
  document.getElementById('deleteAiTarget').classList.add('hidden');
  document.getElementById('modalAiTarget').classList.add('hidden');
  saveAiConfig().then(loadAiConfig);
}

function deletePromptFromModal() {
  const promptId = document.getElementById('savePrompt').dataset.editId;
  const editFolderId = document.getElementById('savePrompt').dataset.editFolderId;
  if (!promptId) return;
  const folder = editFolderId ? folders.find(f => f.id === editFolderId) : getSelectedFolder();
  if (!folder) return;
  folder.prompts = (folder.prompts || []).filter(p => p.id !== promptId);
  document.getElementById('savePrompt').dataset.editId = '';
  document.getElementById('savePrompt').dataset.editFolderId = '';
  document.getElementById('deletePrompt').classList.add('hidden');
  document.getElementById('modalPrompt').classList.add('hidden');
  saveFolders().then(loadFolders);
}

function deleteSelectionPromptFromModal() {
  const editId = document.getElementById('saveSelectionPrompt').dataset.editId;
  if (!editId) return;
  selectionPrompts = selectionPrompts.filter(p => p.id !== editId);
  document.getElementById('saveSelectionPrompt').dataset.editId = '';
  document.getElementById('deleteSelectionPrompt').classList.add('hidden');
  document.getElementById('modalSelectionPrompt').classList.add('hidden');
  saveAiConfig().then(loadAiConfig);
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
        alert(tr('Invalid format: expected a JSON array of folders.'));
        return;
      }
      const next = data.map(f => ({
        id: f.id || uuid(),
        name: f.name || tr('Imported'),
        prompts: Array.isArray(f.prompts) ? f.prompts.map(p => ({
          id: p.id || uuid(),
          title: p.title || tr('Untitled'),
          text: p.text || '',
          timestamp: p.timestamp || new Date().toISOString()
        })) : []
      }));
      folders = next;
      await saveFolders();
      loadFolders();
      document.getElementById('importFile').value = '';
      alert(tr('Import done. {count} folder(s) loaded.', { count: next.length }));
    } catch (err) {
      alert(tr('Invalid JSON or format: {detail}', { detail: I18n.errorMessage(err) }));
    }
  };
  reader.readAsText(file);
}

function onSelectionPromptDragStart(e, promptId) {
  dragState = { type: 'selectionPrompt', id: promptId };
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function onSelectionPromptDrop(e, targetPromptId) {
  e.preventDefault();
  onItemDragLeave(e);
  if (!dragState || dragState.type !== 'selectionPrompt') return;
  const sourceIndex = selectionPrompts.findIndex(p => p.id === dragState.id);
  const targetIndex = selectionPrompts.findIndex(p => p.id === targetPromptId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const destinationIndex = getDestinationIndex(e.currentTarget, sourceIndex, targetIndex, e.clientY);
  if (!moveArrayItem(selectionPrompts, sourceIndex, destinationIndex)) return;
  saveAiConfig().then(loadAiConfig);
}

function handleAiListActionClick(e) {
  const btn = e.target.closest('button[data-action][data-id]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!id) return;
  if (action === 'edit-target') openEditAiTargetModal(id);
  if (action === 'edit-selection') openEditSelectionPromptModal(id);
}

function setActiveTab(tab) {
  const promptsTab = document.getElementById('tabPrompts');
  const aiTab = document.getElementById('tabAi');
  const settingsTab = document.getElementById('tabSettings');
  const btnPrompts = document.getElementById('tabPromptsBtn');
  const btnAi = document.getElementById('tabAiBtn');
  const btnSettings = document.getElementById('tabSettingsBtn');
  const showPrompts = tab === 'prompts';
  const showAi = tab === 'ai';
  promptsTab.classList.toggle('hidden', !showPrompts);
  aiTab.classList.toggle('hidden', !showAi);
  settingsTab.classList.toggle('hidden', tab !== 'settings');
  btnPrompts.classList.toggle('active', showPrompts);
  btnAi.classList.toggle('active', showAi);
  btnSettings.classList.toggle('active', tab === 'settings');
  btnSettings.setAttribute('aria-pressed', String(tab === 'settings'));
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response || response.success === false) {
        return reject(new Error(response && response.error || 'Operation failed.'));
      }
      resolve(response);
    });
  });
}

function updateSecretPlaceholders() {
  document.getElementById('syncToken').placeholder = syncState.hasToken ? '****************' : tr('Token with Gist permission');
  document.getElementById('syncPassphrase').placeholder = syncState.passphrase ? '****************' : tr('Used to encrypt your prompts');
}

function syncReady() {
  return syncState.hasToken && !!syncState.gistId && !!syncState.passphrase;
}

function requireSyncReady() {
  if (!syncReady()) throw new Error('Set up syncing first.');
}

async function loadSyncState() {
  try {
    const response = await sendRuntimeMessage({ action: 'syncGetState' });
    syncState = response.state || syncState;
    if (syncState.revision && !syncState.localHash) {
      const localHash = await hashSyncData(await getSyncData());
      syncState.localHash = localHash;
      await sendRuntimeMessage({ action: 'syncMarkRevision', revision: syncState.revision, localHash, lastSyncAt: syncState.lastSyncAt });
    }
    updateSecretPlaceholders();
    if (!syncGistDraftDirty) document.getElementById('syncGistId').value = syncState.gistId || '';
    renderSyncStatus();
  } catch (error) {
    handleSyncError(error);
  }
}

function setSyncStatus(title, meta) {
  lastSyncStatus = { title, meta };
  renderSyncMessage();
}

function renderSyncMessage() {
  const { title, meta } = lastSyncStatus;
  const statusEl = document.getElementById('syncStatus');
  document.getElementById('syncStatusTitle').textContent = tr(title);
  document.getElementById('syncStatusMeta').textContent = typeof meta === 'function' ? meta() : tr(meta || '');
  statusEl.dataset.state = title === 'Error' ? 'error' : (title === 'Ready' ? 'success' : 'idle');
}

function renderSyncStatus() {
  setTranslatedText('syncSaveConnection', syncReady() ? 'Update sync settings' : 'Enable syncing');
  document.getElementById('syncDisconnect').classList.toggle('hidden', !syncState.hasToken);
  if (!syncReady()) {
    setSyncStatus('Sync is not configured', 'Enter the Gist URL, token and password, then click Enable syncing.');
    return;
  }
  setSyncStatus('Ready', () => [
    tr('Gist: {id}', { id: syncState.gistId }),
    syncState.lastSyncAt ? tr('Last sync: {date}', { date: formatSyncDate(syncState.lastSyncAt) }) : tr('No successful sync yet.'),
    tr('Syncs automatically while this panel is open.')
  ].join('\n'));
}

function formatSyncDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(I18n.language === 'ru' ? 'ru-RU' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hourCycle: 'h23'
  }).format(date);
}

function normalizeGistId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'gist.github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
  } catch (error) {}
  return trimmed.replace(/^.*\//, '').split(/[?#]/)[0];
}

async function getSyncData() {
  return chrome.storage.local.get({
    folders: [],
    autoPaste: false,
    aiOnSelectionEnabled: true,
    aiTargets: [],
    selectionPrompts: []
  });
}

async function applySyncedData(data) {
  if (!data || !Array.isArray(data.folders) || !Array.isArray(data.aiTargets) || !Array.isArray(data.selectionPrompts)) {
    throw new Error('Remote data has an invalid format.');
  }
  await chrome.storage.local.set({
    folders: data.folders,
    autoPaste: !!data.autoPaste,
    aiOnSelectionEnabled: data.aiOnSelectionEnabled !== false,
    aiTargets: data.aiTargets,
    selectionPrompts: data.selectionPrompts
  });
  await loadFolders();
  await loadAiConfig();
  document.getElementById('autoPaste').checked = !!data.autoPaste;
}

async function pullRemote(remote) {
  if (remote.empty) throw new Error('The Gist has no SimplestPrompt data yet.');
  const data = await decryptSyncData(JSON.parse(remote.content), syncState.passphrase);
  await applySyncedData(data);
  const localHash = await hashSyncData(await getSyncData());
  await sendRuntimeMessage({ action: 'syncMarkRevision', revision: remote.revision, localHash, lastSyncAt: new Date().toISOString() });
  await loadSyncState();
}

function showSyncConflict(conflict) {
  syncConflictError = null;
  pendingSyncConflict = conflict;
  setTranslatedText('syncConflictTitle', conflict.initial ? 'Choose sync version' : 'Remote changes detected');
  setTranslatedText('syncConflictMessage', conflict.initial
    ? 'This browser already has local data. Choose whether to use the Gist or upload this local data.'
    : syncState.revision
    ? 'The Gist changed since the last sync. Choose which version to keep.'
    : 'This browser has no sync history for this Gist yet. Choose which version to use.');
  document.getElementById('syncConflictCancel').disabled = false;
  document.getElementById('syncConflictRemote').disabled = false;
  document.getElementById('syncConflictLocal').disabled = false;
  document.getElementById('syncConflictModal').classList.remove('hidden');
}

function closeSyncConflict() {
  syncConflictError = null;
  pendingSyncConflict = null;
  document.getElementById('syncConflictModal').classList.add('hidden');
}

function setSyncConflictBusy(busy, message) {
  syncConflictError = typeof message === 'string' ? null : message;
  if (typeof message === 'string') setTranslatedText('syncConflictMessage', message);
  else {
    const el = document.getElementById('syncConflictMessage');
    delete el.dataset.i18n;
    el.textContent = I18n.errorMessage(message);
  }
  document.getElementById('syncConflictCancel').disabled = busy;
  document.getElementById('syncConflictRemote').disabled = busy;
  document.getElementById('syncConflictLocal').disabled = busy;
}

async function pushLocal(force) {
  requireSyncReady();
  const localData = await getSyncData();
  const localHash = await hashSyncData(localData);
  const hasLocalData = localData.folders.length > 0 || localData.aiTargets.length > 0 || localData.selectionPrompts.length > 0;
  const { remote } = await sendRuntimeMessage({ action: 'syncFetch' });
  // A Gist without SimplestPrompt data has nothing to lose or merge: upload.
  if (remote.empty) force = true;
  if (!force && !syncState.revision) {
    if (!hasLocalData) {
      await pullRemote(remote);
      return;
    }
    showSyncConflict({ type: 'initial', initial: true, remote });
    return;
  }
  const remoteChanged = remote.revision !== syncState.revision;
  const localChanged = !syncState.localHash || localHash !== syncState.localHash;
  if (!force && remoteChanged && !localChanged) {
    await pullRemote(remote);
    return;
  }
  if (!force && remoteChanged && localChanged) {
    showSyncConflict({ type: 'push', remote });
    return;
  }
  if (!force && !remoteChanged && !localChanged) {
    await sendRuntimeMessage({ action: 'syncMarkRevision', revision: syncState.revision, localHash, lastSyncAt: new Date().toISOString() });
    await loadSyncState();
    return;
  }
  const content = JSON.stringify(await encryptSyncData(localData, syncState.passphrase));
  const response = await sendRuntimeMessage({
    action: 'syncUpdate',
    content,
    expectedRevision: syncState.revision || '',
    force: !!force
  });
  if (response.conflict) {
    showSyncConflict({ type: 'push', remote: response.remote });
    return;
  }
  await sendRuntimeMessage({ action: 'syncMarkRevision', revision: response.revision, localHash, lastSyncAt: new Date().toISOString() });
  await loadSyncState();
}

async function pullLocal() {
  requireSyncReady();
  const { remote } = await sendRuntimeMessage({ action: 'syncFetch' });
  await pullRemote(remote);
}

async function createGist() {
  const content = JSON.stringify(await encryptSyncData(await getSyncData(), syncState.passphrase));
  const response = await sendRuntimeMessage({ action: 'syncCreate', content });
  const localHash = await hashSyncData(await getSyncData());
  await sendRuntimeMessage({ action: 'syncMarkRevision', revision: response.revision, localHash, lastSyncAt: new Date().toISOString() });
  syncGistDraftDirty = false;
  await loadSyncState();
}

// One button: verify and save the connection, then sync (creating the Gist when the URL is empty).
async function enableSync() {
  const button = document.getElementById('syncSaveConnection');
  const tokenInput = document.getElementById('syncToken');
  const passphraseInput = document.getElementById('syncPassphrase');
  const gistInput = document.getElementById('syncGistId');
  const token = tokenInput.value.trim();
  const passphrase = passphraseInput.value;
  const submittedGist = gistInput.value;
  const gistId = normalizeGistId(submittedGist);
  if (gistId && !/^[0-9a-f]{20,40}$/i.test(gistId)) {
    handleSyncError(new Error('That is not a Gist link. A Gist link looks like https://gist.github.com/your-name/0123abc… Leave the field empty to create a Gist automatically.'));
    return;
  }
  button.disabled = true;
  autoSyncPaused = false;
  setSyncStatus('Connecting…', '');
  try {
    await sendRuntimeMessage({ action: 'syncSaveConfig', token, passphrase, gistId });
    if (tokenInput.value.trim() === token) tokenInput.value = '';
    if (passphraseInput.value === passphrase) passphraseInput.value = '';
    if (gistInput.value === submittedGist) syncGistDraftDirty = false;
    await loadSyncState();
    if (gistId) await pushLocal(false);
    else await createGist();
  } catch (error) {
    handleSyncError(error);
  } finally {
    button.disabled = false;
  }
}

async function disconnectSync() {
  syncGistDraftDirty = false;
  await sendRuntimeMessage({ action: 'syncClear' });
  syncState = { hasToken: false, passphrase: '', gistId: '', revision: '', localHash: '', lastSyncAt: '' };
  document.getElementById('syncToken').value = '';
  document.getElementById('syncGistId').value = '';
  document.getElementById('syncPassphrase').value = '';
  updateSecretPlaceholders();
  renderSyncStatus();
}

async function runAutoSync() {
  if (syncRunning || autoSyncPaused || pendingSyncConflict || !syncReady()) return;
  syncRunning = true;
  try {
    await pushLocal(false);
  } catch (error) {
    handleSyncError(error);
  } finally {
    syncRunning = false;
  }
}

function scheduleAutoSync() {
  autoSyncPaused = false;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runAutoSync, SYNC_DEBOUNCE_MS);
}

function handleSyncError(error) {
  setSyncStatus('Error', () => I18n.errorMessage(error));
}

function loadDefaults() {
  aiOnSelectionEnabled = true;
  aiTargets = [
    { id: uuid(), name: 'Grok', baseUrl: 'https://grok.com/', queryParam: 'q=', usePasteFallback: false },
    { id: uuid(), name: 'ChatGPT', baseUrl: 'https://chatgpt.com/', queryParam: 'q=', usePasteFallback: false },
    { id: uuid(), name: 'Claude', baseUrl: 'https://claude.ai/new', queryParam: 'q=', usePasteFallback: false },
    { id: uuid(), name: 'Gemini', baseUrl: 'https://gemini.google.com/app', queryParam: '', usePasteFallback: true },
    { id: uuid(), name: 'Perplexity', baseUrl: 'https://www.perplexity.ai/', queryParam: 'q=', usePasteFallback: false }
  ];
  selectionPrompts = [
    { id: uuid(), name: 'Translate to English', template: 'Translate to English, preserving tone and style:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Translate to Russian', template: 'Переведи на русский, сохраняя стиль и тон:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Summarize', template: 'Summarize the following text in 5 bullet points:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Key takeaways', template: 'Extract key takeaways and action items:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Rewrite simpler', template: 'Rewrite in simpler language, keep meaning:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Improve clarity', template: 'Improve clarity and grammar without changing meaning:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Explain as 5yo', template: 'Explain this like I am five years old:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Make concise', template: 'Make this concise in one paragraph:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Pros and cons', template: 'List pros and cons for the following:\n\n{{text}}', timestamp: new Date().toISOString() },
    { id: uuid(), name: 'Questions to ask', template: 'Generate 5 clarifying questions about:\n\n{{text}}', timestamp: new Date().toISOString() }
  ];
  saveAiConfig().then(loadAiConfig);
}

function exportAiConfig() {
  const data = JSON.stringify({
    aiOnSelectionEnabled,
    aiTargets,
    selectionPrompts
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-on-selection-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importAiConfig(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const raw = e.target.result;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') {
        alert(tr('Invalid format: expected a JSON object.'));
        return;
      }
      const nextEnabled = data.aiOnSelectionEnabled !== false;
      const nextTargets = Array.isArray(data.aiTargets) ? data.aiTargets.map(t => ({
        id: t.id || uuid(),
        name: t.name || tr('AI'),
        baseUrl: t.baseUrl || '',
        queryParam: t.queryParam != null ? t.queryParam : 'q=',
        usePasteFallback: !!t.usePasteFallback
      })) : [];
      const nextPrompts = Array.isArray(data.selectionPrompts) ? data.selectionPrompts.map(p => ({
        id: p.id || uuid(),
        name: p.name || tr('Selection prompt'),
        template: p.template || '',
        timestamp: p.timestamp || new Date().toISOString()
      })) : [];
      aiOnSelectionEnabled = nextEnabled;
      aiTargets = nextTargets;
      selectionPrompts = nextPrompts;
      await saveAiConfig();
      loadAiConfig();
      document.getElementById('aiImportFile').value = '';
      alert(tr('AI on Selection import done. {targets} target(s), {prompts} prompt(s).', { targets: nextTargets.length, prompts: nextPrompts.length }));
    } catch (err) {
      alert(tr('Invalid JSON or format: {detail}', { detail: I18n.errorMessage(err) }));
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
document.getElementById('cancelFolder').addEventListener('click', () => {
  document.getElementById('deleteFolder').classList.add('hidden');
  document.getElementById('modalFolder').classList.add('hidden');
});
document.getElementById('saveFolder').addEventListener('click', saveFolderFromModal);
document.getElementById('deleteFolder').addEventListener('click', deleteFolderFromModal);
document.getElementById('cancelPrompt').addEventListener('click', () => {
  document.getElementById('savePrompt').dataset.editId = '';
  document.getElementById('savePrompt').dataset.editFolderId = '';
  document.getElementById('deletePrompt').classList.add('hidden');
  document.getElementById('modalPrompt').classList.add('hidden');
});
document.getElementById('savePrompt').addEventListener('click', savePromptFromModal);
document.getElementById('deletePrompt').addEventListener('click', deletePromptFromModal);

document.getElementById('addAiTarget').addEventListener('click', openAddAiTargetModal);
document.getElementById('addSelectionPrompt').addEventListener('click', openAddSelectionPromptModal);
document.getElementById('cancelAiTarget').addEventListener('click', () => {
  document.getElementById('deleteAiTarget').classList.add('hidden');
  document.getElementById('modalAiTarget').classList.add('hidden');
});
document.getElementById('saveAiTarget').addEventListener('click', saveAiTargetFromModal);
document.getElementById('deleteAiTarget').addEventListener('click', deleteAiTargetFromModal);
document.getElementById('cancelSelectionPrompt').addEventListener('click', () => {
  document.getElementById('deleteSelectionPrompt').classList.add('hidden');
  document.getElementById('modalSelectionPrompt').classList.add('hidden');
});
document.getElementById('saveSelectionPrompt').addEventListener('click', saveSelectionPromptFromModal);
document.getElementById('deleteSelectionPrompt').addEventListener('click', deleteSelectionPromptFromModal);

document.getElementById('exportBtn').addEventListener('click', exportToJson);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('promptsList').addEventListener('click', handlePromptActionClick);
document.getElementById('promptSearch').addEventListener('input', (e) => {
  promptSearchQuery = e.target.value;
  renderPrompts();
});
document.getElementById('aiTargetsList').addEventListener('click', handleAiListActionClick);
document.getElementById('selectionPromptsList').addEventListener('click', handleAiListActionClick);
document.getElementById('importFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importFromJson(f);
});

document.getElementById('autoPaste').addEventListener('change', (e) => {
  const on = e.target.checked;
  chrome.runtime.sendMessage({ action: on ? 'enableAutoPaste' : 'disableAutoPaste' }, () => {});
});

document.getElementById('aiSelectionEnabled').addEventListener('change', (e) => {
  aiOnSelectionEnabled = e.target.checked;
  saveAiConfig().then(loadAiConfig);
});

document.getElementById('loadDefaults').addEventListener('click', loadDefaults);

document.getElementById('aiExportBtn').addEventListener('click', exportAiConfig);
document.getElementById('aiImportBtn').addEventListener('click', () => document.getElementById('aiImportFile').click());
document.getElementById('aiImportFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importAiConfig(f);
});

document.getElementById('tabPromptsBtn').addEventListener('click', () => setActiveTab('prompts'));
document.getElementById('tabAiBtn').addEventListener('click', () => setActiveTab('ai'));
document.getElementById('tabSettingsBtn').addEventListener('click', () => {
  setActiveTab('settings');
  loadSyncState();
});
document.getElementById('syncSaveConnection').addEventListener('click', enableSync);
document.getElementById('syncPull').addEventListener('click', () => { autoSyncPaused = false; pullLocal().catch(handleSyncError); });
document.getElementById('syncPush').addEventListener('click', () => { autoSyncPaused = false; pushLocal(true).catch(handleSyncError); });
document.getElementById('syncGistId').addEventListener('input', () => { syncGistDraftDirty = true; });
document.getElementById('syncGistId').addEventListener('change', () => { syncGistDraftDirty = true; });
document.getElementById('syncDisconnect').addEventListener('click', () => disconnectSync().catch(handleSyncError));
document.getElementById('syncConflictCancel').addEventListener('click', () => { autoSyncPaused = true; closeSyncConflict(); });
document.getElementById('syncConflictRemote').addEventListener('click', async () => {
  if (!pendingSyncConflict) return;
  setSyncConflictBusy(true, 'Downloading and decrypting the remote version...');
  try {
    await pullRemote(pendingSyncConflict.remote);
    closeSyncConflict();
  } catch (error) {
    setSyncConflictBusy(false, error);
    handleSyncError(error);
  }
});
document.getElementById('syncConflictLocal').addEventListener('click', async () => {
  if (!pendingSyncConflict) return;
  setSyncConflictBusy(true, 'Encrypting and uploading the local version...');
  try {
    await pushLocal(true);
    closeSyncConflict();
  } catch (error) {
    setSyncConflictBusy(false, error);
    handleSyncError(error);
  }
});

document.getElementById('languageSelect').addEventListener('change', async (event) => {
  const select = event.target;
  select.disabled = true;
  try {
    await I18n.setLanguage(select.value);
    applyInterfaceLanguage();
  } catch (error) {
    select.value = I18n.language;
    handleSyncError(error);
  } finally {
    select.disabled = false;
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (changes.language) {
    await I18n.load();
    applyInterfaceLanguage();
  }
  if (SYNC_DATA_KEYS.some(key => key in changes)) scheduleAutoSync();
});

(async () => {
  await I18n.load();
  applyInterfaceLanguage();
  renderVersion();
  const autoPaste = await loadAutoPasteState();
  document.getElementById('autoPaste').checked = !!autoPaste;
  loadFolders();
  loadAiConfig();
  loadSyncState().then(runAutoSync);
  setInterval(runAutoSync, SYNC_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) runAutoSync(); });
})();
