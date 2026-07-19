// Generic contracts the UI/interaction engine (this `core/` layer) depends on.
// A site adapter (e.g. `adapter/chatgpt`) implements these to plug a specific
// chat app into the same overlay UI, selection state machine, and keybindings.

export interface ChatItem {
  id: string;
  element: HTMLElement;
  title: string;
}

export interface ChatListSource {
  init(): void;
  destroy(): void;
  getChatList(): ChatItem[];
  onChatListChange(cb: (chats: ChatItem[]) => void): void;
}

export interface DeleteResult {
  succeeded: string[];
  failed: string[];
}

export interface Deleter {
  deleteConversations(
    ids: string[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<DeleteResult>;
}

export interface ChatAdapter {
  chatList: ChatListSource;
  deleter: Deleter;

  /** Site CSS for hover/selected/sidebar-active highlight classes, injected verbatim into the page. */
  styles: string;

  /** Selector matching a single chat row's clickable element, used for click/hover event delegation. */
  chatRowSelector: string;
  /** Extracts a stable chat id from a chat row element (e.g. parsed out of its href). */
  extractId(el: HTMLElement): string | null;
  /** Row element to hide on delete / test hover containment against — may differ from the clickable element. */
  getRow(el: HTMLElement): HTMLElement;
  /** True for click targets that must not trigger selection (e.g. a per-row actions menu button). */
  isIgnoredTarget?(target: EventTarget | null): boolean;
  /** Selector for the sidebar/list container that gets the "selection mode active" highlight class. */
  sidebarSelector?: string;

  /** Calls `cb` once the chat list DOM has appeared and is safe to observe. */
  waitUntilReady(cb: () => void): void;
}
