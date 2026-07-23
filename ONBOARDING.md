# Onboarding — StudyBuddy AI

Everything runs in Docker. You do not need Node, npm, or the Supabase CLI on your machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — that's it.

Make sure Docker Desktop is actually running before you start (whale icon in the tray / menu bar).

## Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd StudyBuddyAICodeMap
   ```

2. **Create your `.env`**

   Copy the example and fill in the real values:

   ```bash
   cp .env.example .env      # Windows PowerShell: copy .env.example .env
   ```

   Ask **Osama** for the staging `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never commit `.env`.

3. **Start it**

   ```bash
   docker compose up
   ```

   The first run installs dependencies inside the container and takes a few minutes. Subsequent runs start in seconds.

## Access

http://localhost:8080

Edit any file under `src/` and the browser reloads automatically — no rebuild needed.

## Stopping

```bash
docker compose down
```

`Ctrl+C` stops the running container; `docker compose down` also removes it. Your `node_modules` volume is kept, so the next `up` is fast.

## Rebuilding

Run this whenever dependencies change — i.e. after `package.json` or `package-lock.json` changes, typically after pulling `main` or switching branches:

```bash
docker compose up --build
```

If dependencies get into a genuinely broken state, wipe the cached `node_modules` volume and start clean:

```bash
docker compose down -v
docker compose up --build
```

## Branch conventions

- Always branch off `main`.
- Name branches `ws-01/your-feature` (your workstream prefix + a short description).
- Open a pull request to merge back into `main`.
- **Never push directly to `main`.**

```bash
git checkout main
git pull
git checkout -b ws-01/your-feature
```

## Making DB changes

- Every schema change goes in a migration file under `supabase/migrations/`.
- **Never** change the database directly in the Supabase dashboard — those changes are invisible to everyone else and get silently overwritten.
- Commit the migration alongside the code that depends on it, in the same PR.
