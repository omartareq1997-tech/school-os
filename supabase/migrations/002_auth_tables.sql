-- Phase 2: schools + profiles + helper functions + sign-up trigger + seed data.
-- Safe to run multiple times (all statements are idempotent).
-- Run this in the Supabase SQL editor (requires access to the auth schema).

-- ─── Schools (tenants) ────────────────────────────────────────────────────────

create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,       -- URL-safe identifier, e.g. "lincoln-high"
  created_at timestamptz not null default now()
);

alter table public.schools enable row level security;

-- Phase 2: any authenticated user can read schools.
-- Phase 4 will narrow this to own-school only.
drop policy if exists "authenticated users can read schools" on public.schools;
create policy "authenticated users can read schools"
  on public.schools for select
  using (auth.uid() is not null);

-- ─── Profiles (extends auth.users) ───────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  school_id  uuid references public.schools(id) on delete set null,
  role       text not null default 'owner'
               check (role in ('owner', 'admin', 'teacher')),
  full_name  text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can only read and update their own profile row.
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Index for efficient school-based lookups (used in Phase 4 RLS policies).
create index if not exists idx_profiles_school on public.profiles(school_id);

-- ─── Helper functions ─────────────────────────────────────────────────────────
-- security definer + set search_path = '' prevents search-path injection.
-- These are called from RLS policies in Phase 4 — keeping them stable here.

create or replace function public.my_school_id()
  returns uuid language sql stable security definer set search_path = ''
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
  returns text language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Returns true when the current user is an owner or admin.
create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role in ('owner', 'admin') from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ─── Sign-up trigger ──────────────────────────────────────────────────────────
-- Creates a profile row automatically whenever a new user is inserted into
-- auth.users (email sign-up, Google OAuth, magic link, etc.).

create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Backfill existing users ──────────────────────────────────────────────────
-- Users who signed up before this migration (Phase 1 testers) don't have
-- profile rows yet. Create them now.

insert into public.profiles (id, full_name)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- ─── Default school seed ──────────────────────────────────────────────────────
-- A fixed UUID lets later migrations reference this school predictably.
-- All existing data (teachers, classes, subjects, timetable entries) belongs
-- to this school until Phase 3 adds proper school creation to the signup flow.

insert into public.schools (id, name, slug)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default School',
  'default'
)
on conflict (id) do nothing;

-- Assign every profile that has no school to the default school.
-- Mark them as owners so they retain full write access through Phase 3.
update public.profiles
set
  school_id = '00000000-0000-0000-0000-000000000001'::uuid,
  role      = 'owner'
where school_id is null;
