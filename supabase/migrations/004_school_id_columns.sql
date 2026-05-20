-- Phase 4a: add school_id to all operational tables for multi-school isolation.
-- Permissive RLS policies from migration 001 remain untouched.
-- Run migration 005 (strict RLS) only after Phase 4b frontend changes are deployed.

-- ─── Add school_id columns (nullable initially so the backfill can run) ────────

alter table public.subjects
  add column if not exists school_id uuid
    references public.schools(id) on delete cascade;

alter table public.teachers
  add column if not exists school_id uuid
    references public.schools(id) on delete cascade;

alter table public.classes
  add column if not exists school_id uuid
    references public.schools(id) on delete cascade;

alter table public.timetable_entries
  add column if not exists school_id uuid
    references public.schools(id) on delete cascade;

-- teacher_subjects has no school_id — isolation is derived via teacher_id → teachers.school_id.

-- ─── Backfill existing rows to the default school ────────────────────────────

update public.subjects
  set school_id = '00000000-0000-0000-0000-000000000001'
  where school_id is null;

update public.teachers
  set school_id = '00000000-0000-0000-0000-000000000001'
  where school_id is null;

update public.classes
  set school_id = '00000000-0000-0000-0000-000000000001'
  where school_id is null;

update public.timetable_entries
  set school_id = '00000000-0000-0000-0000-000000000001'
  where school_id is null;

-- ─── Enforce NOT NULL now that backfill is complete ───────────────────────────

alter table public.subjects          alter column school_id set not null;
alter table public.teachers          alter column school_id set not null;
alter table public.classes           alter column school_id set not null;
alter table public.timetable_entries alter column school_id set not null;

-- ─── Fix subjects unique constraint (was global, now per-school) ──────────────

alter table public.subjects drop constraint if exists subjects_name_key;
alter table public.subjects
  add constraint subjects_school_name_unique unique (school_id, name);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_subjects_school
  on public.subjects(school_id);

create index if not exists idx_teachers_school
  on public.teachers(school_id);

create index if not exists idx_classes_school
  on public.classes(school_id);

create index if not exists idx_timetable_entries_school
  on public.timetable_entries(school_id);
