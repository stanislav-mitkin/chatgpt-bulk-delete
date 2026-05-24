import { initChatList, onChatListChange, destroyChatList } from '../modules/chat-list';
import { initKeybindings, destroyKeybindings } from '../modules/keybindings';
import { injectStyles, removeStyles } from '../modules/styles';
import { refreshClasses } from '../modules/selection';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  main() {
    injectStyles();

    waitForSidebar(() => {
      initChatList();
      initKeybindings();

      // Re-apply selection classes when the chat list updates (pagination, new chats)
      onChatListChange(() => refreshClasses());
    });

    return () => {
      destroyKeybindings();
      destroyChatList();
      removeStyles();
    };
  },
});

function waitForSidebar(cb: () => void) {
  if (document.querySelector('nav, aside')) { cb(); return; }
  const mo = new MutationObserver(() => {
    if (document.querySelector('nav, aside')) { mo.disconnect(); cb(); }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
