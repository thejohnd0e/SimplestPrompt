const SYNC_SCHEMA_VERSION = 1;
const SYNC_KDF_ITERATIONS = 310000;
const SYNC_AAD = new TextEncoder().encode('SimplestPrompt encrypted sync v1');

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveSyncKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: SYNC_KDF_ITERATIONS,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptSyncData(data, passphrase) {
  if (!passphrase) throw new Error('Encryption passphrase is required.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveSyncKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: SYNC_AAD },
    key,
    plaintext
  );
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    format: 'simplestprompt-encrypted',
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: SYNC_KDF_ITERATIONS,
      salt: bytesToBase64(salt)
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv)
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

async function decryptSyncData(envelope, passphrase) {
  if (!passphrase) throw new Error('Encryption passphrase is required.');
  if (!envelope || envelope.format !== 'simplestprompt-encrypted' || envelope.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new Error('Unsupported or invalid encrypted sync format.');
  }
  const salt = base64ToBytes(envelope.kdf && envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher && envelope.cipher.iv);
  const key = await deriveSyncKey(passphrase, salt);
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: SYNC_AAD },
      key,
      base64ToBytes(envelope.ciphertext)
    );
  } catch (error) {
    throw new Error('Unable to decrypt sync data. Check the passphrase.');
  }
  try {
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (error) {
    throw new Error('Decrypted sync data is invalid.');
  }
}

async function hashSyncData(data) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
  return bytesToBase64(new Uint8Array(digest));
}
