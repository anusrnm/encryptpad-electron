# EncryptPad (Electron, ESM)

A minimal, offline-first, EncryptPad-like editor using **Electron (ES Modules)**, **local CodeMirror** as the text editor, and **OpenPGP.js (latest v5.x)** for password-based encryption/decryption.

## Features
- Electron app using ESM (`type: "module"`)
- Local CodeMirror (no CDN) for editing (Markdown mode enabled)
- Password-based symmetric encryption/decryption with OpenPGP (ASCII-armored)
- Follows **system light/dark theme** via `prefers-color-scheme`
- Handy keyboard shortcuts:
  - **New**: `Ctrl/Cmd + N`
  - **Open**: `Ctrl/Cmd + O`
  - **Save**: `Ctrl/Cmd + S`
  - **Save As**: `Ctrl/Cmd + Shift + S`
  - **Encrypt**: `Ctrl/Cmd + E`
  - **Decrypt**: `Ctrl/Cmd + D`

## Quick Start

```bash
npm install
npm start
```

> Tip: In development, the renderer loads CodeMirror files from `./node_modules/codemirror/...` using `file://` paths. This keeps everything local without a separate bundler.

## Notes

- **OpenPGP** is imported in the **preload** (Node/Electron side) and exposed to the renderer through a safe API, keeping the renderer code simple and avoiding bare imports in the browser context.
- This project follows the **system theme** automatically. The CodeMirror theme is `neo`, with colors adapting via CSS variables.
- Saving encrypted content will typically produce an armored block (e.g. save as `.asc`). Decryption expects a valid ASCII-armored PGP message and the correct passphrase.
- For packaging/production, consider using a bundler and copying assets instead of referencing `node_modules` directly.

## License
MIT
