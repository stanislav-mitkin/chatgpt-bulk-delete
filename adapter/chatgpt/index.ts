import type { ChatAdapter } from '../../core/types';
import { initChatList, destroyChatList, getChatList, onChatListChange, extractIdFromHref } from './chat-list';
import { deleteConversations } from './deleter';
import { CHATGPT_STYLES } from './styles';

const CHAT_ROW_SELECTOR = 'nav[aria-label="Chat history"] a[data-sidebar-item="true"][href*="/c/"], nav a[href*="/c/"], aside a[href*="/c/"]';
const SIDEBAR_SELECTOR = 'nav[aria-label="Chat history"]';

// Calls `cb` once the sidebar (nav/aside) has appeared and is safe to observe.
function waitUntilReady(cb: () => void) {
  const ready = () => document.querySelector('nav, aside');
  if (ready()) { cb(); return; }
  const mo = new MutationObserver(() => {
    if (ready()) {
      mo.disconnect();
      cb();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

export const chatgptAdapter: ChatAdapter = {
  chatList: {
    init: initChatList,
    destroy: destroyChatList,
    getChatList,
    onChatListChange,
  },
  deleter: { deleteConversations },
  styles: CHATGPT_STYLES,
  chatRowSelector: CHAT_ROW_SELECTOR,
  sidebarSelector: SIDEBAR_SELECTOR,
  extractId: (el) => extractIdFromHref((el as HTMLAnchorElement).getAttribute('href') || ''),
  getRow: (el) => (el.closest('li') as HTMLElement | null) ?? el.parentElement as HTMLElement ?? el,
  waitUntilReady,
};
