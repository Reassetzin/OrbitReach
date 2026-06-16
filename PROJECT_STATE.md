# OrbitReach Studio Portal — Project State
**Last updated:** v1.2.1

## Live URLs
- **Site:** https://orbit-reach-sigma.vercel.app
- **GitHub:** https://github.com/Reassetzin/OrbitReach
- **Supabase:** https://pjzyhyuijjmqdfucxuui.supabase.co

## How Claude pushes changes
```bash
cd /home/claude/OrbitReach
git add -A && git commit -m "Claude: description" && git push
```
Token stored in remote URL. Vercel auto-deploys (~60s). Always bump version in `app/login/page.tsx`.

**Current version:** v1.2.1

## Auth
- Admin: joao@sundegomes.com
- Test client: test@orbit.com (UID: 978a4787-0dfe-4a80-8316-2ec326450ad0)
- NEXT_PUBLIC_ADMIN_EMAIL=joao@sundegomes.com

## Tech Stack
- Next.js 14.2.3, TypeScript, Supabase (auth+db+realtime), Vercel
- No CSS framework — all inline styles + `<style>` tags
- `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` in next.config.js

## Project Structure
```
app/
  layout.tsx                    — root layout with viewport meta
  login/page.tsx                — login with role-based redirect + version number
  page.tsx                      — root redirect
  admin/
    layout.tsx                  — minimal wrapper (no sidebar/nav — removed)
    dashboard/page.tsx          — SINGLE PAGE admin: metrics, clients, kanban tasks, requests, revenue
    clients/page.tsx            — clients list
    clients/new/page.tsx        — add client form
    clients/[id]/page.tsx       — single page client detail with anchor nav
  portal/
    layout.tsx                  — portal wrapper with PortalNav
    home/page.tsx               — SINGLE PAGE portal: hero, progress, tasks, requests, messages, billing
components/
  admin/
    Sidebar.tsx                 — UNUSED (layout simplified)
    MobileNav.tsx               — UNUSED (layout simplified)
    MobileHeader.tsx            — UNUSED (layout simplified)
  portal/
    PortalNav.tsx               — simple header bar (no tabs)
    PortalMobileNav.tsx         — returns null
middleware.ts                   — disabled (matcher: [])
supabase/client.ts + server.ts
```

## Database Tables
- **clients**: id, name, type, location, contact, email, setup_fee, monthly_retainer, monthly_revisions, revisions_used, progress_step (0-3), status (active/review/pending), next_payment, user_id, created_at
- **tasks**: id, client_id, title, done, status (backlog/in_progress/in_review/done), created_at
- **client_tasks**: id, client_id, emoji, title, description, type (file/text/review), done, response, created_at
- **requests**: id, client_id, title, description, link, file_url, status (pending/accepted/backlog/declined), created_at
- **messages**: id, client_id, from_admin (bool), text, created_at

## RLS Policies
```sql
create policy "Authenticated full access" on clients for all using (auth.role() = 'authenticated');
-- same for tasks, client_tasks, requests, messages
```

## Adding a Client (Full Workflow)
1. Admin dashboard → + Add client → fill form → save
2. Supabase → Authentication → Add user → Create new user (email + password, Auto Confirm)
3. SQL: `update clients set user_id = 'UUID' where email = 'client@email.com';`
4. Client logs in → lands on /portal/home

## Admin Dashboard (single page)
- Top bar: Studio logo, + Add client, Sign out
- Anchor nav: Overview | Clients | Tasks | Requests | Revenue
- Metric cards: MRR, Active Clients, Open Tasks, New Requests
- Clients list: click row → client detail page
- Tasks kanban: one column per client, swipe on mobile
- Requests: pending/all toggle, accept/backlog/decline inline
- Revenue: MRR cards + client breakdown

## Client Detail Page (/admin/clients/[id])
- Header: back to clients, name, status pill, pending requests badge
- Anchor nav: Status & progress | Tasks | Actions | Messages | Billing
- Status buttons: Active / In Review / Pending (saves instantly)
- Progress buttons: Submitted / In Progress / In Review / Completed (controls portal progress bar)
- Your tasks: internal admin tasks, check off, add inline
- Client action items: assign tasks to client (emoji, title, description, type), see responses, delete
- Messages: live chat via Supabase Realtime (subscribe inside .then() AFTER initial data load)
- Billing: info grid + revision manager with +/- controls and reset button
- Request history: slide-in panel from right

## Portal (single page /portal/home)
- Hero banner: purple gradient, client name, plan, tasks/revisions/payment
- Website progress: 4-step indicator (admin controls via progress_step)
- Action items: pending tasks, click → bottom sheet modal with file attach + text response
- Submit request: title, description, link, file, revision progress bar, history slide panel
- Messages: live chat, Supabase Realtime
- Billing: 2x2 info grid, Update card / Cancel plan buttons

## Realtime Chat Fix (Critical)
Subscribe to channel INSIDE the `.then()` after initial data load completes:
```js
Promise.all([...]).then(([...]) => {
  setMessages(m.data ?? [])
  setLoading(false)
  // Subscribe HERE — after setMessages — so new messages append correctly
  channel = supabase.channel('name').on('postgres_changes', ...).subscribe()
})
return () => { if (channel) supabase.removeChannel(channel) }
```

## Login Flow
- Admin email → /admin/dashboard
- Email with matching user_id in clients table → /portal/home
- Middleware disabled, login page handles routing

## Vercel Env Vars
- NEXT_PUBLIC_SUPABASE_URL = https://pjzyhyuijjmqdfucxuui.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY = (set)
- SUPABASE_SERVICE_ROLE_KEY = (set)
- NEXT_PUBLIC_ADMIN_EMAIL = joao@sundegomes.com

## GitHub Token
Provide fresh token to Claude in new chat — don't store here.

## Known Working
- Login → role-based redirect
- Add client form → saves to Supabase
- Client detail → all sections working
- Realtime chat → both sides instant
- Portal → all sections working
- Mobile → fully responsive, clean on iPhone

## Pending / Next Steps
- Wire actual file uploads to Supabase Storage (currently captures filename only)
- Add Stripe integration for billing
- Monthly revision reset automation (currently manual Reset button)
- Admin "Add client" should auto-invite via Supabase auth email
