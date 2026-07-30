# Bystander

AI-powered conflict prediction & mediation for team chat platforms.

## Architecture (Phase 1, confirmed)

- **Single Next.js app** — no microservices, no Docker, no Python. All routes live under `app/api/*`.
- **Hosted inference only** — one AI provider (Anthropic) handles both NLP analysis
  (sentiment/emotion/language) and mediation generation (nudges, rewrites). No
  self-hosted RoBERTa/DeBERTa/spaCy.
- **Storage/retention policy**: raw message text persists for the lifetime of the
  active conversation thread, purged on close/archive. Derived signals (embeddings,
  sentiment, tension snapshots) persist independently for long-term trend views.
- **First chat integration**: Discord. Ingestion normalizes into a shared
  `NormalizedMessage` type so other platforms can be added without touching
  downstream pipeline code.

## Pipeline

```
Discord webhook (app/api/ingestion/discord)
  -> NLP analysis (app/api/nlp/analyze)
  -> Conflict prediction (app/api/prediction/score)
  -> Mediation/nudge generation (app/api/mediation/suggest)
  -> Private delivery (app/api/notification/send)
  -> Dashboard aggregation (app/api/analytics/dashboard)
```

Every prediction ships with `signalsFired` — explainability is part of the
data contract, not a bolt-on (see `types/pipeline.ts`).

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, DISCORD_BOT_TOKEN
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Requires a Postgres instance (for `DATABASE_URL`) and Redis (for `REDIS_URL`,
used for the message queue and dashboard pub/sub).

## Still open / Phase 2+

- Wire ingestion route to a Redis queue instead of processing inline.
- Retention purge job (scheduled task, purges `Message.rawText` on thread close
  per `RETENTION_PURGE_INTERVAL_HOURS`).
- Socket.IO server for live dashboard updates (`lib/realtime/redis.ts` publishes
  to `DASHBOARD_CHANNEL` already; needs a subscriber + Socket.IO bridge).
- Discord bot client for private DM delivery in `app/api/notification/send`.
- Auth (NextAuth or similar) for the dashboard.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Prisma + PostgreSQL
- Redis (queue + pub/sub)
- Anthropic API (NLP + generation, single provider)
- discord.js (first platform integration)
- Socket.IO (planned, for live dashboard)
