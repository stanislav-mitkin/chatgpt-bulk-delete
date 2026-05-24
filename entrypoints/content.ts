import { initChatList, onChatListChange, destroyChatList } from '../modules/chat-list';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  main() {
    // ChatGPT is a SPA — sidebar may not be ready at document_idle.
    // Wait for first nav/aside to appear before initialising.
    waitForSidebar(() => {
      initChatList();

      onChatListChange((chats) => {
        console.debug('[CBD] Chat list updated:', chats.length, 'chats', chats.map((c) => c.id));
      });
    });

    return () => destroyChatList();
  },
});

function waitForSidebar(cb: () => void) {
  const sidebar = document.querySelector('nav, aside');
  if (sidebar) {
    cb();
    return;
  }

  const mo = new MutationObserver(() => {
    if (document.querySelector('nav, aside')) {
      mo.disconnect();
      cb();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
