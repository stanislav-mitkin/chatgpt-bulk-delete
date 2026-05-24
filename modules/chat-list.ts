export interface ChatItem {
  id: string;
  element: HTMLAnchorElement;
  title: string;
}

type ChangeCallback = (chats: ChatItem[]) => void;

let chats: ChatItem[] = [];
let observer: MutationObserver | null = null;
const listeners: ChangeCallback[] = [];

// Extracts conversation ID from href like /c/abc-123 or /c/abc-123?...
function extractId(href: string): string | null {
  const match = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function buildChatList(): ChatItem[] {
  // Primary: anchor links to /c/{id} inside the sidebar nav
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'nav a[href^="/c/"], aside a[href^="/c/"]'
  );

  if (links.length === 0) {
    // Fallback: any anchor matching /c/ pattern on the page
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="/c/"]');
    return parseLinkList(allLinks);
  }

  return parseLinkList(links);
}

function parseLinkList(links: NodeListOf<HTMLAnchorElement>): ChatItem[] {
  const result: ChatItem[] = [];
  links.forEach((el) => {
    const id = extractId(el.getAttribute('href') || '');
    if (!id) return;
    result.push({
      id,
      element: el,
      title: el.textContent?.trim() || id,
    });
  });
  return result;
}

function refresh() {
  const next = buildChatList();
  // Only notify if list actually changed (by IDs)
  const prevIds = chats.map((c) => c.id).join(',');
  const nextIds = next.map((c) => c.id).join(',');
  if (prevIds === nextIds) return;

  chats = next;
  listeners.forEach((cb) => cb(chats));
}

export function getChatList(): ChatItem[] {
  return chats;
}

export function onChatListChange(cb: ChangeCallback) {
  listeners.push(cb);
}

export function initChatList() {
  refresh();

  // Watch for sidebar mutations (new chats loaded, chats deleted, navigation)
  observer = new MutationObserver(() => refresh());
  observer.observe(document.body, { childList: true, subtree: true });

  console.debug('[CBD] Chat list initialized, found:', chats.length, 'chats');
}

export function destroyChatList() {
  observer?.disconnect();
  observer = null;
  chats = [];
  listeners.length = 0;
}
