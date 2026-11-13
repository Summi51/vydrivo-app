-- Vydrivo saved idea directions, cross-device slice.
-- Run this in the Supabase SQL editor. Until it is applied, the app falls back
-- to the browser cache and idea generation still works.

create table if not exists public.project_idea_suggestions (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  suggestions jsonb not null,
  source_topic text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_idea_suggestions_array check (jsonb_typeof(suggestions) = 'array'),
  constraint project_idea_suggestions_topic check (char_length(source_topic) <= 2000)
);

comment on table public.project_idea_suggestions is 'Latest AI idea directions saved per project; the browser cache is a fallback.';

alter table public.project_idea_suggestions enable row level security;

drop policy if exists "idea_suggestions_select_own" on public.project_idea_suggestions;
create policy "idea_suggestions_select_own"
on public.project_idea_suggestions for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "idea_suggestions_insert_own" on public.project_idea_suggestions;
create policy "idea_suggestions_insert_own"
on public.project_idea_suggestions for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "idea_suggestions_update_own" on public.project_idea_suggestions;
create policy "idea_suggestions_update_own"
on public.project_idea_suggestions for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "idea_suggestions_delete_own" on public.project_idea_suggestions;
create policy "idea_suggestions_delete_own"
on public.project_idea_suggestions for delete
to authenticated
using (owner_id = (select auth.uid()));

drop trigger if exists idea_suggestions_touch_updated_at on public.project_idea_suggestions;
create trigger idea_suggestions_touch_updated_at
before update on public.project_idea_suggestions
for each row execute function public.touch_projects_updated_at();

revoke all on public.project_idea_suggestions from anon;
grant select, insert, update, delete on public.project_idea_suggestions to authenticated;
