/* SimplestPrompt side panel. Local data plus optional Gist sync. */

let folders = [];
let selectedFolderId = null;
let dragState = null;
let promptSearchQuery = '';
let aiTargets = [];
let selectionPrompts = [];
let aiOnSelectionEnabled = true;
let syncState = { hasToken: false, gistId: '', revision: '', localHash: '', lastSyncAt: '' };
let pendingSyncConflict = null;

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
        <span class="name">${escapeHtml(f.name || 'Unnamed')}</span>
        <span class="count">${(f.prompts || []).length} prompts</span>
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
    <div class="title">${escapeHtml(prompt.title || 'Untitled')}</div>
    ${showFolderName ? `<div class="folder-name">${escapeHtml(folder.name || 'Unnamed')}</div>` : ''}
    <div class="text">${escapeHtml((prompt.text || '').slice(0, 120))}${(prompt.text || '').length > 120 ? '…' : ''}</div>
    <div class="actions">
      <button type="button" class="btn" data-action="copy" data-id="${prompt.id}">Copy</button>
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
      listEl.innerHTML = '<div class="empty">No prompts found.</div>';
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
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); }
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
    listEl.innerHTML = '<div class="empty">No AI targets. Click "+ Target" to add one.</div>';
    return;
  }
  aiTargets.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'list-item';
    card.dataset.id = t.id;
    const queryLabel = (t.queryParam === '' || t.queryParam == null) ? '—' : (t.queryParam || 'q=');
    card.innerHTML = `
      <div class="title">${escapeHtml(t.name || 'AI')}</div>
      <div class="meta">${escapeHtml(t.baseUrl || '')}</div>
      <div class="meta">Query: ${escapeHtml(queryLabel)}${t.usePasteFallback ? ' · paste fallback' : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="edit-target" data-id="${t.id}">Edit</button>
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
    listEl.innerHTML = '<div class="empty">No selection prompts. Click "+ Prompt" to add one.</div>';
    return;
  }
  selectionPrompts.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'list-item selection-prompt-card';
    card.dataset.id = p.id;
    card.draggable = true;
    const preview = (p.template || '').slice(0, 120);
    card.innerHTML = `
      <div class="title">${escapeHtml(p.name || 'Untitled')}</div>
      <div class="meta">${escapeHtml(preview)}${(p.template || '').length > 120 ? '…' : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="edit-selection" data-id="${p.id}">Edit</button>
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
  document.getElementById('modalPromptTitle').textContent = 'Edit prompt';
  document.getElementById('promptTitle').value = location.prompt.title || '';
  document.getElementById('promptText').value = location.prompt.text || '';
  document.getElementById('savePrompt').dataset.editId = promptId;
  document.getElementById('savePrompt').dataset.editFolderId = location.folder.id;
  document.getElementById('deletePrompt').classList.remove('hidden');
  document.getElementById('modalPrompt').classList.remove('hidden');
}

function openAddAiTargetModal() {
  document.getElementById('modalAiTargetTitle').textContent = 'New AI target';
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
  document.getElementById('modalAiTargetTitle').textContent = 'Edit AI target';
  document.getElementById('aiTargetName').value = target.name || '';
  document.getElementById('aiTargetBaseUrl').value = target.baseUrl || '';
  document.getElementById('aiTargetQueryParam').value = target.queryParam != null ? target.queryParam : 'q=';
  document.getElementById('aiTargetUsePaste').checked = !!target.usePasteFallback;
  document.getElementById('saveAiTarget').dataset.editId = target.id;
  document.getElementById('deleteAiTarget').classList.remove('hidden');
  document.getElementById('modalAiTarget').classList.remove('hidden');
}

function openAddSelectionPromptModal() {
  document.getElementById('modalSelectionPromptTitle').textContent = 'New selection prompt';
  document.getElementById('selectionPromptName').value = '';
  document.getElementById('selectionPromptTemplate').value = '';
  document.getElementById('saveSelectionPrompt').dataset.editId = '';
  document.getElementById('deleteSelectionPrompt').classList.add('hidden');
  document.getElementById('modalSelectionPrompt').classList.remove('hidden');
}

