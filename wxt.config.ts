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
    ],
  },
});
