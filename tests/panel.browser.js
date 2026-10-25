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
    el('syncGistId').value = 'unsaved-gist';
    const messagesBefore = win.fixtureMessages.length;
    // Await actual handler completion by observing its busy state.
    el('languageSelect').value = 'ru';
    el('languageSelect').dispatchEvent(new Event('change'));
    while (el('languageSelect').disabled) await new Promise(resolve => setTimeout(resolve, 0));
    check(doc.documentElement.lang === 'ru', 'Russian applies without panel reload');
    check(el('tabSettingsBtn').getAttribute('aria-label') === 'Настройки', 'Gear tooltip/accessibility are translated');
    check(el('savePrompt').textContent === 'Сохранить' && el('modalPromptTitle').textContent === 'Редактирование промпта', 'Open dialog is translated');
    check(el('promptText').value === 'Unsaved <script>draft</script> {{text}}', 'Unsaved prompt draft is preserved');
    check(el('syncPassphrase').value === 'test-password-not-a-real-secret' && el('syncToken').value === 'test-token-not-a-real-secret' && el('syncGistId').value === 'unsaved-gist', 'Sync credentials and connection draft are preserved');
    check(el('promptSearch').value === 'Save' && el('foldersList').querySelector('.active .name').textContent === 'Copy', 'Search and selected folder survive switching');
    check(JSON.stringify(win.fixtureData.folders) === original, 'Switch does not modify stored prompt data');
    check(el('promptsList').querySelector('.title').textContent === 'Save' && !el('promptsList').querySelector('b'), 'User text is escaped and not translated');
    check(!/[A-Za-z]{4}/.test(el('syncStatusTitle').textContent), 'Sync status is translated');
    check(el('syncStatus').dataset.state === 'idle', 'Localized idle status keeps its visual state');
    check(doc.querySelector('[data-i18n-html="guide.create"]').textContent.includes('Создать секретный Gist'), 'Sync guide is translated');
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
    results.textContent = `PASS (${passed.length} checks)\n` + passed.join('\n');
    window.testResult = { passed: passed.length, failed: 0 };
  } catch (error) {
    results.textContent = `FAIL after ${passed.length} checks: ${error.stack}`;
    window.testResult = { passed: passed.length, failed: 1, error: error.message };
  }
})();
