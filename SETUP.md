# Replay — Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Spotify Developer App

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SPOTIFY_CLIENT_ID` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Must be `http://localhost:3000/api/auth/callback` in dev |
| `SESSION_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev |

## 3. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/auth/callback` to Redirect URIs
4. Copy Client ID and Client Secret

## 4. Database setup

```bash
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
```

## 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- `/` — Landing page with live demo graph
- `/demo` — Full demo profile with mock data
- `/dashboard` — Your personal dashboard (requires login)
- `/@username` — Public profile page

## Data Sync

Spotify's recently played API only returns the last 50 tracks. For best results:
1. Sync frequently (daily)
2. The database accumulates plays over time
3. After ~2 weeks of syncing, your graph starts filling in

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Add all environment variables in Vercel dashboard
3. For `SPOTIFY_REDIRECT_URI`, use your production URL: `https://your-app.vercel.app/api/auth/callback`
4. Set up a PostgreSQL database (Neon, Supabase, or Railway work great)
5. Run `npm run db:push` against your production DB once
