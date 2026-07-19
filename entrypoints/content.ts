import { chatgptAdapter } from '../adapter/chatgpt';
import { initSelection, refreshClasses } from '../core/selection';
import { initKeybindings, destroyKeybindings } from '../core/keybindings';
import { injectStyles, removeStyles } from '../core/style-injector';
import { initOverlay, destroyOverlay, revealTab } from '../core/overlay';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  main() {
    injectStyles(chatgptAdapter.styles);
    initOverlay();
    initSelection(chatgptAdapter.chatList, chatgptAdapter.sidebarSelector);

    chatgptAdapter.waitUntilReady(() => {
      chatgptAdapter.chatList.init();
      initKeybindings(chatgptAdapter);
      chatgptAdapter.chatList.onChatListChange((chats) => {
        refreshClasses();
        if (chats.length > 0) revealTab();
      });
      if (chatgptAdapter.chatList.getChatList().length > 0) revealTab();
    });

    return () => {
      destroyKeybindings();
      chatgptAdapter.chatList.destroy();
      destroyOverlay();
      removeStyles();
    };
  },
});