function openEditSelectionPromptModal(promptId) {
  const prompt = selectionPrompts.find(p => p.id === promptId);
  if (!prompt) return;
  document.getElementById('modalSelectionPromptTitle').textContent = 'Edit selection prompt';
  document.getElementById('selectionPromptName').value = prompt.name || '';
  document.getElementById('selectionPromptTemplate').value = prompt.template || '';
  document.getElementById('saveSelectionPrompt').dataset.editId = prompt.id;
  document.getElementById('deleteSelectionPrompt').classList.remove('hidden');
  document.getElementById('modalSelectionPrompt').classList.remove('hidden');
}

function openAddFolderModal() {
  document.getElementById('modalFolderTitle').textContent = 'New folder';
  document.getElementById('folderName').value = '';
  document.getElementById('saveFolder').dataset.editFolderId = '';
  document.getElementById('deleteFolder').classList.add('hidden');
  document.getElementById('modalFolder').classList.remove('hidden');
}

function openEditFolderModal(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  document.getElementById('modalFolderTitle').textContent = 'Edit folder';
  document.getElementById('folderName').value = folder.name || '';
  document.getElementById('saveFolder').dataset.editFolderId = folder.id;
  document.getElementById('deleteFolder').classList.remove('hidden');
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
  const name = document.getElementById('aiTargetName').value.trim() || 'AI Target';
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
  const title = document.getElementById('promptTitle').value.trim() || 'Untitled';
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
  const name = document.getElementById('selectionPromptName').value.trim() || 'Selection prompt';
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
  const syncTab = document.getElementById('tabSync');
  const btnPrompts = document.getElementById('tabPromptsBtn');
  const btnAi = document.getElementById('tabAiBtn');
  const btnSync = document.getElementById('tabSyncBtn');
  const showPrompts = tab === 'prompts';
  const showAi = tab === 'ai';
  promptsTab.classList.toggle('hidden', !showPrompts);
  aiTab.classList.toggle('hidden', !showAi);
  syncTab.classList.toggle('hidden', tab !== 'sync');
  btnPrompts.classList.toggle('active', showPrompts);
  btnAi.classList.toggle('active', showAi);
  btnSync.classList.toggle('active', tab === 'sync');
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response || response.success === false) return reject(new Error(response && response.error || 'Operation failed.'));
      resolve(response);
    });
  });
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
    const tokenInput = document.getElementById('syncToken');
    tokenInput.value = '';
    tokenInput.placeholder = syncState.hasToken ? '****************' : 'Token with Gist permission';
    document.getElementById('syncGistId').value = syncState.gistId || '';
    renderSyncStatus();
  } catch (error) {
    setSyncStatus('Error', error.message);
  }
}

function setSyncStatus(title, meta) {
  const statusEl = document.getElementById('syncStatus');
  document.getElementById('syncStatusTitle').textContent = title;
  document.getElementById('syncStatusMeta').textContent = meta || '';
  statusEl.dataset.state = title === 'Error' ? 'error' : (title === 'Ready' ? 'success' : 'idle');
}

function renderSyncStatus() {
  if (!syncState.hasToken) {
    setSyncStatus('Sync is not configured', 'Add your Gist token and sync password to get started.');
    return;
  }
  if (!syncState.gistId) {
    setSyncStatus('Almost ready', 'Create a private Gist or paste an existing Gist URL.');
    return;
  }
  const details = [
    syncState.gistId ? 'Gist: ' + syncState.gistId : 'No Gist selected.',
    syncState.lastSyncAt ? 'Last sync: ' + formatSyncDate(syncState.lastSyncAt) : 'No successful sync yet.'
  ];
  setSyncStatus('Ready', details.join('\n'));
}

function formatSyncDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
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

