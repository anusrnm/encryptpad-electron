import { contextBridge, ipcRenderer } from 'electron';
import * as openpgp from 'openpgp';

// Map simple strings to openpgp enums
const SYMMETRIC = {
  aes128: openpgp.enums.symmetric.aes128,
  aes192: openpgp.enums.symmetric.aes192,
  aes256: openpgp.enums.symmetric.aes256
};
const COMPRESSION = {
  uncompressed: openpgp.enums.compression.uncompressed,
  zip: openpgp.enums.compression.zip,
  zlib: openpgp.enums.compression.zlib
};

async function encryptText(text, password, options) {
  const message = await openpgp.createMessage({ text });
  const config = {
    preferredSymmetricAlgorithm: SYMMETRIC[options?.symmetric || 'aes256'],
    aeadProtect: options?.aead ?? true,
    preferredCompressionAlgorithm: COMPRESSION[options?.compression || 'zlib'],
  };
  const encrypted = await openpgp.encrypt({
    message,
    passwords: [password],
    format: 'armored',
    config
  });
  return encrypted;
}

async function decryptText(armored, password) {
  const message = await openpgp.readMessage({ armoredMessage: armored });
  const { data } = await openpgp.decrypt({
    message,
    passwords: [password],
    format: 'utf8'
  });
  return data;
}

contextBridge.exposeInMainWorld('api', {
  // File
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  // Crypto
  encryptText,
  decryptText,
  // Theme
  getTheme: () => ipcRenderer.invoke('app:theme'),
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (partial) => ipcRenderer.invoke('settings:set', partial),
  // Menu-driven actions & lifecycle
  onAction: (cb) => {
    ['new','open','save','saveAs','settings'].forEach(key=>{
      ipcRenderer.removeAllListeners(`action:${key}`);
      ipcRenderer.on(`action:${key}`, () => cb(key));
    });
  },
  onRequestClose: (cb) => {
    ipcRenderer.removeAllListeners('app:request-close');
    ipcRenderer.on('app:request-close', cb);
  },
  confirmClose: (ok) => ipcRenderer.send('app:confirm-close', ok)
});
