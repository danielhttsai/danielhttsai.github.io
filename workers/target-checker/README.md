# TARGET checker — Cloudflare Worker (deploy guide)

This Worker powers the **AI** mode of the [TARGET checker](../../src/pages/tools/target-checker.astro).
The browser sends a protocol's text; the Worker pairs it with the TARGET
checklist and asks **Google Gemini** to judge each item. The API key lives only
on the Worker, never in the browser.

**Cost: $0 on Gemini's free tier.** Billing stays disabled, so the worst case is
exhausting the daily free quota (Gemini 3 Flash: ~1,500 requests/day) — the tool
just says "try again tomorrow." You can never receive a bill while billing is off.

---

## One-time setup (≈10 minutes)

### 1. Get a free Gemini API key
1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. **Create API key** → copy it. Keep **billing disabled** on the project to stay
   on the free tier. (Free-tier inputs may be used by Google to improve their
   models — that is why the tool page warns users not to paste confidential or
   unpublished-sensitive content.)

### 2. Deploy the Worker
From this folder (`workers/target-checker/`):

```bash
npm install -g wrangler        # if you don't have it
wrangler login                 # opens the browser, log into your Cloudflare account

# store the key as an encrypted secret (NOT in wrangler.toml):
wrangler secret put GEMINI_API_KEY
# → paste the key from step 1 when prompted

wrangler deploy
```

`wrangler deploy` prints a URL like
`https://target-checker.<your-subdomain>.workers.dev`. **Copy it.**

### 3. Wire it into the site
Open [`src/pages/tools/target-checker.astro`](../../src/pages/tools/target-checker.astro),
find the line near the top:

```js
const WORKER_URL = ""; // ← paste your Worker URL here
```

paste the URL, then commit & push. Done — the AI mode goes live on next deploy.

---

## Pick the model
`wrangler.toml` sets `GEMINI_MODEL = "gemini-flash-latest"`. If Google's current
free-tier Flash id differs (check <https://ai.google.dev/gemini-api/docs/models>),
change it there and `wrangler deploy` again. Stay on a **Flash** / **Flash-Lite**
model — Pro models left the free tier on 2026-04-01 and would incur cost.

## Optional: bot protection (Turnstile)
The Worker already locks CORS to `ALLOWED_ORIGIN`. To add a human check:
1. Create a free [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) widget.
2. `wrangler secret put TURNSTILE_SECRET` with the secret key.
3. Add the Turnstile site key + widget to the tool page and send the token as
   `turnstileToken` in the POST body. (Not required for launch.)

## Update the checklist
If `src/data/target.ts` ever changes, mirror the edit in `TARGET_ITEMS` inside
`worker.js` and redeploy, so the checker and the generator stay in lock-step.
