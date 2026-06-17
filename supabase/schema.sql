-- ============================================================
-- Studio Portal — Supabase Schema
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- Enable RLS
alter database postgres set "app.jwt_secret" to 'your-jwt-secret';

-- ── CLIENTS ──────────────────────────────────────────────────
create table clients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  type              text not null default 'Custom',
  location          text,
  contact           text,
  email             text not null,
  setup_fee         integer not null default 0,
  monthly_retainer  integer not null default 0,
  status            text not null default 'pending' check (status in ('active','review','pending')),
  next_payment      text,
  monthly_revisions integer not null default 5,
  revisions_used    integer not null default 0,
  progress_step     integer not null default 1,
  user_id           uuid references auth.users(id) on delete set null,
  created_at        timestamptz default now()
);

-- RLS: admin sees all, clients see only their own row
alter table clients enable row level security;
create policy "Admin full access" on clients for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own row" on clients for select using (auth.uid() = user_id);

-- ── TASKS (admin task board) ──────────────────────────────────
create table tasks (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  status     text not null default 'backlog' check (status in ('backlog','in_progress','in_review','done')),
  meta       text,
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Admin full access" on tasks for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own tasks" on tasks for select using (
  client_id in (select id from clients where user_id = auth.uid())
);

-- ── CLIENT TASKS (tasks assigned TO the client) ───────────────
create table client_tasks (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  emoji       text not null default '📋',
  title       text not null,
  description text,
  type        text not null default 'text' check (type in ('file','text','review')),
  done        boolean not null default false,
  response    text,
  file_url    text,
  created_at  timestamptz default now()
);

alter table client_tasks enable row level security;
create policy "Admin full access" on client_tasks for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own" on client_tasks for select using (
  client_id in (select id from clients where user_id = auth.uid())
);
create policy "Client updates own" on client_tasks for update using (
  client_id in (select id from clients where user_id = auth.uid())
);

-- ── REQUESTS ─────────────────────────────────────────────────
create table requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,
  description text,
  link        text,
  file_url    text,
  status      text not null default 'pending' check (status in ('pending','accepted','backlog','declined')),
  created_at  timestamptz default now()
);

alter table requests enable row level security;
create policy "Admin full access" on requests for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own" on requests for select using (
  client_id in (select id from clients where user_id = auth.uid())
);
create policy "Client inserts own" on requests for insert with check (
  client_id in (select id from clients where user_id = auth.uid())
);

-- ── MESSAGES ─────────────────────────────────────────────────
create table messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  from_admin  boolean not null default false,
  text        text not null,
  created_at  timestamptz default now()
);

alter table messages enable row level security;
create policy "Admin full access" on messages for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own" on messages for select using (
  client_id in (select id from clients where user_id = auth.uid())
);
create policy "Client inserts own" on messages for insert with check (
  client_id in (select id from clients where user_id = auth.uid())
  and from_admin = false
);

-- ── REALTIME ─────────────────────────────────────────────────
-- Enable realtime on messages so they appear instantly
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table requests;

-- ── STORAGE ──────────────────────────────────────────────────
-- Create a bucket for client file uploads
insert into storage.buckets (id, name, public) values ('client-files', 'client-files', false);

-- Policy: clients can upload to their own folder (client_id/filename)
create policy "Client uploads own files" on storage.objects for insert with check (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] in (
    select id::text from clients where user_id = auth.uid()
  )
);
create policy "Client reads own files" on storage.objects for select using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] in (
    select id::text from clients where user_id = auth.uid()
  )
);
create policy "Admin full storage access" on storage.objects for all using (
  bucket_id = 'client-files'
  and auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
);

-- ── SET ADMIN EMAIL ──────────────────────────────────────────
-- Replace with your actual admin email
alter database postgres set "app.admin_email" to 'your@email.com';

-- ── INVOICES ─────────────────────────────────────────────────
create table invoices (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  number      text not null,
  status      text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  due_date    text,
  items       jsonb not null default '[]',
  total       integer not null default 0,
  notes       text,
  created_at  timestamptz default now()
);

alter table invoices enable row level security;
create policy "Admin full access" on invoices for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "Client sees own" on invoices for select using (
  client_id in (select id from clients where user_id = auth.uid())
);

-- ── PROPOSALS ────────────────────────────────────────────────
create table proposals (
  id            uuid primary key default gen_random_uuid(),
  prospect_name text not null,
  prospect_email text,
  project_name  text not null,
  scope         jsonb not null default '[]',
  timeline      text,
  total         integer not null default 0,
  status        text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
  notes         text,
  created_at    timestamptz default now()
);

alter table proposals enable row level security;
create policy "Admin full access" on proposals for all using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
