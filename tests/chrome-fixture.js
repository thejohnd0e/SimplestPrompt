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
    getManifest: () => ({ version: '2.16.0', version_name: '2.16' }),
    sendMessage: (message, callback) => {
      fixtureMessages.push(message);
      let response = { success: true };
      if (message.action === 'getAutoPaste') response = { autoPaste: false };
      if (message.action === 'syncGetState') response.state = { hasToken: false, gistId: '', revision: '', localHash: '', lastSyncAt: '' };
      if (callback) callback(response);
      return Promise.resolve(response);
    }
  }
});
