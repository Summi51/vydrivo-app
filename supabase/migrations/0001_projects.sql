-- Vydrivo project persistence, first slice.
-- Run this in the Supabase SQL editor for the project used by the app.
-- The browser never receives the database service role; API requests use the
-- signed-in user's access token and Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  topic text not null check (char_length(topic) between 1 and 10000),
  format text not null default 'Talking head / explainer' check (char_length(format) between 1 and 80),
  format_id text not null default 'talking-head' check (char_length(format_id) between 1 and 40),
  target_seconds integer not null default 90 check (target_seconds between 60 and 90),
  target_label text not null default '60–90s' check (char_length(target_label) between 1 and 20),
  aspect text not null default '9:16' check (aspect in ('9:16', '16:9')),
  storyboard jsonb,
  review_approved boolean not null default false,
  storyboard_hash text,
  status text not null default 'draft' check (status in ('draft', 'planning', 'approved', 'generating', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'Owner-scoped Vydrivo project brief and current storyboard. Media files belong in private object storage.';

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create or replace function public.touch_projects_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_projects_updated_at();

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;
