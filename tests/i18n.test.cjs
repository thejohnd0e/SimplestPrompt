const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

function createRuntime(saved = {}) {
  const data = structuredClone(saved);
  const context = vm.createContext({
    console, Intl, URL, setTimeout, clearTimeout,
    chrome: { storage: { local: {
      get: async defaults => Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, k in data ? data[k] : v])),
      set: async patch => Object.assign(data, structuredClone(patch))
    } } }
  });
  const file = path.join(root, 'i18n.js');
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  assert(context.I18n, 'shared runtime localization must exist');
  return { context, data, i18n: context.I18n };
}

// Catches accidental browser-language defaulting or an unsupported preference.
test('missing and unsupported preferences render English', async () => {
  for (const preference of [undefined, 'de', null, { language: 'ru' }]) {
    const { i18n } = createRuntime({ language: preference });
    await i18n.load();
    assert.equal(i18n.language, 'en');
    assert.equal(i18n.t('Settings'), 'Settings');
    assert.equal(i18n.t('Unknown technical detail'), 'Unknown technical detail');
  }
});

// Catches preference not being persisted, or persistence overwriting user data.
test('Russian persists locally across runtime restarts without changing user data', async () => {
  const folders = [{ id: 'f', name: 'Copy', prompts: [{ title: '<b>Save</b>', text: '{{text}}' }] }];
  const { i18n, data } = createRuntime({ folders, syncConfig: { token: 'local-secret' } });
  await i18n.setLanguage('ru');
  assert.equal(i18n.t('Settings'), 'Настройки');
  assert.equal(data.language, 'ru');
  assert.deepEqual(data.folders, folders);
  assert.deepEqual(data.syncConfig, { token: 'local-secret' });
  const next = createRuntime(data);
  await next.i18n.load();
  assert.equal(next.i18n.t('Copy'), 'Копировать');
  await next.i18n.setLanguage('en');
  assert.equal(next.i18n.t('Copy'), 'Copy');
});

// Catches replacement-string expansion ($&, $`) and recursive placeholder replacement.
test('interpolation keeps literal parameter values intact', async () => {
  const { i18n } = createRuntime();
  await i18n.setLanguage('ru');
  assert.equal(i18n.t('Import done. {count} folder(s) loaded.', { count: 3 }), 'Импорт завершён. Загружено папок: 3.');
  assert.equal(i18n.t('Detail: {detail}', { detail: '$& <script> {count}' }), 'Подробности: $& <script> {count}');
});

test('known encryption errors are localized and unknown errors have a localized explanation', async () => {
  const { i18n } = createRuntime({ language: 'ru' });
  await i18n.load();
  assert.equal(i18n.errorMessage(new Error('Unable to decrypt sync data. Check the passphrase.')), 'Не удалось расшифровать данные. Проверьте пароль синхронизации.');
  assert.equal(i18n.errorMessage(new Error('HTTP 503')), 'Не удалось выполнить операцию. Подробности: HTTP 503');
});

function workerRuntime(saved) {
  const runtime = createRuntime(saved);
  const menus = [];
  const events = {};
  const chrome = runtime.context.chrome;
  const event = name => ({ addListener: fn => { events[name] = fn; } });
  chrome.runtime = { onInstalled: event('installed'), onMessage: event('message') };
  chrome.storage.onChanged = event('storage');
  chrome.contextMenus = { removeAll: async () => { menus.length = 0; }, create: item => menus.push(item), onClicked: event('menuClick') };
  runtime.context.importScripts = file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), runtime.context);
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), runtime.context);
  return { ...runtime, menus, events, build: () => vm.runInContext('buildContextMenu()', runtime.context) };
}

// Catches cold-start English menus, accidental translation of user names and lost context restrictions.
test('worker builds Russian page menus from saved preference while keeping user names', async () => {
  const { build, menus } = workerRuntime({
    language: 'ru',
    folders: [{ id: 'f', name: 'Copy', prompts: [{ id: 'p', title: 'Save', text: 'User text' }] }],
    aiTargets: [{ id: 't', name: 'Edit' }], selectionPrompts: [{ id: 's', name: 'Copy', template: '{{text}}' }]
  });
  await build();
  assert.equal(menus.find(m => m.id === 'rcp_open_panel_2').title, 'Открыть панель');
  assert.equal(menus.find(m => m.id === 'ai_selection_root').title, 'ИИ для выделенного текста');
  assert.equal(menus.find(m => m.id === 'folder_f').title, 'Copy');
  assert.equal(menus.find(m => m.id === 'prompt_p').title, 'Save');
  assert.equal(menus.find(m => m.id === 'ai_prompt_s').title, 'Copy');
  assert.equal(menus.find(m => m.id === 'ai_target__s__t').title, 'Edit');
  for (const menu of menus) assert(!menu.contexts.some(c => ['all', 'action'].includes(c)));
  assert.deepEqual(Array.from(menus.find(m => m.id === 'ai_selection_root').contexts), ['selection']);
});

test('language-only storage updates rebuild menus in the new language', async () => {
  const runtime = workerRuntime({ language: 'en' });
  await runtime.build();
  assert.equal(runtime.menus.find(m => m.id === 'rcp_open_panel_2').title, 'Open panel');
  runtime.data.language = 'ru';
  runtime.events.storage({ language: { oldValue: 'en', newValue: 'ru' } }, 'local');
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(runtime.menus.find(m => m.id === 'rcp_open_panel_2').title, 'Открыть панель');
});

test('cold worker notifications use the stored language without building menus first', async () => {
  const runtime = workerRuntime({ language: 'ru' });
  const notices = [];
  runtime.context.chrome.tabs = { query: (query, callback) => callback([{ id: 1, url: 'https://example.com/' }]) };
  runtime.context.chrome.scripting = { executeScript: async options => { notices.push(options.args[0]); } };
  await vm.runInContext('showToast("Copied! Paste with Ctrl+V")', runtime.context);
  assert.deepEqual(notices, ['Скопировано! Вставьте с помощью Ctrl+V']);
});

test('localized menus retain folder and prompt limits', async () => {
  const runtime = workerRuntime({
    language: 'ru',
    folders: Array.from({ length: 26 }, (_, i) => ({
      id: String(i), name: `Folder ${i}`,
      prompts: Array.from({ length: 31 }, (_, j) => ({ id: `${i}_${j}`, title: `Prompt ${j}` }))
    }))
  });
  await runtime.build();
  assert.equal(runtime.menus.filter(m => m.id.startsWith('folder_')).length, 25);
  assert.equal(runtime.menus.filter(m => m.id.startsWith('prompt_')).length, 750);
  assert.equal(runtime.menus.filter(m => m.id.startsWith('more_')).length, 25);
  assert.equal(runtime.menus.find(m => m.id === 'rcp_more_folders').title, '… остальные в панели');
});
