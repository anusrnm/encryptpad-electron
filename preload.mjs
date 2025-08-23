import { contextBridge, ipcRenderer } from 'electron';
import * as openpgp from 'openpgp';

async function encryptText(text, password) {
  const message = await openpgp.createMessage({ text });
  const encrypted = await openpgp.encrypt({
    message,
    passwords: [password],
    format: 'armored',
    config: {
      // You can tweak algorithms here if needed
    }
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
  // Menu-driven actions
  onAction: (cb) => {
    ipcRenderer.removeAllListeners('action:new');
    ipcRenderer.removeAllListeners('action:open');
    ipcRenderer.removeAllListeners('action:save');
    ipcRenderer.removeAllListeners('action:saveAs');
    ipcRenderer.removeAllListeners('action:encrypt');
    ipcRenderer.removeAllListeners('action:decrypt');
    ['new','open','save','saveAs','encrypt','decrypt'].forEach(key=>{
      ipcRenderer.on(`action:${key}`, () => cb(key));
    });
  }
});
