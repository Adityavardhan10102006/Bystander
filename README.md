# Bystander

> AI-powered conflict prediction & mediation for team chat platforms. Detects rising tension before it becomes conflict, and privately nudges participants toward de-escalation.

---

## How It Works

```
Discord Gateway
      │
      ▼
bot/index.ts ──[POST + INGESTION_SECRET]──▶ /api/ingestion/discord
                                                      │
                                            BullMQ queue (Redis)
                                                      │
                                                   Worker
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                  1 AI call (Anthropic)   Previous DB signals
                                  sentiment, emotion,      (history, timing)
                                  explanation, nudge text
                                            │
                                            ▼
                                  Deterministic Risk Engine
                                  (lib/risk/score.ts)
                                  tensionScore, riskLevel,
                                  signalsFired, trend
                                            │
                             ┌──────────────┼──────────────┐
                             ▼              ▼              ▼
                       MessageSignal  TensionSnapshot  Redis pub/sub
                       (DB)           (DB)             (SSE → browser)
                                            │
                                            ▼
                              /dashboard (Next.js) — realtime via SSE
                                            │
                             [Admin clicks "Send Nudge"]
                                            │
                                            ▼
                          /api/notification/send ──▶ bot/server.ts :3001
                                                          │
                                                          ▼
                                                     Discord DM ✉️
```

Every score ships with `signalsFired` — explainability is part of the data contract, not an afterthought.

---

## What's Implemented

| Feature | Status |
|---------|--------|
| Discord bot → ingestion API → BullMQ queue | ✅ Implemented |
| Ingestion endpoint authentication (`INGESTION_SECRET`) | ✅ Implemented |
| Anthropic AI: single structured call per message | ✅ Implemented |
| Zod validation of all AI responses | ✅ Implemented |
| Deterministic risk scoring engine (not LLM) | ✅ Implemented |
| Explainable signals (measurable, not invented) | ✅ Implemented |
| PostgreSQL persistence (Message, Signal, Snapshot) | ✅ Implemented |
| Circuit breaker + exponential backoff on AI calls | ✅ Implemented |
| Tenant-aware RBAC (guild-scoped, no global bypass) | ✅ Implemented |
| Team discovery (`GET /api/teams`) | ✅ Implemented |
| Dashboard with team selector + signal cards | ✅ Implemented |
| Realtime updates via SSE (Redis pub/sub bridge) | ✅ Implemented |
| Real Discord DM delivery via bot notify server | ✅ Implemented |
| Intervention persistence (PENDING/SENT/FAILED) | ✅ Implemented |
| Raw text retention purge (cron job, fail-closed auth) | ✅ Implemented |
| Demo mode (`DEMO_MODE=true`) | ✅ Implemented |
| GitHub + Google OAuth | ✅ Implemented |
| Unit tests (risk engine) | ✅ Implemented |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web app | Next.js 14 (App Router) + TypeScript |
| Database | PostgreSQL via Prisma |
| Queue & pub/sub | Redis + BullMQ |
| AI (NLP + generation) | Anthropic (1 call/message) |
| Auth | NextAuth.js v4 — GitHub & Google OAuth |
| Discord integration | discord.js |
| Logging | Pino (JSON in prod, pretty in dev) |
| Testing | Vitest |

---

## Project Structure

