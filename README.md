# Jingled

The project does not solve any problem. I just wanted to track how my music taste has evolved over time and have a way to view it in a GitHub-style contribution graph.

Jingled is a Next.js app that connects to Spotify, syncs listening history, and visualizes your music behavior across days, clusters, inferred mood/signals, and AI-assisted recommendations.

## What You Get

- GitHub-style contribution graph for listening activity
- Daily timeline + day-level breakdown modal
- Inferred listening signals (experimental, non-medical)
- Brain view with cluster exploration and cluster-song modal
- AI chat drawer with recommendation refresh and Spotify actions
- Persistent chat history stored in database
- Public profile page (`/@username`)

## Tech Stack

- `Next.js` (App Router) + `React` + `TypeScript`
- `Tailwind CSS` + `Framer Motion`
- `Prisma` + `PostgreSQL`
- Spotify Web API (OAuth + playback/playlist operations)
- `openai` SDK for AI chat orchestration
- `@react-three/fiber` + `three` for 3D brain scene

## Prerequisites

- Node.js `18+` (Node 20 recommended)
- `pnpm` (required)
- PostgreSQL database
- Spotify Developer app credentials
- OpenAI API key (for AI chat)

## Quick Start

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Fill in all values in `.env`.

### 3) Configure Spotify app

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI used by this project:
   - `http://127.0.0.1:3000/api/auth/callback`
3. Copy `Client ID` and `Client Secret` into `.env`

### 4) Set up database

```bash
pnpm db:push
pnpm db:generate
```

### 5) Start development server

```bash
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Environment Variables

Key variables from `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- `SESSION_SECRET`: strong random secret
- `NEXT_PUBLIC_APP_URL`: app base URL
- `SPOTIFY_SYNC_MAX_PAGES`: backfill depth per sync run
- `NEXT_PUBLIC_AUTO_SYNC_INTERVAL_MS`: client polling interval
- `CRON_SECRET`, `SPOTIFY_CRON_BATCH_SIZE`: background sync
- `OPENAI_API_KEY`, `OPENAI_MODEL`: AI chat
- `AI_CHAT_MAX_STEPS`, `AI_CHAT_TIMEOUT_MS`, `AI_CHAT_RATE_LIMIT_PER_MIN`: AI safety limits

## Scripts

- `pnpm dev` — run local development
- `pnpm build` — generate Prisma client + production build
- `pnpm start` — run production server
- `pnpm lint` — run lint checks
- `pnpm db:push` — push Prisma schema
- `pnpm db:generate` — regenerate Prisma client
- `pnpm db:migrate` — create migration in dev
- `pnpm db:studio` — open Prisma Studio

## Project Structure (High-Level)

- `app/` — routes and API handlers
- `components/` — UI modules (brain, graph, profile, chat)
- `lib/` — domain logic (brain inference, clustering, Spotify, AI tools)
- `prisma/` — schema and DB model definitions
- `types/` — shared TypeScript contracts

## Sync & Data Notes

- Spotify “recently played” API returns limited windows; long-term history is built by repeated syncing.
- More frequent syncs lead to richer trend analysis and fuller contribution graph coverage.
- AI inference labels are exploratory and confidence-based, not scientific or medical conclusions.

## Deployment Notes

1. Deploy on Vercel (or similar)
2. Add all environment variables in deployment settings
3. Use production callback URL in Spotify app:
   - `https://<your-domain>/api/auth/callback`
4. Run schema push once against production DB:

```bash
pnpm db:push
```

## Troubleshooting

- OAuth `invalid_state` or callback issues:
  - Ensure host consistency (`127.0.0.1` vs `localhost`) across app URL and redirect URI.
- Empty/low data in graph:
  - Run sync again and keep auto-sync enabled.
- AI chat unavailable:
  - Check `OPENAI_API_KEY` and rate limit settings.
- DB issues:
  - Verify `DATABASE_URL` and rerun `pnpm db:push`.

---

If you use this project, treat it as a personal music analytics playground rather than a universal recommendation engine.

If this project is useful to you, please star the repository. If you want to contribute, fork it, create a feature branch, and open a pull request.

For any questions, reach out to `sdas.engineer@gmail.com`.
