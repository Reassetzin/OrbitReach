# Studio Portal

Client management dashboard + client portal built with Next.js 14, Supabase, TypeScript.

## Setup

### 1. Create a Supabase project
Go to https://supabase.com → New project. Save your project URL and anon key.

### 2. Run the database schema
In Supabase → SQL Editor, paste and run the contents of `supabase/schema.sql`.
**Important:** at the bottom of the file, replace `your@email.com` with your actual admin email.

### 3. Configure environment variables
Copy `.env.local` and fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=        # from Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # from Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=       # from Supabase → Settings → API (keep secret)
NEXT_PUBLIC_ADMIN_EMAIL=         # your email — this account gets admin access
```

### 4. Create your admin account
In Supabase → Authentication → Users → Invite user.
Use the same email you put in `NEXT_PUBLIC_ADMIN_EMAIL`.
Then set a password via the invite email.

### 5. Install and run
```bash
npm install
npm run dev
```
Open http://localhost:3000 → you'll be redirected to /login.

---

## Adding a client

1. Go to /admin/clients → Add client
2. Fill in name, email, plan details
3. In Supabase → Authentication → Invite user with the client's email
4. Copy the new user's ID from Supabase → Authentication → Users
5. In Supabase → Table Editor → clients → find the client row → paste the user ID into `user_id`
6. Send the client their login link — they go to your-domain.com/login

> **Coming soon:** The "Add client" flow will handle steps 3-5 automatically using the service role key.

---

## Project structure

```
app/
  login/          — shared login page
  admin/          — admin dashboard (you only)
    dashboard/    — overview, metrics, recent activity
    clients/      — client list + individual client pages
    tasks/        — kanban board per client
    revenue/      — MRR, payments, chart
    requests/     — all client requests with accept/decline
  portal/         — client portal (clients only)
    home/         — dashboard with progress, action items
    tasks/        — action items assigned by you
    request/      — submit change requests
    messages/     — direct messaging
    billing/      — plan info, payment history
components/
  admin/          — sidebar, cards, rows, page header
  portal/         — portal nav, mobile nav
supabase/
  client.ts       — browser supabase client
  server.ts       — server supabase client
  schema.sql      — full DB schema (run this first)
types/
  index.ts        — all TypeScript types
middleware.ts     — auth + role-based routing
```

## Deploying to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all `.env.local` variables in Vercel → Settings → Environment Variables
4. Deploy

Your portal will be live at `your-project.vercel.app`.
