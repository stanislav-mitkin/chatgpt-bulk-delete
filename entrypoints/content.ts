export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  main() {
    console.log('[ChatGPT Bulk Delete] Content script loaded');
  },
});
