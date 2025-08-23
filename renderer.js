/* global CodeMirror */
const editorElem = document.getElementById('editor');
const status = document.getElementById('status');
const pass = document.getElementById('pass');

const cm = CodeMirror.fromTextArea(editorElem, {
  mode: 'markdown',
  theme: 'neo',
  lineNumbers: true,
  lineWrapping: true
});

let currentPath = null;
let dirty = false;

function setStatus(text) { status.textContent = text; }

function setDirty(flag) {
  dirty = flag;
  document.title = `EncryptPad${dirty ? ' *' : ''}${currentPath ? ' — ' + currentPath : ''}`;
}

cm.on('change', () => setDirty(true));

async function applySystemTheme() {
  const { shouldUseDarkColors } = await window.api.getTheme();
  cm.setOption('theme', shouldUseDarkColors ? 'neo' : 'neo'); // same theme but colors follow CSS vars
}
applySystemTheme();

// Actions
async function doNew() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  cm.setValue('');
  currentPath = null;
  setDirty(false);
  setStatus('New document');
}

async function doOpen() {
  const res = await window.api.openFile();
  if (res?.canceled) return;
  cm.setValue(res.content);
  currentPath = res.filePath;
  setDirty(false);
  setStatus(`Opened: ${res.filePath}`);
}

async function doSave(as = false) {
  const content = cm.getValue();
  const res = await window.api.saveFile({ content, filePath: as ? null : currentPath });
  if (res?.canceled) return;
  currentPath = res.filePath;
  setDirty(false);
  setStatus(`Saved: ${res.filePath}`);
}

async function doEncrypt() {
  const text = cm.getValue();
  const pwd = pass.value;
  if (!pwd) { alert('Enter a passphrase'); return; }
  setStatus('Encrypting…');
  try {
    const armored = await window.api.encryptText(text, pwd);
    cm.setValue(armored);
    setDirty(true);
    setStatus('Encrypted (ASCII armored). Consider saving as .asc');
  } catch (e) {
    console.error(e);
    alert('Encryption failed: ' + e.message);
    setStatus('Encryption failed');
  }
}

async function doDecrypt() {
  const armored = cm.getValue();
  const pwd = pass.value;
  if (!pwd) { alert('Enter a passphrase'); return; }
  setStatus('Decrypting…');
  try {
    const plain = await window.api.decryptText(armored, pwd);
    cm.setValue(plain);
    setDirty(true);
    setStatus('Decrypted');
  } catch (e) {
    console.error(e);
    alert('Decryption failed: ' + e.message + '\nMake sure the passphrase is correct and content is PGP armored.');
    setStatus('Decryption failed');
  }
}

// Wire toolbar buttons
document.getElementById('btn-new').addEventListener('click', () => doNew());
document.getElementById('btn-open').addEventListener('click', () => doOpen());
document.getElementById('btn-save').addEventListener('click', () => doSave(false));
document.getElementById('btn-saveas').addEventListener('click', () => doSave(true));
document.getElementById('btn-encrypt').addEventListener('click', () => doEncrypt());
document.getElementById('btn-decrypt').addEventListener('click', () => doDecrypt());

// Menu accelerator events
window.api.onAction((key) => {
  if (key === 'new') doNew();
  if (key === 'open') doOpen();
  if (key === 'save') doSave(false);
  if (key === 'saveAs') doSave(true);
  if (key === 'encrypt') doEncrypt();
  if (key === 'decrypt') doDecrypt();
});

// Warn on close if dirty
window.addEventListener('beforeunload', (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});
