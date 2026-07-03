# Note System

A workspace-based notes app with voting and version history/restore. Backend: Hono + Drizzle ORM + PostgreSQL. Frontend: React + Vite + Tailwind.

See `docs/` for design details: [`db-design.md`](docs/db-design.md), [`api-design.md`](docs/api-design.md), [`cron.md`](docs/cron.md), [`frontend-status.md`](docs/frontend-status.md).

## Prerequisites

- **Node.js** 20+ (repo was built/tested on Node 24)
- **PostgreSQL** 14+ running locally (or reachable via a connection string)
- npm (ships with Node)

## 1. Get a PostgreSQL database

Any Postgres 14+ instance works. Two easy options:

**Option A — Docker (no local Postgres install needed)**
```bash
docker run --name note-system-db \
  -e POSTGRES_USER=crawler \
  -e POSTGRES_PASSWORD=crawler \
  -e POSTGRES_DB=note_saas \
  -p 5432:5432 \
  -d postgres:16
```

**Option B — local Postgres (Homebrew, already installed, etc.)**
```bash
createuser crawler --superuser   # or grant appropriate privileges
createdb note_saas -O crawler
```

Either way, end up with a database reachable at `postgresql://crawler:crawler@localhost:5432/note_saas` (or adjust the `DATABASE_URL` in step 2 to match whatever credentials/host you actually used).

## 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` (this file is gitignored, so it won't exist on a fresh clone):
```env
DATABASE_URL=postgresql://crawler:crawler@localhost:5432/note_saas
JWT_SECRET=replace-with-any-long-random-string
JWT_EXPIRES_IN_SECONDS=900
```
- `DATABASE_URL` — must match the Postgres instance from step 1.
- `JWT_SECRET` — required (the server throws on boot if unset); any secret string works locally.
- `JWT_EXPIRES_IN_SECONDS` — optional, defaults to `900` (15 min) if omitted.

Apply the database schema (runs the SQL files in `backend/drizzle/`):
```bash
npx drizzle-kit migrate
```

(Optional) seed the database with realistic sample data — 1 agency, 11 users, 1,000 workspaces, ~500,000 notes. This is slow (bulk inserts) but useful for testing pagination/sorting at scale:
```bash
npm run db:seed
```
It prints login credentials at the end, e.g.:
```
Shared login password for all seeded users: Password123!
Example login: jane.doe@example.com / Password123!
System user:   system@notesaas.local / Password123!
```
If you don't want 500k rows, either lower `NOTES_TARGET` in `backend/src/db/seed.ts` before running it, or skip seeding and create a user manually (see "Creating a user without seeding" below).

Start the backend in dev mode (auto-restarts on file changes):
```bash
npm run dev
```
The API listens on **http://localhost:3000**, mounted under `/api/v1`.

Other backend scripts:
```bash
npm run build   # tsc compile to dist/
npm run start   # run compiled dist/index.js (production)
```

## 3. Frontend setup

Open a second terminal:
```bash
cd frontend
npm install
```

Create `frontend/.env` (or copy the example):
```bash
cp .env.example .env
```
It contains:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```
Change this if your backend runs on a different host/port.

Start the frontend dev server:
```bash
npm run dev
```
Vite will print the local URL (typically **http://localhost:5173**). Open it in a browser — you'll land on `/login`.

Other frontend scripts:
```bash
npm run build    # tsc + vite build → dist/
npm run preview  # preview the production build locally
npm run lint      # oxlint
```

## 4. Log in

Use credentials from the seed output (see step 2), or create a user manually if you skipped seeding.

### Creating a user without seeding

There's no signup UI or route — insert a user directly via the backend's DB connection. From `backend/`, with `.env` configured:
```bash
npx tsx -e '
import bcrypt from "bcrypt";
import { v7 as uuidv7 } from "uuid";
import { db } from "./src/db/index.js";
import { agency, agencyUser, user } from "./src/db/schema.js";

const agencyId = uuidv7();
const userId = uuidv7();
const password = await bcrypt.hash("Password123!", 10);

await db.insert(agency).values({ id: agencyId, companyName: "Test Agency" });
await db.insert(user).values({ id: userId, email: "you@example.com", password, name: "Test User", type: "agency_user" });
await db.insert(agencyUser).values({ userId, companyId: agencyId });

console.log("Login with you@example.com / Password123!");
process.exit(0);
'
```
Then log in at `/login` with `you@example.com` / `Password123!`. You'll still need at least one workspace to create notes — there's no create-workspace UI/route yet (see `docs/api-design.md`), so insert one the same way:
```bash
npx tsx -e '
import { v7 as uuidv7 } from "uuid";
import { db } from "./src/db/index.js";
import { workspace } from "./src/db/schema.js";

await db.insert(workspace).values({
  id: uuidv7(),
  name: "My Workspace",
  companyId: "<agencyId from above>",
  createdBy: "<userId from above>",
});
'
```

## Ports summary

| Service | URL | Configurable via |
|---|---|---|
| Backend API | http://localhost:3000 | hardcoded port in `backend/src/index.ts` |
| Frontend dev server | http://localhost:5173 (Vite default) | `vite.config.ts` / `--port` flag |
| PostgreSQL | localhost:5432 | `DATABASE_URL` in `backend/.env` |

## Notes

- The backend also runs a nightly cron job (`0 0 * * *`) that deletes note-history records older than 7 days — see `docs/cron.md`. It starts automatically with the server; no separate process to run.
- CORS is wide open (`hono/cors` with no options) and CSRF protection is enabled — if you point a frontend at the API from a non-default origin/port, requests should still work since CORS isn't restricted, but keep origins consistent with what `csrf()` expects.
- Request bodies are capped at 50KB (`bodyLimit` middleware) — large note content will be rejected with `413`.