function getSyncPassphrase() {
  return document.getElementById('syncPassphrase').value;
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

async function encryptedLocalPayload() {
  const passphrase = getSyncPassphrase();
  if (!passphrase) throw new Error('Enter the encryption passphrase first.');
  return JSON.stringify(await encryptSyncData(await getSyncData(), passphrase));
}

async function ensureSyncConnection() {
  const token = document.getElementById('syncToken').value.trim();
  const gistId = normalizeGistId(document.getElementById('syncGistId').value);
  if (token || gistId !== (syncState.gistId || '')) {
    await saveSyncConnection();
  }
  if (!syncState.hasToken) throw new Error('Enter and save a GitHub token first.');
  if (!syncState.gistId) throw new Error('Enter a Gist URL or create a private Gist first.');
}

async function pullRemote(remote) {
  const passphrase = getSyncPassphrase();
  if (!passphrase) throw new Error('Enter the encryption passphrase first.');
  const data = await decryptSyncData(JSON.parse(remote.content), passphrase);
  await applySyncedData(data);
  const localHash = await hashSyncData(data);
  await sendRuntimeMessage({ action: 'syncMarkRevision', revision: remote.revision, localHash, lastSyncAt: new Date().toISOString() });
  await loadSyncState();
  renderSyncStatus();
}

function showSyncConflict(conflict) {
  pendingSyncConflict = conflict;
  document.getElementById('syncConflictTitle').textContent = conflict.initial ? 'Choose sync version' : 'Remote changes detected';
  document.getElementById('syncConflictMessage').textContent = conflict.initial
    ? 'This browser already has local data. Choose whether to use the Gist or upload this local data.'
    : syncState.revision
    ? 'The Gist changed since the last sync. Choose which version to keep.'
    : 'This browser has no sync history for this Gist yet. Choose which version to use.';
  document.getElementById('syncConflictCancel').disabled = false;
  document.getElementById('syncConflictRemote').disabled = false;
  document.getElementById('syncConflictLocal').disabled = false;
  document.getElementById('syncConflictModal').classList.remove('hidden');
}

function closeSyncConflict() {
  pendingSyncConflict = null;
  document.getElementById('syncConflictModal').classList.add('hidden');
}

function setSyncConflictBusy(busy, message) {
  document.getElementById('syncConflictMessage').textContent = message;
  document.getElementById('syncConflictCancel').disabled = busy;
  document.getElementById('syncConflictRemote').disabled = busy;
  document.getElementById('syncConflictLocal').disabled = busy;
}

async function pushLocal(force) {
  await ensureSyncConnection();
  const localData = await getSyncData();
  const localHash = await hashSyncData(localData);
  const hasLocalData = localData.folders.length > 0 || localData.aiTargets.length > 0 || localData.selectionPrompts.length > 0;
  if (!force && !syncState.revision) {
    const response = await sendRuntimeMessage({ action: 'syncFetch' });
    if (!hasLocalData) {
      await pullRemote(response.remote);
      return;
    }
    showSyncConflict({ type: 'initial', initial: true, remote: response.remote });
    return;
  }
  const remoteResponse = await sendRuntimeMessage({ action: 'syncFetch' });
  const remoteChanged = remoteResponse.remote.revision !== syncState.revision;
  const localChanged = !syncState.localHash || localHash !== syncState.localHash;
  if (!force && remoteChanged && !localChanged) {
    await pullRemote(remoteResponse.remote);
    return;
  }
  if (!force && remoteChanged && localChanged) {
    showSyncConflict({ type: 'push', remote: remoteResponse.remote });
    return;
  }
  if (!force && !remoteChanged && !localChanged) {
    await sendRuntimeMessage({ action: 'syncMarkRevision', revision: syncState.revision, localHash, lastSyncAt: new Date().toISOString() });
    await loadSyncState();
    setSyncStatus('Ready', 'Already up to date. No changes to upload or download.\n' + document.getElementById('syncStatusMeta').textContent);
    return;
  }
  const content = JSON.stringify(await encryptSyncData(localData, getSyncPassphrase()));
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
  renderSyncStatus();
}

async function pullLocal() {
  await ensureSyncConnection();
  const response = await sendRuntimeMessage({ action: 'syncFetch' });
  await pullRemote(response.remote);
}

async function checkRemote() {
  await ensureSyncConnection();
  const response = await sendRuntimeMessage({ action: 'syncFetch' });
  if (!syncState.revision) {
    setSyncStatus('Remote version available', 'Pull it before pushing local data.');
    return;
  }
  if (response.remote.revision === syncState.revision) {
    setSyncStatus('Ready', 'No remote changes detected.');
    return;
  }
  setSyncStatus('Remote changes detected', 'Choose Pull to review and apply the remote version.');
}

async function createGist() {
  if (document.getElementById('syncToken').value.trim()) await saveSyncConnection();
  const content = await encryptedLocalPayload();
  const response = await sendRuntimeMessage({ action: 'syncCreate', content });
  const localHash = await hashSyncData(await getSyncData());
  await sendRuntimeMessage({ action: 'syncMarkRevision', revision: response.revision, localHash, lastSyncAt: new Date().toISOString() });
  await loadSyncState();
  renderSyncStatus();
  if (response.htmlUrl) window.open(response.htmlUrl, '_blank', 'noopener,noreferrer');
}

async function saveSyncConnection() {
  const token = document.getElementById('syncToken').value.trim();
  const gistId = normalizeGistId(document.getElementById('syncGistId').value);
  if (!token && !syncState.hasToken) throw new Error('Enter a GitHub token first.');
  await sendRuntimeMessage({ action: 'syncSaveConfig', token, gistId });
  document.getElementById('syncToken').value = '';
  await loadSyncState();
  setSyncStatus(gistId ? 'Ready' : 'Almost ready', gistId ? 'Click Sync now when you are ready.' : 'Create a private Gist to finish setup.');
}

async function disconnectSync() {
  await sendRuntimeMessage({ action: 'syncClear' });
  syncState = { hasToken: false, gistId: '', revision: '', localHash: '', lastSyncAt: '' };
  document.getElementById('syncToken').value = '';
  document.getElementById('syncToken').placeholder = 'Token with Gist permission';
  document.getElementById('syncGistId').value = '';
  document.getElementById('syncPassphrase').value = '';
  renderSyncStatus();
}

function handleSyncError(error) {
  setSyncStatus('Error', error.message || String(error));
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
        alert('Invalid format: expected a JSON object.');
        return;
      }
      const nextEnabled = data.aiOnSelectionEnabled !== false;
      const nextTargets = Array.isArray(data.aiTargets) ? data.aiTargets.map(t => ({
        id: t.id || uuid(),
        name: t.name || 'AI',
        baseUrl: t.baseUrl || '',
        queryParam: t.queryParam != null ? t.queryParam : 'q=',
        usePasteFallback: !!t.usePasteFallback
      })) : [];
      const nextPrompts = Array.isArray(data.selectionPrompts) ? data.selectionPrompts.map(p => ({
        id: p.id || uuid(),
        name: p.name || 'Selection prompt',
        template: p.template || '',
        timestamp: p.timestamp || new Date().toISOString()
      })) : [];
      aiOnSelectionEnabled = nextEnabled;
      aiTargets = nextTargets;
      selectionPrompts = nextPrompts;
      await saveAiConfig();
      loadAiConfig();
      document.getElementById('aiImportFile').value = '';
      alert('AI on Selection import done. ' + nextTargets.length + ' target(s), ' + nextPrompts.length + ' prompt(s).');
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
document.getElementById('tabSyncBtn').addEventListener('click', () => {
  setActiveTab('sync');
  loadSyncState();
});
document.getElementById('syncSaveConnection').addEventListener('click', () => saveSyncConnection().catch(handleSyncError));
document.getElementById('syncCreateGist').addEventListener('click', () => createGist().catch(handleSyncError));
document.getElementById('syncPull').addEventListener('click', () => pullLocal().catch(handleSyncError));
document.getElementById('syncPush').addEventListener('click', () => pushLocal(false).catch(handleSyncError));
document.getElementById('syncSync').addEventListener('click', () => pushLocal(false).catch(handleSyncError));
document.getElementById('syncCheck').addEventListener('click', () => checkRemote().catch(handleSyncError));
document.getElementById('syncDisconnect').addEventListener('click', () => disconnectSync().catch(handleSyncError));
document.getElementById('syncConflictCancel').addEventListener('click', closeSyncConflict);
document.getElementById('syncConflictRemote').addEventListener('click', async () => {
  if (!pendingSyncConflict) return;
  setSyncConflictBusy(true, 'Downloading and decrypting the remote version...');
  try {
    await pullRemote(pendingSyncConflict.remote);
    closeSyncConflict();
  } catch (error) {
    setSyncConflictBusy(false, error.message || String(error));
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
    setSyncConflictBusy(false, error.message || String(error));
    handleSyncError(error);
  }
});

(async () => {
  renderVersion();
  const autoPaste = await loadAutoPasteState();
  document.getElementById('autoPaste').checked = !!autoPaste;
  loadFolders();
  loadAiConfig();
  loadSyncState();
})();
