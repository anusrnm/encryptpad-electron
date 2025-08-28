import { defineConfig } from 'vite';

import path from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html'
    }
  },
  root: '.',
  resolve: {
    alias: {
      '@codemirror/state': path.resolve(__dirname, 'node_modules/@codemirror/state'),
      '@codemirror/view': path.resolve(__dirname, 'node_modules/@codemirror/view'),
      '@codemirror/basic-setup': path.resolve(__dirname, 'node_modules/@codemirror/basic-setup'),
      '@codemirror/lang-markdown': path.resolve(__dirname, 'node_modules/@codemirror/lang-markdown'),
      '@codemirror/commands': path.resolve(__dirname, 'node_modules/@codemirror/commands'),
      // add more codemirror packages here if needed
    }
  }
});
