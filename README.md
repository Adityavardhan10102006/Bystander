# Bystander

> AI-powered conflict prediction & mediation for team chat platforms. Detects rising tension before it becomes conflict, and privately nudges participants toward de-escalation.

---

## How It Works

A Discord bot listens for messages and forwards them to a Next.js API. The API enqueues each message for async processing — NLP analysis, conflict prediction, and mediation suggestion — all powered by Anthropic. Results feed a real-time dashboard where admins and moderators monitor team health.

```
Discord Gateway
      │
      ▼
bot/index.ts  ──── POST /api/ingestion/discord ────▶  BullMQ queue (Redis)
                                                              │
                                                             Worker
                                                              │
                                          ┌───────────────────┼──────────────────┐
                                          ▼                   ▼                  ▼
                                   NLP analysis        Conflict score     Mediation nudge
                                   (Anthropic)         (Anthropic)        (Anthropic)
                                          │
                                          ▼
                                   PostgreSQL (signals, tension snapshots)
                                          │
                                          ▼
                               /dashboard (Next.js)
```

Every score ships with `signalsFired` — explainability is part of the data contract, not an afterthought (see [`types/pipeline.ts`](types/pipeline.ts)).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web app | Next.js 14 (App Router) + TypeScript |
| Database | PostgreSQL via Prisma |
| Queue & pub/sub | Redis + BullMQ |
| AI (NLP + generation) | Anthropic (single provider) |
| Auth | NextAuth.js v4 — GitHub & Google OAuth |
| Discord integration | discord.js |
| Logging | Pino (JSON in prod, pretty in dev) |

---

## Project Structure

