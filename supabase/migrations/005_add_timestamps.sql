-- Add created_at timestamps to operational tables if they don't already exist.
-- Migration 001 declared these columns but they may be absent if tables were
-- created via the Supabase UI or an earlier version of the schema.
-- Using "add column if not exists" makes this safe to run more than once.

alter table public.teachers
  add column if not exists created_at timestamptz not null default now();

alter table public.classes
  add column if not exists created_at timestamptz not null default now();

alter table public.subjects
  add column if not exists created_at timestamptz not null default now();

alter table public.timetable_entries
  add column if not exists created_at timestamptz not null default now();
