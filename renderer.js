/* global CodeMirror */
const editorElem = document.getElementById('editor');
const sbLeft = document.getElementById('sb-left');
const sbRight = document.getElementById('sb-right');
const pass = document.getElementById('pass');
const settingsDialog = document.getElementById('settingsDialog');
const settingsForm = document.getElementById('settingsForm');

const cm = CodeMirror.fromTextArea(editorElem, {
  mode: 'markdown',
  theme: 'neo',
  lineNumbers: true,
  lineWrapping: true
});

let currentPath = null;
let dirty = false;
let settings = await window.api.getSettings();

function updateThemeVars() {
  const root = document.documentElement;
  const theme = settings.theme || 'system';
  root.setAttribute('data-theme', theme);
  if (theme === 'system') root.setAttribute('data-theme', 'system'); // defer to media
  root.style.setProperty('--editor-font-size', `${settings.fontSize || 15}px`);
  root.style.setProperty('--editor-font-family', settings.fontFamily === 'ui-monospace' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto');
}
updateThemeVars();

function setDirty(flag) {
  dirty = flag;
  document.title = `EncryptPad${dirty ? ' *' : ''}${currentPath ? ' — ' + currentPath : ''}`;
  refreshStatusBar();
}

function refreshStatusBar() {
  const doc = cm.getDoc();
  const cursor = doc.getCursor();
  const line = cursor.line + 1;
  const col = cursor.ch + 1;
  const text = doc.getValue();
  const words = (text.trim().match(/\S+/g) || []).length;
  const crypto = settings.crypto || {};
  const cryptoStr = `${crypto.symmetric?.toUpperCase() || 'AES256'}${crypto.aead ? '+AEAD' : ''}/${(crypto.compression||'zlib')}`;
  sbLeft.textContent = `${currentPath || 'Untitled'} ${dirty ? '(modified)' : ''}`.trim();
  sbRight.textContent = `Ln ${line}, Col ${col} | ${words} words | UTF-8 | ${cryptoStr}`;
}

cm.on('cursorActivity', refreshStatusBar);
cm.on('change', () => setDirty(true));

// System theme hint (for system mode only)
async function applySystemThemeHint() {
  const { shouldUseDarkColors } = await window.api.getTheme();
  // we keep 'neo' theme but CSS vars swap colors; nothing else needed
}
applySystemThemeHint();

// Actions
async function doNew() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  cm.setValue('');
  currentPath = null;
  setDirty(false);
}

async function doOpen() {
  const res = await window.api.openFile();
  if (res?.canceled) return;
  cm.setValue(res.content);
  currentPath = res.filePath;
  setDirty(false);
}

async function doSave(as = false) {
  const content = cm.getValue();
  const res = await window.api.saveFile({ content, filePath: as ? null : currentPath });
  if (res?.canceled) return;
  currentPath = res.filePath;
  setDirty(false);
}

async function doEncrypt() {
  const text = cm.getValue();
  const pwd = pass.value;
  if (!pwd) { alert('Enter a passphrase'); return; }
  try {
    const armored = await window.api.encryptText(text, pwd, settings.crypto);
    cm.setValue(armored);
    setDirty(true);
  } catch (e) {
    console.error(e);
    alert('Encryption failed: ' + e.message);
  }
}

async function doDecrypt() {
  const armored = cm.getValue();
  const pwd = pass.value;
  if (!pwd) { alert('Enter a passphrase'); return; }
  try {
    const plain = await window.api.decryptText(armored, pwd);
    cm.setValue(plain);
    setDirty(true);
  } catch (e) {
    console.error(e);
    alert('Decryption failed: ' + e.message + '\nMake sure the passphrase is correct and content is PGP armored.');
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
  if (key === 'settings') openSettings();
});

// Safe-close handshake to avoid "won't exit" issues
window.api.onRequestClose(async () => {
  if (dirty) {
    const ok = confirm('You have unsaved changes. Quit anyway?');
    window.api.confirmClose(ok);
  } else {
    window.api.confirmClose(true);
  }
});

// Settings modal
document.getElementById('btn-settings').addEventListener('click', () => openSettings());

function openSettings() {
  // populate form
  settingsForm.theme.value = settings.theme || 'system';
  settingsForm.fontFamily.value = settings.fontFamily || 'system-ui';
  settingsForm.fontSize.value = settings.fontSize || 15;
  settingsForm.symmetric.value = settings.crypto?.symmetric || 'aes256';
  settingsForm.compression.value = settings.crypto?.compression || 'zlib';
  settingsForm.aead.value = String(settings.crypto?.aead ?? true);
  settingsForm.s2kIterationCount.value = settings.crypto?.s2kIterationCount ?? 65536;
  settingsDialog.showModal();
}

settingsForm.addEventListener('close', async (e) => {
  // no-op: dialog 'close' doesn't fire reliably for <form method="dialog">
});

settingsForm.addEventListener('submit', (e) => e.preventDefault());

settingsDialog.addEventListener('close', async () => {
  if (settingsDialog.returnValue !== 'save') return;
  const form = new FormData(settingsForm);
  const next = {
    theme: form.get('theme'),
    fontFamily: form.get('fontFamily'),
    fontSize: Number(form.get('fontSize')) || 15,
    crypto: {
      symmetric: form.get('symmetric'),
      compression: form.get('compression'),
      aead: form.get('aead') === 'true',
      s2kIterationCount: Number(form.get('s2kIterationCount')) || 65536
    }
  };
  settings = await window.api.setSettings(next);
  updateThemeVars();
  cm.refresh();
  refreshStatusBar();
});

// Initial status
setDirty(false);
