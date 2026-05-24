# ChatGPT Keyboard Bulk Delete

Minimal Chrome extension for bulk-deleting ChatGPT conversations via keyboard. No popups, no buttons — just hotkeys.

## Hotkeys

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Shift + X` | Enter / exit selection mode |
| `J` / `↓` | Move cursor down |
| `K` / `↑` | Move cursor up |
| `Space` | Toggle selection on current chat |
| `Shift + J/K` | Extend selection (range) |
| `Cmd/Ctrl + A` | Select all visible chats |
| `Cmd/Ctrl + D` | Clear selection |
| `Enter` × 2 | Delete selected (press once → confirm, press again within 2s → delete) |
| `Esc` | Exit selection mode |

## Install (development)

```bash
pnpm install
pnpm build          # builds to .output/chrome-mv3/
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select `.output/chrome-mv3/`.

## How it works

- Detects chat links (`a[href^="/c/"]`) in the sidebar via MutationObserver
- Deletion: `PATCH /backend-api/conversation/{id}` with `{is_visible: false}` — same as the official UI
- Token fetched from `/api/auth/session` (uses existing session cookies, no extra login)
- Optimistic UI: rows disappear immediately, restored on API failure
- All styles isolated via Shadow DOM (overlay) and unique CSS class prefix `cbd-`

## Selector maintenance

If ChatGPT changes its DOM structure, update `buildChatList()` in [`modules/chat-list.ts`](modules/chat-list.ts).

## Testing

Tests use real Chrome with the extension loaded against live chatgpt.com.

**First time setup** (saves your session once):
```bash
pnpm auth     # opens Chrome → log in → close window
```

**Run tests:**
```bash
pnpm test
```

> ⚠️ **Run sparingly.** Each test run opens real ChatGPT pages.
> Frequent automated requests may trigger bot detection or CAPTCHA.
> Run only when verifying selectors after a ChatGPT UI update.
