# YouTheater

Your personal YouTube archive and theater. Save videos by link (title, thumbnail, duration, channel, views and publish date are fetched automatically), sort them into your own libraries, reorder everything by drag and drop, and watch from one screen.

## Features
- **Main theater**: nav bar → library bar → side-scrolling video strip → player. Choosing a library updates the strip. Choosing a video loads it in the player, ready to play.
- **Add by link**: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, music.youtube.com. Duplicates are detected.
- **Libraries**: create, rename, delete, drag to reorder. A video can be in several libraries.
- **Reorder videos** by dragging in the strip or the library manager (`⋯` → Manage). The manager also has one-click sorting (title, channel, duration, dates).
- **Bulk edit** in the library manager: select many → add / move to another library, remove, delete.
- **Import a whole YouTube playlist** (public or unlisted), or paste many links at once (`/import`).
- **Check all videos** (`/settings`) re-fetches data and flags videos that were deleted or made private. Their saved title and thumbnail stay so you know what they were.
- **Backup** to JSON or CSV.
- Notes per video, search, English / 한국어.
- **Passcode gate**: everyone types the same passcode. Leave `APP_PASSCODE` empty to open the site to anyone.

## On your phone
- **Install it:** open the site, then
  - **Android (Chrome):** menu ⋮ → *Add to Home screen* / *Install app*.
  - **iPhone (Safari):** Share → *Add to Home Screen*.
  It opens full-screen with its own icon.
- **Save from the YouTube app (Android):** after installing, tap **Share** on any video → **YouTheater**. It saves right away and lets you pick libraries. Sharing a playlist link opens the import page.
- **iPhone:** iOS doesn't let web apps appear in the Share menu. Copy the link in YouTube, open YouTheater and tap **📋 Paste**. A video link saves in one tap.
- Long-press a card to drag it into a new order.

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
3. From **Project Settings → API**, copy the **Project URL** and the **service_role** key.

The app only talks to Supabase from the server with the service-role key. Row Level Security is on with no policies, so the public anon key can't read or write anything.

### 2. YouTube Data API key (recommended)
1. Go to https://console.cloud.google.com, create a project, and enable **YouTube Data API v3**.
2. Under **Credentials**, create an **API key**. Restrict it to the YouTube Data API v3.

Without a key, links still save (via oEmbed) but without duration, views or dates, and playlist import is off. The free quota (10,000 units/day) is plenty: saving a video costs 1 unit, and importing a 200-video playlist costs about 8.

### 3. Environment variables
Copy `.env.example` to `.env.local` and fill it in:

| Variable | What |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (server only) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `APP_PASSCODE` | Passcode to enter the site. Empty = open site |
| `SESSION_SECRET` | Long random string for signing the login cookie (e.g. `openssl rand -hex 32`) |

### 4. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

### 5. Deploy to Vercel
1. Import this GitHub repo at https://vercel.com/new.
2. Add the environment variables above under **Settings → Environment Variables**.
3. Deploy. Changing the passcode or secret later logs everyone out.

## Tech
Next.js (App Router, TypeScript) · Tailwind CSS · Supabase Postgres · dnd-kit · YouTube Data API v3 · Vercel.

```
src/
  app/                 pages (/, /library/[id], /import, /settings, /login) and API routes (app/api/*)
  components/          Theater (main screen), NavBar, LibraryBar, VideoStrip, Player, …
  lib/                 youtube.ts (API), repo.ts (DB queries), auth.ts (passcode), i18n.tsx
  proxy.ts             passcode gate for every page and API route
supabase/migrations/   database schema
```
