export interface ChatItem {
  id: string;
  element: HTMLAnchorElement;
  title: string;
}

type ChangeCallback = (chats: ChatItem[]) => void;

let chats: ChatItem[] = [];
let observer: MutationObserver | null = null;
const listeners: ChangeCallback[] = [];

// Extracts conversation ID from any href form:
//   https://chatgpt.com/c/abc-123   (real site — full URL)
//   /c/abc-123                       (mock page — relative)
export function extractIdFromHref(href: string): string | null {
  const match = href.match(/\/c\/([a-zA-Z0-9_-]{8,})/);
  return match ? match[1] : null;
}

function buildChatList(): ChatItem[] {
  // Primary: chat anchors inside the Chat history nav.
  // Real ChatGPT: data-sidebar-item="true" + href contains /c/ (excludes Home, Projects, etc.)
  const byAttr = document.querySelectorAll<HTMLAnchorElement>(
    'nav[aria-label="Chat history"] a[data-sidebar-item="true"][href*="/c/"]'
  );
  if (byAttr.length > 0) return parseLinkList(byAttr);

  // Fallback 1: any anchor inside nav/aside containing /c/{id} in href
  const byNav = document.querySelectorAll<HTMLAnchorElement>(
    'nav a[href*="/c/"], aside a[href*="/c/"]'
  );
  if (byNav.length > 0) return parseLinkList(byNav);

  // Fallback 2: any anchor on the page (dev/mock environments)
  return parseLinkList(document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]'));
}

function parseLinkList(links: NodeListOf<HTMLAnchorElement>): ChatItem[] {
  const result: ChatItem[] = [];
  links.forEach((el) => {
    const id = extractIdFromHref(el.getAttribute('href') || '');
    if (!id) return;
    // Prefer aria-label (real site) then text content (mock)
    const title = el.getAttribute('aria-label') || el.textContent?.trim() || id;
    result.push({ id, element: el, title });
  });
  return result;
}

function refresh() {
  const next = buildChatList();
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
