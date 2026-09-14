# AdPilot AI — a Meta Ads AI Agent Platform

A dashboard + AI agent that watches your Meta (Facebook/Instagram) ad campaigns
every day, flags performance issues, and refreshes ad creatives on a fixed
cadence (every 3 days by default) — generating new copy and creative and
publishing it automatically or queuing it for your approval.

## View it live (no coding required)

This repo auto-publishes the dashboard as a website on every push to `main`,
using GitHub's free Pages hosting. One-time setup (a couple of clicks, no
terminal):

1. On GitHub, open this repo → **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Merge the open pull request into `main` (or push to `main` directly).

That's it. A few minutes after the merge, your dashboard will be live at:

```
https://patelamit7035.github.io/amit123/
```

You can watch the build progress under the repo's **Actions** tab — a green
checkmark next to "Deploy dashboard to GitHub Pages" means it's live. Every
future push to `main` re-publishes automatically, so this URL always reflects
the latest version. The dashboard needs no setup to use — it seeds realistic
demo data the first time it loads.

(The `server/` backend described below is separate — it's what you'd deploy
later if you want the agent to manage your *real* Meta Ads account 24/7. The
dashboard above is fully explorable without it.)

## What's in this repo

```
src/                 React dashboard (Vite + TypeScript + shadcn/ui + Tailwind)
server/              Standalone Node/Express backend that runs the agent 24/7
                      against the real Meta Marketing API
```

### The dashboard (`src/`)

Runs entirely in the browser with **no setup required** — on first load it
seeds realistic demo data (campaigns, ad sets, creatives, and a history of
agent activity) into `localStorage` so you can try the whole product
immediately.

- **Overview** — account KPIs, spend vs. revenue trend, agent status, recent activity
- **Campaigns** — performance table with an ad-set-level detail drawer
- **Creatives** — the AI-generated creative library with an approve/reject workflow
- **Agent Activity** — a timeline of every check and decision, with the reasoning behind it
- **Analytics** — CTR/ROAS trends, spend by campaign, and breakdowns by placement/device/age
- **Settings** — connect a Meta account, configure the agent, and set your brand/product info for creative generation

In this demo mode, the agent itself also runs client-side: a small scheduler
(`src/lib/agentEngine.ts`) checks whenever the dashboard is open, runs the
daily check once per day and rotates creatives on the configured cadence, and
you can always trigger either job on demand from the "Run agent" menu in the
header. This is genuinely useful for a daily habit, but it only runs while a
browser tab is open — for real, unattended 24/7 automation against your real
Meta ad account, deploy `server/` (below).

### Run the dashboard

```sh
npm install
npm run dev
```

## The agent backend (`server/`)

A small standalone Node service that talks directly to the **Meta Marketing
API**. Deploy it anywhere that can run Node (a VPS, Railway, Render, Fly.io,
a cron-capable container, etc.) and it will, on its own schedule:

1. **Daily check** — scans every campaign and ad set for pacing, ROAS, and
   CTR issues; in automatic mode it pauses underperformers (ROAS below your
   threshold) and nudges budget up on winners.
2. **Creative rotation** — every N days (3 by default) per ad set, it writes
   new ad copy (via OpenAI if you provide a key, or a built-in template
   generator otherwise), generates a creative image, uploads it to Meta,
   creates a new ad, and either publishes it immediately (automatic mode) or
   pauses it and queues it for your approval (manual mode) — added alongside
   whatever's already running, so nothing live gets interrupted.

### 1. Create a Meta app + access token

1. Create an app at [developers.facebook.com/apps](https://developers.facebook.com/apps) and add the **Marketing API** product.
2. Generate an access token with `ads_management` and `ads_read` permissions
   for the ad account you want to manage. For unattended/production use, set
   up a **System User** in Business Manager and generate a long-lived System
   User token — regular user tokens expire and will break the cron jobs.
3. Note your **ad account ID** (`act_...`) and the **Facebook Page ID** the
   ads should be posted from.

### 2. Configure and run

```sh
cd server
npm install
cp .env.example .env
# edit .env: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID,
# META_DESTINATION_URL, BUSINESS_NAME, PRODUCT_DESCRIPTION, etc.
npm start
```

This starts an HTTP server (default port `8787`) and schedules the two cron
jobs (`DAILY_CHECK_CRON`, `CREATIVE_ROTATION_CRON` in `.env`, standard cron
syntax). Deploy it as a long-running process (systemd, Docker, a platform
like Railway/Render) so the schedule keeps firing even when nobody's looking.

You can also trigger either job by hand at any time:

```sh
npm run run:daily-check
npm run run:creative-rotation -- --force   # --force ignores the rotation cadence
```

Or via HTTP:

```
GET  /api/health
GET  /api/state                                  # agent logs + per-ad-set rotation bookkeeping
POST /api/agent/run-daily-check
POST /api/agent/run-creative-rotation             # body: { "force": true } to ignore cadence
POST /api/creatives/:adSetId/:adId/approve        # publish a paused, pending creative
POST /api/creatives/:adSetId/:adId/reject         # discard a pending creative
```

### Connecting the dashboard to a live backend

The dashboard's Settings page has an "Agent backend URL" field for this. The
current build ships wired for the zero-setup demo experience described
above; once you've deployed `server/`, point that field at its public URL as
the next integration step to replace the in-browser demo data with your real
account. `server/src/index.js` already has CORS configured (`CORS_ORIGIN` in
`.env`) for this.

## Notes on the demo creative generator

Both the frontend demo (`src/lib/copyGenerator.ts`) and the backend
(`server/src/agent/creativeGenerator.js`) ship with a template-based
copywriter so the whole product works with zero API keys. The backend
version will use a real LLM automatically if you set `OPENAI_API_KEY`. Ad
images are generated as branded placeholder graphics (via placehold.co) —
swap `generateCreativeVariant`'s `imageUrl` for a real image-generation API
(DALL·E, Ideogram, etc.) when you're ready to go fully live.

## Tech stack

- Vite, React, TypeScript, React Router, TanStack Query
- shadcn/ui (Radix primitives) + Tailwind CSS
- Recharts for charts
- Backend: Node.js, Express, node-cron, the Meta Marketing (Graph) API