```
bystander/
├── app/
│   ├── api/
│   │   ├── ingestion/discord/   ← POST — INGESTION_SECRET required
│   │   ├── analytics/           ← Dashboard data APIs (auth + RBAC)
│   │   ├── teams/               ← GET /api/teams — team discovery
│   │   ├── notification/send/   ← POST — sends real Discord DMs
│   │   ├── realtime/stream/     ← GET — SSE stream (auth required)
│   │   ├── auth/[...nextauth]/  ← NextAuth OAuth handler
│   │   ├── cron/purge-retention/← Retention purge (CRON_SECRET required)
│   │   └── health/              ← GET /api/health (no auth)
│   ├── dashboard/               ← Team health dashboard (protected)
│   └── login/                   ← OAuth sign-in page
├── bot/
│   ├── index.ts                 ← Discord bot + BullMQ worker startup
│   ├── server.ts                ← Internal HTTP server for DM delivery (:3001)
│   └── notify.ts                ← sendDM() helper
├── lib/
│   ├── ai/client.ts             ← Anthropic: 1 call/message, Zod-validated
│   ├── auth/
│   │   ├── config.ts            ← NextAuth config
│   │   └── rbac.ts              ← Tenant-aware RBAC (no global bypass)
│   ├── db/client.ts             ← Prisma singleton
│   ├── demo/data.ts             ← Deterministic hackathon demo scenario
│   ├── env.ts                   ← Zod env validation (fails fast on startup)
│   ├── logger.ts                ← Pino logger with secret redaction
│   ├── queue/
│   │   ├── index.ts             ← BullMQ Queue definition
│   │   └── worker.ts            ← Pipeline consumer + risk engine
│   ├── realtime/redis.ts        ← ioredis singleton + pub/sub helpers
│   └── risk/
│       ├── signals.ts           ← 10 measurable signal types
│       ├── score.ts             ← Deterministic weighted scoring engine
│       └── thresholds.ts        ← Risk level thresholds (configurable)
├── prisma/schema.prisma         ← Data model (with Intervention model)
├── tests/
│   └── risk.test.ts             ← Risk engine unit tests
└── types/pipeline.ts            ← Shared pipeline types
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 18.18
- PostgreSQL instance
- Redis instance
- Anthropic API key
- Discord bot token

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — the app will refuse to start if any required var is missing.

Generate secrets:
```bash
openssl rand -base64 32  # for INGESTION_SECRET, NOTIFY_SECRET, CRON_SECRET, NEXTAUTH_SECRET
```

| Variable | Required | Where to get it |
|----------|----------|----------------|
| `DATABASE_URL` | ✅ | Your PostgreSQL connection string |
| `REDIS_URL` | ✅ | Your Redis connection string |
| `ANTHROPIC_API_KEY` | ✅ | [console.anthropic.com](https://console.anthropic.com) |
| `DISCORD_BOT_TOKEN` | ✅ | [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token |
| `INGESTION_SECRET` | ✅ | `openssl rand -base64 32` — must match in both bot and Next.js |
| `NOTIFY_SECRET` | ✅ | `openssl rand -base64 32` — for the internal DM server |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `CRON_SECRET` | ✅ | `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID/SECRET` | ✅ | [github.com/settings/developers](https://github.com/settings/developers) |
| `GOOGLE_CLIENT_ID/SECRET` | ✅ | [console.cloud.google.com](https://console.cloud.google.com) |
| `BYSTANDER_API_URL` | ✅ | `http://localhost:3000` for local dev |
| `DEMO_MODE` | ❌ | `true` to run without real Discord (hackathon demo) |

### 3. Run the database migration

