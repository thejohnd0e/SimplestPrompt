/* Test-only Chrome API boundary. No real extension storage or GitHub requests. */
window.fixtureData = {
  language: 'en',
  folders: [{ id: 'folder', name: 'Copy', prompts: [{ id: 'prompt', title: 'Save', text: '<b>User content</b>' }] }],
  aiTargets: [{ id: 'ai', name: 'Edit', baseUrl: 'https://example.com/', queryParam: 'q=', usePasteFallback: true }],
  selectionPrompts: [{ id: 'selection', name: 'Copy', template: '{{text}}' }]
};
const storageListeners = [];
window.fixtureMessages = [];
window.fixtureAlerts = [];
window.fixtureSaveError = '';
window.fixtureRemote = { empty: true, content: '', revision: 'rev-0' };
window.fixtureSyncState = { hasToken: false, passphrase: '', gistId: '', revision: '', localHash: '', lastSyncAt: '' };
window.alert = message => fixtureAlerts.push(message);
Object.assign(window.chrome, {
  storage: {
    local: {
      get: async defaults => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, key in fixtureData ? structuredClone(fixtureData[key]) : value])),
      set: async patch => {
        const changes = {};
        for (const [key, value] of Object.entries(patch)) {
          changes[key] = { oldValue: fixtureData[key], newValue: structuredClone(value) };
          fixtureData[key] = structuredClone(value);
        }
        for (const listener of storageListeners) await listener(changes, 'local');
      }
    },
    onChanged: { addListener: listener => storageListeners.push(listener) }
  },
  runtime: {
    getManifest: () => ({ version: '2.16.2', version_name: '2.16.2' }),
    sendMessage: (message, callback) => {
      fixtureMessages.push(message);
      let response = { success: true };
      if (message.action === 'getAutoPaste') response = { autoPaste: false };
      if (message.action === 'syncGetState') response.state = structuredClone(fixtureSyncState);
      if (message.action === 'syncSaveConfig') {
        if (fixtureSaveError) response = { success: false, error: fixtureSaveError };
        else fixtureSyncState = { hasToken: true, passphrase: message.passphrase, gistId: message.gistId, revision: '', localHash: '', lastSyncAt: '' };
      }
      if (message.action === 'syncFetch') response.remote = structuredClone(fixtureRemote);
      if (message.action === 'syncUpdate') {
        window.fixtureRemote = { content: message.content, revision: 'updated-revision' };
        response.conflict = false;
        response.revision = 'updated-revision';
      }
      if (message.action === 'syncClear') fixtureSyncState = { hasToken: false, passphrase: '', gistId: '', revision: '', localHash: '', lastSyncAt: '' };
      if (message.action === 'syncCreate') {
        fixtureSyncState.gistId = 'new-created-gist';
        window.fixtureRemote = { content: message.content, revision: 'created-revision' };
        response.revision = 'created-revision';
      }
      if (message.action === 'syncMarkRevision') {
        fixtureSyncState.revision = message.revision;
        fixtureSyncState.localHash = message.localHash;
      }
      if (callback) callback(response);
      return Promise.resolve(response);
    }
  }
});
