const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

function createWorker(syncConfig, fetchImpl) {
  const saved = syncConfig ? { syncConfig: structuredClone(syncConfig) } : {};
  const handlers = {};
  const requests = [];
  const event = name => ({ addListener: fn => { handlers[name] = fn; } });
  const context = vm.createContext({
    console,
    fetch: async (url, options) => { requests.push({ url, options }); return fetchImpl(url, options); },
    chrome: {
      runtime: { getManifest: () => ({ version: '2.17.0' }), onInstalled: event('installed'), onMessage: event('message') },
      storage: {
        local: {
          get: async defaults => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, key in saved ? structuredClone(saved[key]) : value])),
          set: async patch => { Object.assign(saved, structuredClone(patch)); },
          remove: async key => { delete saved[key]; }
        },
        onChanged: event('storage')
      },
      sidePanel: { setPanelBehavior: async () => {} },
      contextMenus: { removeAll: async () => {}, create: () => {}, onClicked: event('click') }
    }
  });
  context.importScripts = file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const send = message => new Promise(resolve => {
    assert.equal(handlers.message(message, {}, resolve), true, 'message must be handled asynchronously');
  });
  return { saved, requests, send };
}

const reply = (status, body = {}) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) });
const gistWithData = { id: 'g1', files: { 'simplestprompt-data.json': { content: '{"x":1}' } }, history: [{ version: 'rev-1' }] };

// Catches a rejected (e.g. expired) token silently replacing a working connection.
test('a rejected token is not saved and the error tells the user to create a new token', async () => {
  const old = { token: 'old-token', passphrase: 'old-pass', gistId: 'g1', lastRemoteRevision: 'rev-1' };
  const worker = createWorker(old, async () => reply(401, { message: 'Bad credentials' }));
  const answer = await worker.send({ action: 'syncSaveConfig', token: 'expired-token', passphrase: 'new-pass', gistId: 'g1' });
  assert.equal(answer.success, false);
  assert.equal(answer.error, 'GitHub rejected the token. It may have expired. Create a new token and enter it above.');
  assert.deepEqual(worker.saved.syncConfig, old);
  assert.equal(worker.requests[0].options.headers.Authorization, 'Bearer expired-token');
});

test('an accepted connection is saved locally, including the password', async () => {
  const worker = createWorker(null, async () => reply(200, gistWithData));
  const answer = await worker.send({ action: 'syncSaveConfig', token: '  tok  ', passphrase: 'pass', gistId: ' g1 ' });
  assert.equal(answer.success, true);
  assert.deepEqual(worker.saved.syncConfig, { token: 'tok', passphrase: 'pass', gistId: 'g1', lastRemoteRevision: '', lastLocalHash: '', lastSyncAt: '' });
  const state = (await worker.send({ action: 'syncGetState' })).state;
  assert.equal(state.hasToken, true);
  assert.equal(state.passphrase, 'pass');
  assert.equal(state.gistId, 'g1');
});

// Catches empty fields wiping the saved secrets when only the Gist URL is changed or re-entered.
test('empty token and password keep the saved ones; a different Gist resets sync history', async () => {
  const saved = { token: 'tok', passphrase: 'pass', gistId: 'g1', lastRemoteRevision: 'rev-1', lastLocalHash: 'h', lastSyncAt: 'then' };
  const same = createWorker(saved, async () => reply(200, gistWithData));
  await same.send({ action: 'syncSaveConfig', token: '', passphrase: '', gistId: 'g1' });
  assert.deepEqual(same.saved.syncConfig, saved);
  assert.equal(same.requests[0].options.headers.Authorization, 'Bearer tok');
  const other = createWorker(saved, async () => reply(200, { ...gistWithData, id: 'g2' }));
  await other.send({ action: 'syncSaveConfig', token: '', passphrase: '', gistId: 'g2' });
  assert.equal(other.saved.syncConfig.token, 'tok');
  assert.equal(other.saved.syncConfig.gistId, 'g2');
  assert.equal(other.saved.syncConfig.lastRemoteRevision, '');
  assert.equal(other.saved.syncConfig.lastLocalHash, '');
});

test('missing token or password is rejected before any request', async () => {
  const worker = createWorker(null, async () => { throw new Error('no request expected'); });
  assert.equal((await worker.send({ action: 'syncSaveConfig', token: '', passphrase: 'p', gistId: '' })).error, 'Enter a GitHub token first.');
  assert.equal((await worker.send({ action: 'syncSaveConfig', token: 't', passphrase: '', gistId: '' })).error, 'Enter the encryption passphrase first.');
  assert.equal(worker.requests.length, 0);
});

test('an empty Gist URL only validates the token and saves no Gist', async () => {
  const worker = createWorker(null, async () => reply(200, []));
  const answer = await worker.send({ action: 'syncSaveConfig', token: 't', passphrase: 'p', gistId: '' });
  assert.equal(answer.success, true);
  assert.match(worker.requests[0].url, /\/gists\?per_page=1$/);
  assert.equal(worker.saved.syncConfig.gistId, '');
});

test('a missing Gist gives a clear message', async () => {
  const worker = createWorker(null, async () => reply(404, { message: 'Not Found' }));
  const answer = await worker.send({ action: 'syncSaveConfig', token: 't', passphrase: 'p', gistId: 'nope' });
  assert.equal(answer.error, 'The Gist was not found. Check the Gist URL.');
  assert.equal(worker.saved.syncConfig, undefined);
});

// Catches the first sync failing on a freshly created Gist that has no SimplestPrompt file yet.
test('a Gist without the sync file is reported as empty, not as an error', async () => {
  const worker = createWorker({ token: 't', passphrase: 'p', gistId: 'g1' }, async () => reply(200, { id: 'g1', files: { 'notes.txt': { content: 'hi' } }, history: [{ version: 'rev-0' }] }));
  const answer = await worker.send({ action: 'syncFetch' });
  assert.equal(answer.success, true);
  assert.equal(answer.remote.empty, true);
  assert.equal(answer.remote.revision, 'rev-0');
  const withData = createWorker({ token: 't', passphrase: 'p', gistId: 'g1' }, async () => reply(200, gistWithData));
  const full = await withData.send({ action: 'syncFetch' });
  assert.equal(full.remote.empty, undefined);
  assert.equal(full.remote.content, '{"x":1}');
});

test('disconnect removes the token, password and Gist', async () => {
  const worker = createWorker({ token: 't', passphrase: 'p', gistId: 'g1' }, async () => reply(200, {}));
  assert.equal((await worker.send({ action: 'syncClear' })).success, true);
  assert.equal(worker.saved.syncConfig, undefined);
  assert.equal((await worker.send({ action: 'syncGetState' })).state.passphrase, '');
});

test('background source no longer contains the diagnostic feature', () => {
  const source = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
  assert(!/diagnos/i.test(source));
});
