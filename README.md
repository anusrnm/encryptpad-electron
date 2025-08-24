# EncryptPad (Electron, ESM)

A minimal, offline-first, EncryptPad-like editor using **Electron (ES Modules)**, **local CodeMirror** as the text editor, and **OpenPGP.js (v5)** for password-based encryption/decryption.

## What's new
- **Exit fix**: safe close/quit handshake so the app exits cleanly even after opening a file, while still warning about unsaved changes.
- **Settings** (`Ctrl/Cmd+,`): theme (System/Light/Dark), font family/size, and crypto options (AES-128/192/256, AEAD on/off, zlib/zip/none, S2K iterations).
- **Status bar**: file name, modified flag, line/column, word count, encoding, and crypto selections.
- **Responsive UI**: mobile-friendly controls (44px targets), compact toolbar on narrow windows.

## Shortcuts
- New: `Ctrl/Cmd + N`
- Open: `Ctrl/Cmd + O`
- Save: `Ctrl/Cmd + S`
- Save As: `Ctrl/Cmd + Shift + S`
- Encrypt: `Ctrl/Cmd + E`
- Decrypt: `Ctrl/Cmd + D`
- Settings: `Ctrl/Cmd + ,`

## Quick Start

```bash
npm install
npm start
```

## Crypto notes
- Uses OpenPGP symmetric encryption (password-based). You can tweak symmetric algorithm, compression, enable AEAD protection, and adjust S2K iteration count under **Settings**.
- Encrypted output is ASCII-armored; you can save as `.asc`. Decrypt expects valid armored data and the correct passphrase.
