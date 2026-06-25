# Running locally & deploying

This app runs on **Postgres (Neon)** + **Auth.js login** + **Vercel Blob** for
photos. Below: how to run it on your machine first, then how to put it online.

---

## Part 1 — Run it locally

### What you need

- **Node 20+** and this repo cloned.
- A **Postgres database**. Use a free **Neon** database — the app's DB driver
  (`@prisma/adapter-neon`) talks to Neon over WebSockets, so a plain local
  Postgres / Docker Postgres will **not** work without extra proxy setup. A free
  Neon project is the easy path and matches production exactly.
- (Optional) A **Vercel Blob** token — only needed if you want to test **photo
  uploads** locally. Everything else works without it.

### Step 1 — Create a free Neon database

1. Go to <https://neon.tech>, sign up, create a project.
2. In the project's **Connection Details**, copy **two** connection strings:
   - the **pooled** one (host contains `-pooler`) → use for `DATABASE_URL`
   - the **direct/unpooled** one → use for `DIRECT_DATABASE_URL`
   - If it only shows one, toggle "Pooled connection" to see both.

> Tip: you can create a separate Neon **branch** (e.g. `dev`) so local testing
> doesn't touch production data. For now, one database is fine.

### Step 2 — Create your `.env`

```bash
cp .env.example .env
```

Then edit `.env` and fill in:

```dotenv
DATABASE_URL="postgresql://...-pooler...neon.tech/...?sslmode=require"
DIRECT_DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
AUTH_SECRET="paste-a-random-secret-here"
```

Generate `AUTH_SECRET` with either:

```bash
npx auth secret          # writes it into .env.local automatically
# or
openssl rand -base64 32  # copy the output into .env
```

`AUTH_URL` is optional locally (defaults to `http://localhost:3000`).

**Photos (optional):** to test uploads, set `BLOB_READ_WRITE_TOKEN`. The simplest
way is to create a Vercel project + Blob store and run `vercel env pull .env.local`.
Skip this if you don't need photos yet — the rest of the app works fine.

### Step 3 — Install, set up the DB, run

```bash
npm install                  # also runs `prisma generate`
npx prisma migrate deploy    # applies the migration to your Neon DB
npm run db:seed              # loads peptides, preset stacks + a demo login
npm run dev                  # http://localhost:3000
```

### Step 4 — Log in

Open <http://localhost:3000> — you'll be redirected to **/login**. Use the demo
account the seed created:

- **Email:** `local@peptides.app`
- **Password:** `peptides123`

…or click **Sign up** to make your own account. Each account is isolated and can
hold multiple profiles (e.g. you + a partner), switchable from the sidebar.

### Handy commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest unit tests
npm run test:e2e     # playwright (logs in via the demo account first)
npm run db:studio    # browse the database
npm run db:seed      # re-seed (idempotent)
```

### Notes / gotchas

- **`npx prisma migrate deploy`** just applies existing migrations (no shadow DB)
  — use it for setup. Use **`npm run db:migrate`** (`prisma migrate dev`) only
  when you _change_ `schema.prisma` and want to author a new migration.
- Change or remove the demo login (`SEED_ACCOUNT_EMAIL` / `SEED_ACCOUNT_PASSWORD`
  env vars, see `prisma/seed.ts`) before sharing the app widely.

---

## Part 2 — Deploy to Vercel (free)

Hosts on **Vercel** with **Neon Postgres**, **Vercel Blob**, and **Auth.js** —
all free tiers. Vercel auto-redeploys on every push; **no GitHub Actions needed**.

1. **Push to GitHub.** Commit and push this repo to a GitHub repository.
2. **Neon:** reuse your project (or its `main` branch) and grab the pooled +
   direct connection strings.
3. **Import the repo into Vercel** (New Project → pick the GitHub repo).
4. **Add Environment Variables** (Project → Settings → Environment Variables):
   - `DATABASE_URL` = Neon **pooled** URL
   - `DIRECT_DATABASE_URL` = Neon **direct** URL
   - `AUTH_SECRET` = output of `npx auth secret`
   - `AUTH_URL` = your `https://<app>.vercel.app`
   - Enable **Blob** under the **Storage** tab → it sets `BLOB_READ_WRITE_TOKEN`.
5. **Build command** — already preconfigured in `vercel.json`
   (`prisma migrate deploy && prisma generate && next build`), so it applies
   migrations on every deploy. No dashboard change needed.
6. **Seed once** against the production DB (from your machine):
   ```bash
   DIRECT_DATABASE_URL="<neon-direct-url>" npm run db:seed
   ```
7. **Deploy.** Open the URL, sign up, and share it with friends. Every push to the
   default branch redeploys automatically.

### What's where (for later reference)

- DB client + Neon adapter: `src/lib/db.ts`; schema: `prisma/schema.prisma`.
- Auth: `src/auth.ts`, `src/auth.config.ts`, gating in `src/proxy.ts`; pages at
  `/login`, `/signup`; actions in `src/lib/actions/auth.ts`.
- Photos → Vercel Blob: `src/lib/actions/photos.ts`.
- Accounts own profiles; data is scoped by `accountId` in `src/lib/active-user.ts`
  and `src/lib/actions/profiles.ts`.
- More detail: `CLAUDE.md` → "Deployment & auth".
