---
name: auth-setup
description: Saves a ChatGPT session for Playwright tests. Run once before first test run, or when the session expires. Opens a real Chrome window — user must log in manually then close it.
disable-model-invocation: true
---

Run the Playwright auth setup to save a ChatGPT session to `test-profile/`:

```bash
playwright test --config playwright.auth.config.ts
```

This opens a real Chrome window. Log in to chatgpt.com, then close the window. The session is saved to `test-profile/` (gitignored) and reused by `pnpm test`.

Only needed once, or when tests start failing with login/auth errors.