```
bystander/
├── app/
│   ├── api/
│   │   ├── ingestion/discord/   ← Discord webhook (public, validates + enqueues)
│   │   ├── analytics/           ← Dashboard data APIs (auth + RBAC required)
│   │   ├── auth/[...nextauth]/  ← NextAuth OAuth handler
│   │   ├── cron/purge-retention/← Retention purge job (Vercel Cron)
│   │   └── health/              ← GET /api/health (no auth, for uptime checks)
│   ├── dashboard/               ← Team health dashboard (protected)
│   └── login/                   ← OAuth sign-in page
├── bot/
│   ├── index.ts                 ← Discord Gateway listener + BullMQ worker startup
│   ├── server.ts                ← Internal HTTP server for DM delivery (POST /notify)
│   └── notify.ts                ← sendDM() helper
├── lib/
│   ├── ai/client.ts             ← Anthropic calls with retry + circuit breaker
│   ├── auth/config.ts           ← NextAuth config
│   ├── db/client.ts             ← Prisma singleton
│   ├── env.ts                   ← Zod env validation (fails fast on startup)
│   ├── logger.ts                ← Pino logger singleton
│   ├── queue/
│   │   ├── index.ts             ← BullMQ Queue definition
│   │   └── worker.ts            ← Pipeline consumer (runs inside bot process)
│   └── realtime/redis.ts        ← ioredis singleton + pub/sub helpers
├── prisma/schema.prisma         ← Data model
└── types/pipeline.ts            ← Shared pipeline types (NormalizedMessage, AiAnalysisResult, …)
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 18.18
- PostgreSQL instance
- Redis instance
- Anthropic API key
- Discord bot token + OAuth app

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — the app will refuse to start if any required var is missing:

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `REDIS_URL` | Your Redis connection string |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `DISCORD_BOT_TOKEN` | [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID/SECRET` | [github.com/settings/developers](https://github.com/settings/developers) — callback: `/api/auth/callback/github` |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth 2.0 — callback: `/api/auth/callback/google` |
| `CRON_SECRET` | Run: `openssl rand -base64 32` (secures the purge cron endpoint) |
| `BYSTANDER_API_URL` | `http://localhost:3000` for local dev |

### 3. Run the database migration

```bash
npx prisma migrate dev --name phase1_auth_rbac_archived_at
```

### 4. Start the app

**Terminal 1 — Next.js web app:**
```bash
npm run dev
```

**Terminal 2 — Discord bot + BullMQ worker:**
```bash
npm run worker:start
```

> The bot process does double duty: it listens for Discord messages **and** runs the BullMQ worker that processes the pipeline. Both must be running for end-to-end flow.

---

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, enable the **Message Content** Privileged Gateway Intent (required — without it `message.content` is always empty).
3. Add the bot to your server with these permissions: **Read Messages / View Channels**, **Send Messages**, **Read Message History**.
4. Copy the bot token into `DISCORD_BOT_TOKEN`.

---

## Key Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/ingestion/discord` | None (public webhook) | Receives Discord messages, enqueues for async processing |
| `GET /api/health` | None | Service liveness — checks DB, Redis, Anthropic |
| `GET /api/analytics/dashboard` | Session + RBAC | Dashboard data (ADMIN or MODERATOR role required) |
| `GET /api/analytics/conversations/[id]` | Session + RBAC | Conversation detail |
| `GET /api/cron/purge-retention` | `CRON_SECRET` | Purges rawText for closed/archived threads |
| `GET/POST /api/auth/[...nextauth]` | — | NextAuth OAuth handlers |

---

## Access Control (RBAC)

The dashboard is protected at two levels:

1. **Middleware** ([`middleware.ts`](middleware.ts)) — unauthenticated requests to `/dashboard/*` are redirected to `/login`; unauthenticated API calls to `/api/analytics/*` get a `401`.
2. **Route handlers** — each analytics API verifies the session user holds `ADMIN` or `MODERATOR` in the `UserServerRole` table before returning data.

To grant a user access, insert a row into `UserServerRole`:
```sql
INSERT INTO "UserServerRole" ("id", "userId", "discordGuildId", "role")
VALUES (gen_random_uuid(), '<user-id>', '<guild-id>', 'ADMIN');
```

---

## Reliability

**AI calls** (`lib/ai/client.ts`) are wrapped with:
- **Exponential backoff** — 3 retries (1 s → 2 s → 4 s ± jitter) on rate-limit or overload errors.
- **Circuit breaker** — tracks error rate over a rolling 1-minute window. If >50% of calls fail, the circuit opens and returns a safe fallback (`isFallback: true`) instead of hammering the API. Stats visible at `/api/health`.

**Queue** — ingestion returns `200` in <1 ms after enqueuing. All heavy work (NLP, DB writes) runs in the background worker with `concurrency: 1` to preserve per-thread message ordering.

---

## Data Retention

Raw message text (`Message.rawText`) is stored only for the lifetime of an active thread. When a thread is closed or archived, a scheduled job nulls out `rawText` while keeping all derived signals (sentiment, tension scores, embeddings) for long-term analytics.

The purge job runs via **Vercel Cron** (configured in [`vercel.json`](vercel.json)) daily at midnight UTC. Trigger it manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/purge-retention
```

---

## Deployment

### Next.js app → Vercel

Push to GitHub and connect to Vercel. Set all env vars in the Vercel dashboard. The cron job in `vercel.json` runs automatically.

> ⚠️ The BullMQ worker **cannot** run on Vercel (serverless functions terminate after each request). Deploy the bot + worker as a persistent service (see below).

### Bot + Worker → Railway (or any always-on host)

The `bot/` process must stay alive to maintain the Discord WebSocket connection and consume the BullMQ queue.

1. Create a new Railway service, set **Root Directory** to `/` (repo root).
2. Set **Start Command** to `npm run worker:start`.
3. Add all required env vars (especially `DISCORD_BOT_TOKEN`, `REDIS_URL`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `BYSTANDER_API_URL`).
4. Enable **Always On** — do **not** configure a cron schedule.

> ❌ Do not deploy the bot to Vercel — it cannot hold an open WebSocket connection.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.
