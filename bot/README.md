# Bystander Discord Bot

A lightweight, standalone Node.js process that bridges Discord and the
Bystander pipeline. It **only** forwards raw messages to the Next.js API and
delivers DMs on request. All NLP, scoring, and mediation logic lives in the
main app.

---

## What lives here

| File | Purpose |
|------|---------|
| `index.ts` | Entrypoint — logs into Discord, listens for messages, POSTs to `/api/ingestion/discord`, starts the notify server |
| `notify.ts` | `sendDM(client, userId, message)` helper — wraps `user.send()` for mediation nudges |
| `server.ts` | Tiny Node `http` server (`POST /notify`) so the Next.js app can trigger DMs over HTTP |
| `package.json` | Bot-only deps: `discord.js` + `dotenv` |
| `.env.example` | Required environment variables |

---

## Running locally

### 1. Install dependencies

```bash
cd bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   DISCORD_BOT_TOKEN  — from Discord Developer Portal → Bot → Token
#   BYSTANDER_API_URL  — e.g. http://localhost:3000 while developing locally
```

### 3. Start the bot (TypeScript, no build step)

```bash
npm run dev
```

This starts:
- The Discord Gateway listener (forwards messages to `/api/ingestion/discord`)
- The internal HTTP server on `NOTIFY_PORT` (default 3001) for DM delivery

Or, build first then run compiled JS:

```bash
npm run build
npm start
```

The bot will log `[bot] Logged in as <BotName>#0000` then `[server] Notify HTTP server listening on port 3001`.

### Running alongside the Next.js app locally

Start the Next.js dev server in one terminal, then the bot in another:

```bash
# Terminal 1 (repo root)
npm run dev

# Terminal 2
cd bot && BYSTANDER_API_URL=http://localhost:3000 npm run dev
```

To trigger a test DM:

```bash
curl -X POST http://localhost:3001/notify \
  -H "Content-Type: application/json" \
  -d '{"userId": "123456789012345678", "message": "Hey, things are heating up."}'
```

---

## Required Discord bot permissions

When adding the bot to a server, it needs:

| Permission | Why |
|-----------|-----|
| **Read Messages / View Channels** | To receive `messageCreate` events |
| **Send Messages** | Fallback for any future guild messages (optional) |
| **Read Message History** | Needed for some gateway events |

The bot **also** needs the **Message Content** Privileged Gateway Intent enabled in the
[Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents.
Without it, `message.content` will always be empty.

---

## Deploying to Railway

Railway is the recommended host because the bot needs a **persistent, always-on
process** — not a cron job or serverless function.

### Step-by-step

1. **Create a new Railway project** at [railway.app](https://railway.app) and
   add a new **service** (not a database).

2. **Connect your GitHub repo** (or push the `bot/` directory as a separate
   repo). In the service settings set the **Root Directory** to `bot/`.

3. **Set the start command** in Railway → *Settings → Deploy → Start Command*:

   ```
   npm run build && npm start
   ```

4. **Set environment variables** in Railway's *Variables* tab:

   | Variable | Value | Required? |
   |----------|-------|-----------|
   | `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal → Bot → Token | ✅ Required |
   | `BYSTANDER_API_URL` | Full URL of your Next.js app, e.g. `https://bystander.vercel.app` | ✅ Required |
   | `NODE_ENV` | `production` | Recommended |
   | `NOTIFY_PORT` | Port for the internal DM HTTP server (default `3001`) | Optional |
   | `NOTIFY_SECRET` | Bearer token required by `POST /notify`; omit to disable auth | Optional |

5. **Enable "Always On"** — Railway services are always-on by default. Make
   sure you have **not** configured a cron schedule; this must run as a
   continuous service.

6. **Confirm the service is running** by checking Railway's *Deployments* log
   for:

   ```
   [bot] Logged in as <BotName>#0000
   [bot] Forwarding messages to https://…/api/ingestion/discord
   [server] Notify HTTP server listening on port 3001
   ```

### Calling /notify from the Next.js app on Railway

If both services live in the **same Railway project**, use Railway's private
networking so the port is never exposed to the public internet:

```
http://<bot-service-name>.railway.internal:3001/notify
```

Set `NOTIFY_SECRET` on both services and pass it as `Authorization: Bearer <secret>`.

### What NOT to do on Railway

- ❌ Do **not** set a cron schedule — the bot needs a persistent WebSocket connection to Discord's Gateway.
- ❌ Do **not** use Railway's "Serverless" mode — it will shut the process down between requests.
- ❌ Do **not** deploy this to Vercel — Vercel serverless cannot hold an open WebSocket.
- ❌ Do **not** expose `NOTIFY_PORT` publicly — it's meant for internal service-to-service calls only.

---

## Architecture note

```
Discord Gateway
      │
      │  WebSocket (discord.js manages reconnects)
      ▼
  bot/index.ts ──── POST /api/ingestion/discord ───▶  Next.js app (Vercel / Railway)
      │  (server.ts also starts here)                         │
      │                                                        ▼
      ◀──── POST /notify ←── app/api/mediation/* ──── mediation nudge decision
      │
      │  user.send() via discord.js
      ▼
  Discord DM delivered to user
```

The bot process is deliberately stateless — it holds no DB connections and
performs no NLP. If it restarts, no data is lost.
