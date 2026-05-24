import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'ChatGPT Keyboard Bulk Delete',
    description: 'Keyboard-driven bulk delete for ChatGPT conversations',
    version: '0.1.0',
    permissions: [],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'http://localhost:3333/*',
    ],
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
