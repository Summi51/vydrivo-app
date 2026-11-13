-- Vydrivo project idea fields.
-- Run this in the Supabase SQL editor after 0001_projects.sql.
-- Additive only: authentication, ownership and RLS are unchanged.

alter table public.projects
  add column if not exists audience text not null default '' check (char_length(audience) <= 500),
  add column if not exists notes text not null default '' check (char_length(notes) <= 20000),
  add column if not exists voice_preset text not null default 'daniel-test' check (char_length(voice_preset) between 1 and 60);

comment on column public.projects.audience is 'Optional audience description for the idea step.';
comment on column public.projects.notes is 'Optional pasted notes for the idea step.';
comment on column public.projects.voice_preset is 'Selected narration voice preset; synthesis access is verified separately.';
