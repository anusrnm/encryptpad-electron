/* global CodeMirror */
const editorElem = document.getElementById('editor');
const sbLeft = document.getElementById('sb-left');
const sbRight = document.getElementById('sb-right');
const pass = document.getElementById('pass');
const settingsDialog = document.getElementById('settingsDialog');
const settingsForm = document.getElementById('settingsForm');
const btnCancel = settingsForm.querySelector('button[value="cancel"]');
const btnSave = settingsForm.querySelector('button[value="save"]');
const defaultFontSize = 12;


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
  root.style.setProperty('--editor-font-size', `${settings.fontSize || defaultFontSize}px`);
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
  const passphrase = await askPassphrase("Enter passphrase to decrypt (leave blank if plain text):");
  if (passphrase) {
    try {
      const plain = await window.api.decryptText(res.content, passphrase);
      res.content = plain;
    } catch (e) {
      alert('Decryption failed: ' + e.message + '\nMake sure the passphrase is correct and content is PGP armored.');
      return;
    }
  }
  cm.setValue(res.content);
  currentPath = res.filePath;
  setDirty(false);
}

async function doSave(as = false) {
  let content = cm.getValue();
  const passphrase = await askPassphrase("Enter passphrase to encrypt (leave blank for plain text):");
  if (passphrase) {
    try {
      content = await window.api.encryptText(content, passphrase, settings.crypto);
    } catch (e) {
      alert("Encryption failed: " + e.message);
      return;
    }
  }
  const res = await window.api.saveFile({ content, filePath: as ? null : currentPath });
  if (res?.canceled) return;
  currentPath = res.filePath;
  setDirty(false);
}

// Menu accelerator events
window.api.onAction((key) => {
  if (key === 'new') doNew();
  if (key === 'open') doOpen();
  if (key === 'save') doSave(false);
  if (key === 'saveAs') doSave(true);
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

function openSettings() {
  // populate form
  settingsForm.theme.value = settings.theme || 'system';
  settingsForm.fontFamily.value = settings.fontFamily;
  settingsForm.fontSize.value = settings.fontSize || defaultFontSize;
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
    fontSize: Number(form.get('fontSize')) || defaultFontSize,
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

btnCancel.addEventListener('click', (e) => {
  settingsDialog.close("cancel");
});

btnSave.addEventListener('click', (e) => {
  settingsDialog.close("save");
});

async function askPassphrase(title) {
  return new Promise((resolve) => {
    const dlg = document.getElementById('passphraseDialog');
    const form = document.getElementById('passphraseForm');
    const input = document.getElementById('passphraseInput');
    document.getElementById('passphraseTitle').textContent = title;
    input.value = '';


    function cleanup() {
      dlg.removeEventListener('close', onClose);
    }
    function onClose() {
      cleanup();
      resolve(dlg.returnValue === 'ok' ? input.value : null);
    }


    dlg.addEventListener('close', onClose);
    dlg.showModal();
  });
}

// Initial status
setDirty(false);
