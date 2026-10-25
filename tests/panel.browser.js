/* Browser-only checks: /tests/panel.test.html. Uses the real panel DOM. */
(async () => {
  const results = document.getElementById('results');
  const frame = document.getElementById('panel');
  const passed = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    passed.push(message);
  };
  try {
    const source = await (await fetch('../sidepanel.html', { cache: 'no-store' })).text();
    const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    frame.srcdoc = source.replace(/src="(i18n|crypto|sidepanel)\.js"/g, `src="/$1.js?test=${Date.now()}"`)
      .replace('<head>', '<head><base href="/"><script src="/tests/chrome-fixture.js"></script>');
    await loaded;
    const win = frame.contentWindow;
    const doc = win.document;
    const el = id => doc.getElementById(id);
    await win.loadFolders();
    await win.loadAiConfig();
    check(win.I18n.language === 'en', 'English is the default');
    check(el('tabSettingsBtn').getAttribute('aria-label') === 'Settings' && !!el('tabSettingsBtn').querySelector('svg'), 'Gear has an accessible Settings label');
    el('tabSettingsBtn').click();
    await win.loadSyncState();
    check(!el('tabSettings').classList.contains('hidden'), 'Gear opens settings');
    check(!!(el('languageSelect').compareDocumentPosition(el('syncToken')) & Node.DOCUMENT_POSITION_FOLLOWING), 'Language selector precedes sync controls');
    const original = JSON.stringify(win.fixtureData.folders);
    win.selectFolder('folder');
    el('promptSearch').value = 'Save';
    el('promptSearch').dispatchEvent(new Event('input'));
    win.editPrompt('prompt');
    el('promptText').value = 'Unsaved <script>draft</script> {{text}}';
    el('syncPassphrase').value = 'test-password-not-a-real-secret';
    el('syncToken').value = 'test-token-not-a-real-secret';
    el('syncGistId').value = '0123456789abcdef0123456789abcd01';
    el('syncGistId').dispatchEvent(new Event('input'));
    const messagesBefore = win.fixtureMessages.length;
    // Await actual handler completion by observing its busy state.
    el('languageSelect').value = 'ru';
    el('languageSelect').dispatchEvent(new Event('change'));
    while (el('languageSelect').disabled) await new Promise(resolve => setTimeout(resolve, 0));
    check(doc.documentElement.lang === 'ru', 'Russian applies without panel reload');
    check(el('tabSettingsBtn').getAttribute('aria-label') === 'Настройки', 'Gear tooltip/accessibility are translated');
    check(el('savePrompt').textContent === 'Сохранить' && el('modalPromptTitle').textContent === 'Редактирование промпта', 'Open dialog is translated');
    check(el('promptText').value === 'Unsaved <script>draft</script> {{text}}', 'Unsaved prompt draft is preserved');
    check(el('syncPassphrase').value === 'test-password-not-a-real-secret' && el('syncToken').value === 'test-token-not-a-real-secret' && el('syncGistId').value === '0123456789abcdef0123456789abcd01', 'Sync credentials and connection draft are preserved');
    check(el('promptSearch').value === 'Save' && el('foldersList').querySelector('.active .name').textContent === 'Copy', 'Search and selected folder survive switching');
    check(JSON.stringify(win.fixtureData.folders) === original, 'Switch does not modify stored prompt data');
    check(el('promptsList').querySelector('.title').textContent === 'Save' && !el('promptsList').querySelector('b'), 'User text is escaped and not translated');
    check(!/[A-Za-z]{4}/.test(el('syncStatusTitle').textContent), 'Sync status is translated');
    check(el('syncStatus').dataset.state === 'idle', 'Localized idle status keeps its visual state');
    check(doc.querySelector('[data-i18n-html="help.password"]').textContent.includes('шифрует') && doc.querySelector('[data-i18n-html="help.url"]').textContent.includes('секретный Gist'), 'Sync help is translated');
    check(win.fixtureMessages.length === messagesBefore, 'Language switch does not trigger sync or other runtime messages');
    check(!('language' in await win.getSyncData()), 'Language is excluded from encrypted sync payload');
    win.handleSyncError(new Error('Unable to decrypt sync data. Check the passphrase.'));
    check(el('syncStatusTitle').textContent === 'Ошибка' && el('syncStatus').dataset.state === 'error' && el('syncStatusMeta').textContent.includes('Проверьте пароль'), 'Encryption errors have translated text and error styling');
    win.showSyncConflict({ initial: true, remote: {} });
    win.setSyncConflictBusy(false, new Error('Unable to decrypt sync data. Check the passphrase.'));
    // A storage event from another panel updates this panel without losing the draft.
    await win.chrome.storage.local.set({ language: 'en' });
    check(el('savePrompt').textContent === 'Save' && el('promptText').value.includes('Unsaved'), 'External language change returns to English and preserves the draft');
    check(el('syncStatusTitle').textContent === 'Error' && el('syncStatusMeta').textContent.startsWith('Unable to decrypt'), 'Existing errors retranslate on language change');
    check(el('syncConflictMessage').textContent === 'Unable to decrypt sync data. Check the passphrase.', 'Open conflict error retranslates on language change');
    win.closeSyncConflict();
    el('cancelPrompt').click();
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const sentSince = start => win.fixtureMessages.slice(start).map(m => m.action);
    check(!el('syncDiagnose') && !el('syncSync') && !el('syncCreateGist') && !el('syncCheck') && !doc.querySelector('.sync-guide'), 'Diagnostics, Sync now, Create Gist and the scenario guide are gone');
    check(doc.querySelectorAll('#tabSettings .sync-field input').length === 3, 'Sync setup has exactly three fields: Gist URL, token and password');

    // Expired or rejected token: friendly message, saved connection untouched, entered values kept.
    win.fixtureSaveError = 'GitHub rejected the token. It may have expired. Create a new token and enter it above.';
    el('syncSaveConnection').click();
    while (el('syncSaveConnection').disabled) await wait(0);
    check(el('syncStatus').dataset.state === 'error' && el('syncStatusMeta').textContent.startsWith('GitHub rejected the token. It may have expired'), 'Rejected token shows a friendly reconnect message');
    check(el('syncToken').value === 'test-token-not-a-real-secret' && el('syncPassphrase').value === 'test-password-not-a-real-secret' && el('syncGistId').value === '0123456789abcdef0123456789abcd01', 'Rejected enable keeps all entered values');
    check(!win.fixtureSyncState.hasToken, 'Rejected enable saves nothing');
    await win.chrome.storage.local.set({ language: 'ru' });
    check(el('syncStatusMeta').textContent.includes('GitHub отклонил токен') && el('syncSaveConnection').textContent === 'Включить синхронизацию', 'Expired-token message and the button are translated');
    await win.chrome.storage.local.set({ language: 'en' });
    win.fixtureSaveError = '';

    // First browser: empty Gist URL creates a secret Gist, uploads encrypted data and syncs automatically.
    el('syncToken').value = 'token-c';
    el('syncPassphrase').value = 'password-c';
    el('syncGistId').value = '';
    el('syncGistId').dispatchEvent(new Event('input'));
    let mark = win.fixtureMessages.length;
    el('syncSaveConnection').click();
    while (el('syncSaveConnection').disabled) await wait(0);
    const createFlow = sentSince(mark);
    check(createFlow.indexOf('syncSaveConfig') === 0 && createFlow.includes('syncCreate') && !createFlow.includes('syncUpdate'), 'One click saves the connection and creates the Gist');
    const saveMessage = win.fixtureMessages[mark];
    check(saveMessage.token === 'token-c' && saveMessage.passphrase === 'password-c' && saveMessage.gistId === '', 'Token and password are sent to be saved locally');
    const created = JSON.parse(win.fixtureMessages[mark + createFlow.indexOf('syncCreate')].content);
    check(created.format === 'simplestprompt-encrypted' && !JSON.stringify(created).includes('User content') && !JSON.stringify(created).includes('token-c') && !JSON.stringify(created).includes('password-c'), 'Uploaded data is encrypted and contains no token or password');
    check(el('syncToken').value === '' && el('syncPassphrase').value === '' && el('syncGistId').value === 'new-created-gist', 'Secrets are cleared from the form and the created Gist URL is shown');
    check(el('syncToken').placeholder === '****************' && el('syncPassphrase').placeholder === '****************', 'Saved token and password are shown masked');
    check(el('syncStatus').dataset.state === 'success' && el('syncStatusMeta').textContent.includes('Gist: new-created-gist') && el('syncStatusMeta').textContent.includes('automatically'), 'Status shows the connected Gist and automatic sync');
    check(!el('syncDisconnect').classList.contains('hidden'), 'Disconnect is available once connected');

    // Automatic push after a local change (debounced), with no button.
    mark = win.fixtureMessages.length;
    await win.chrome.storage.local.set({ folders: [{ id: 'folder', name: 'Copy', prompts: [{ id: 'prompt', title: 'Changed', text: 'new' }] }] });
    await wait(3600);
    check(sentSince(mark).join() === 'syncFetch,syncUpdate,syncMarkRevision,syncGetState', 'A local change is pushed automatically');
    const updateMessage = win.fixtureMessages[mark + 1];
    check(!updateMessage.force && updateMessage.expectedRevision === 'created-revision' && !updateMessage.content.includes('Changed'), 'Automatic push is a safe, revision-checked, encrypted update');

    // Periodic/startup check with nothing changed does not upload.
    mark = win.fixtureMessages.length;
    await win.runAutoSync();
    check(!sentSince(mark).includes('syncUpdate'), 'An automatic check with no changes uploads nothing');

    // Disconnect removes everything.
    el('syncDisconnect').click();
    while (win.fixtureSyncState.hasToken) await wait(0);
    await wait(0);
    check(el('syncGistId').value === '' && el('syncStatusTitle').textContent === 'Sync is not configured' && el('syncDisconnect').classList.contains('hidden') && el('syncPassphrase').placeholder !== '****************', 'Disconnect clears the connection and returns to setup');

    // Another browser with an existing, still empty Gist: the first sync simply uploads.
    win.fixtureRemote = { empty: true, content: '', revision: 'rev-0' };
    el('syncToken').value = 'token-d';
    el('syncPassphrase').value = 'password-d';
    el('syncGistId').value = 'https://gist.github.com/someone/fedcba9876543210fedcba9876543210';
    el('syncGistId').dispatchEvent(new Event('input'));
    mark = win.fixtureMessages.length;
    el('syncSaveConnection').click();
    while (el('syncSaveConnection').disabled) await wait(0);
    const joinFlow = sentSince(mark);
    check(win.fixtureMessages[mark].gistId === 'fedcba9876543210fedcba9876543210', 'A pasted Gist URL is reduced to its ID');
    check(joinFlow.includes('syncFetch') && joinFlow.includes('syncUpdate') && !joinFlow.includes('syncCreate'), 'An existing empty Gist is filled without creating another');
    check(win.fixtureMessages[mark + joinFlow.indexOf('syncUpdate')].force === true, 'First upload to an empty Gist does not raise a conflict');
    check(el('syncStatus').dataset.state === 'success', 'Status is connected after joining an existing Gist');
    check(el('syncSaveConnection').textContent === 'Update connection', 'Button no longer says "Enable syncing" once sync is working');
    el('syncGistId').value = 'https://github.com/settings/tokens';
    el('syncGistId').dispatchEvent(new Event('input'));
    mark = win.fixtureMessages.length;
    el('syncSaveConnection').click();
    await wait(0);
    check(el('syncStatus').dataset.state === 'error' && el('syncStatusMeta').textContent.startsWith('That is not a Gist link') && win.fixtureMessages.length === mark, 'A non-Gist link (e.g. the token page) is rejected with an explanation and nothing is sent');
    el('syncDisconnect').click();
    while (win.fixtureSyncState.hasToken) await wait(0);
    await wait(0);
    check(el('syncSaveConnection').textContent === 'Enable syncing', 'Button says "Enable syncing" again after Disconnect');
    results.textContent = `PASS (${passed.length} checks)\n` + passed.join('\n');
    window.testResult = { passed: passed.length, failed: 0 };
  } catch (error) {
    results.textContent = `FAIL after ${passed.length} checks: ${error.stack}`;
    window.testResult = { passed: passed.length, failed: 1, error: error.message };
  }
})();