```bash
npx prisma migrate dev --name hackathon_hardening
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

> The bot process does double duty: it listens for Discord messages **and** runs the BullMQ worker. Both must be running for end-to-end flow.

### 5. Run tests

```bash
npm test
```

---

## Hackathon Demo Mode

If you don't have a real Discord server ready, use demo mode:

```bash
# In .env:
DEMO_MODE=true
```

The dashboard will show a pre-built 7-stage conflict scenario:
- **LOW** → **MEDIUM** → **HIGH** → **CRITICAL** (escalation)
- → Nudge sent (private DM)
- → **HIGH** → **MEDIUM** → **LOW** (de-escalation / recovery)

The demo banner is shown in the UI so audiences can see it's a demo.

---

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, enable the **Message Content** Privileged Gateway Intent (required — without it `message.content` is always empty).
3. Add the bot to your server with permissions: **Read Messages / View Channels**, **Send Messages**, **Read Message History**, **Send DMs**.
4. Copy the bot token into `DISCORD_BOT_TOKEN`.

---

## Access Control (RBAC)

The dashboard is protected at two levels:

1. **Middleware** ([`middleware.ts`](middleware.ts)) — unauthenticated requests to `/dashboard/*` are redirected to `/login`.
2. **Route handlers** — each analytics API verifies the session user holds `ADMIN` or `MODERATOR` in `UserServerRole` **for the specific Discord guild** that owns the requested team. A role in Guild A never grants access to Guild B's data.

To grant a user access, insert a row into `UserServerRole`:
```sql
INSERT INTO "UserServerRole" ("id", "userId", "discordGuildId", "role")
VALUES (gen_random_uuid(), '<user-id>', '<discord-guild-snowflake>', 'ADMIN');
```

---

## Key Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/ingestion/discord` | `INGESTION_SECRET` bearer | Receives Discord messages from bot |
| `GET /api/teams` | Session | List teams the user can access |
| `GET /api/analytics/dashboard?teamId=` | Session + RBAC | Dashboard data |
| `GET /api/analytics/conversations/[id]` | Session + RBAC | Conversation detail |
| `POST /api/notification/send` | Session + RBAC | Send Discord DM via bot |
| `GET /api/realtime/stream?teamId=` | Session + RBAC | SSE stream (realtime updates) |
| `GET /api/health` | None | Service liveness |
| `GET /api/cron/purge-retention` | `CRON_SECRET` bearer | Purge rawText for closed threads |

---

## Security Model

| Concern | Approach |
|---------|----------|
| Ingestion spoofing | `INGESTION_SECRET` bearer token — fails closed if missing |
| Unauthenticated AI access | Public AI endpoints removed |
| Cross-tenant data leak | RBAC check uses guild-specific role, not any global role |
| Fake success on DM delivery | Intervention persisted as PENDING, updated to SENT/FAILED after real delivery |
| Cron endpoint left open | `CRON_SECRET` required — fails closed if missing |
| Bot notify server left open | `NOTIFY_SECRET` required — fails closed if missing |
| LLM-hallucinated risk scores | Scores computed by deterministic engine; LLM only provides sentiment/emotion |
| Secret exposure in logs | Pino redacts `*.rawText`, `*.text`, `*.secret`, `*.token` |

---

## Reliability

**AI calls** (`lib/ai/client.ts`) are wrapped with:
- **Exponential backoff** — 3 retries (1 s → 2 s → 4 s ± jitter) on rate-limit or overload errors.
- **Structured response validation** — Zod validates every AI response before use.
- **Circuit breaker** — tracks error rate over a rolling 1-minute window. If >50% of calls fail, returns a safe fallback with `isFallback: true`. Stats at `/api/health`.
- **1 call per message** — consolidated from 3 calls (NLP + prediction + mediation) to 1 structured call.

**Risk scoring** (`lib/risk/`) is deterministic:
- Same signals → same score, always
- LLM never controls the numerical output
- 10 measurable signal types (sentiment, emotion, timing, history)

---

## Data Retention

Raw message text (`Message.rawText`) is stored only for the lifetime of an active thread. When a thread is closed or archived, a scheduled job nulls out `rawText` while keeping all derived signals for analytics.

The purge job requires `CRON_SECRET` (fails closed if missing). Run manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/purge-retention
```

---

## Deployment

### Next.js app → Vercel

Push to GitHub and connect to Vercel. Set all env vars in the Vercel dashboard. The cron job in `vercel.json` runs automatically.

> ⚠️ The BullMQ worker **cannot** run on Vercel (serverless functions terminate after each request).

### Bot + Worker → Railway

1. Create a new Railway service, set **Root Directory** to `/`.
2. Set **Start Command** to `npm run worker:start`.
3. Add all required env vars.
4. Enable **Always On**.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.
