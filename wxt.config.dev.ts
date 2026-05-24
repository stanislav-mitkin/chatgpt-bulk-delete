import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'http://localhost:3333/*',
    ],
  },
});
