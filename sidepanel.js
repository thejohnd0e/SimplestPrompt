/* Right-Click Prompt (Local) - side panel. No auth, no cloud. */

let folders = [];
let selectedFolderId = null;
let dragState = null;
let aiTargets = [];
let selectionPrompts = [];
let aiOnSelectionEnabled = true;

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

  prompts.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.id = p.id;
    card.draggable = true;
    card.innerHTML = `
      <div class="title">${escapeHtml(p.title || 'Untitled')}</div>
      <div class="text">${escapeHtml((p.text || '').slice(0, 120))}${(p.text || '').length > 120 ? '…' : ''}</div>
      <div class="actions">
        <button type="button" class="btn" data-action="copy" data-id="${p.id}">Copy</button>
      </div>
    `;
    card.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      editPrompt(p.id);
    });
    card.addEventListener('dragstart', (e) => onPromptDragStart(e, p.id));
    card.addEventListener('dragover', onItemDragOver);
    card.addEventListener('dragleave', onItemDragLeave);
    card.addEventListener('drop', (e) => onPromptDrop(e, p.id));
    card.addEventListener('dragend', onItemDragEnd);
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

function onPromptDragStart(e, promptId) {
  dragState = { type: 'prompt', id: promptId };
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
  if (!dragState || dragState.type !== 'folder') return;
  const sourceIndex = folders.findIndex(f => f.id === dragState.id);
  const targetIndex = folders.findIndex(f => f.id === targetFolderId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const destinationIndex = getDestinationIndex(e.currentTarget, sourceIndex, targetIndex, e.clientY);
  if (!moveArrayItem(folders, sourceIndex, destinationIndex)) return;
  saveFolders().then(loadFolders);
}

function onPromptDrop(e, targetPromptId) {
  e.preventDefault();
  onItemDragLeave(e);
  if (!dragState || dragState.type !== 'prompt') return;
  const folder = getSelectedFolder();
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
  const folder = getSelectedFolder();
  const p = (folder && folder.prompts || []).find(x => x.id === promptId);
  if (!p) return;
  document.getElementById('modalPromptTitle').textContent = 'Edit prompt';
  document.getElementById('promptTitle').value = p.title || '';
  document.getElementById('promptText').value = p.text || '';
  document.getElementById('savePrompt').dataset.editId = promptId;
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
  document.getElementById('savePrompt').dataset.editId = '';
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
  if (!promptId) return;
  const folder = getSelectedFolder();
  if (!folder) return;
  folder.prompts = (folder.prompts || []).filter(p => p.id !== promptId);
  document.getElementById('savePrompt').dataset.editId = '';
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
  const btnPrompts = document.getElementById('tabPromptsBtn');
  const btnAi = document.getElementById('tabAiBtn');
  const showPrompts = tab === 'prompts';
  promptsTab.classList.toggle('hidden', !showPrompts);
  aiTab.classList.toggle('hidden', showPrompts);
  btnPrompts.classList.toggle('active', showPrompts);
  btnAi.classList.toggle('active', !showPrompts);
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

(async () => {
  renderVersion();
  const autoPaste = await loadAutoPasteState();
  document.getElementById('autoPaste').checked = !!autoPaste;
  loadFolders();
  loadAiConfig();
})();
