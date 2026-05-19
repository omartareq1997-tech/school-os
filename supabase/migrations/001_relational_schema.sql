-- Relational schema for School OS (Airtable-style linked records)
-- Run in Supabase SQL editor if not using CLI migrations.

create extension if not exists "pgcrypto";

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_working_days integer not null default 3,
  max_working_days integer not null default 5,
  max_hours_per_day integer not null default 6,
  unavailability text not null default '—',
  preferences text not null default '—',
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null default '—',
  students_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers (id) on delete cascade,
  subject_id uuid not null references subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete restrict,
  teacher_id uuid not null references teachers (id) on delete restrict,
  subject_id uuid not null references subjects (id) on delete restrict,
  day text not null,
  start_time text not null,
  end_time text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_teacher_subjects_teacher on teacher_subjects (teacher_id);
create index if not exists idx_teacher_subjects_subject on teacher_subjects (subject_id);
create index if not exists idx_timetable_entries_class on timetable_entries (class_id);
create index if not exists idx_timetable_entries_teacher on timetable_entries (teacher_id);
create index if not exists idx_timetable_entries_subject on timetable_entries (subject_id);
create index if not exists idx_timetable_entries_day on timetable_entries (day);

-- Optional: drop legacy text columns if migrating an existing project
-- alter table teachers drop column if exists subject;
-- alter table timetable_entries drop column if exists class;
-- alter table timetable_entries drop column if exists teacher;
-- alter table timetable_entries drop column if exists subject;

alter table subjects enable row level security;
alter table teachers enable row level security;
alter table classes enable row level security;
alter table teacher_subjects enable row level security;
alter table timetable_entries enable row level security;

create policy "Allow public read subjects" on subjects for select using (true);
create policy "Allow public insert subjects" on subjects for insert with check (true);
create policy "Allow public update subjects" on subjects for update using (true);
create policy "Allow public delete subjects" on subjects for delete using (true);

create policy "Allow public read teachers" on teachers for select using (true);
create policy "Allow public insert teachers" on teachers for insert with check (true);
create policy "Allow public update teachers" on teachers for update using (true);
create policy "Allow public delete teachers" on teachers for delete using (true);

create policy "Allow public read classes" on classes for select using (true);
create policy "Allow public insert classes" on classes for insert with check (true);
create policy "Allow public update classes" on classes for update using (true);
create policy "Allow public delete classes" on classes for delete using (true);

create policy "Allow public read teacher_subjects" on teacher_subjects for select using (true);
create policy "Allow public insert teacher_subjects" on teacher_subjects for insert with check (true);
create policy "Allow public update teacher_subjects" on teacher_subjects for update using (true);
create policy "Allow public delete teacher_subjects" on teacher_subjects for delete using (true);

create policy "Allow public read timetable_entries" on timetable_entries for select using (true);
create policy "Allow public insert timetable_entries" on timetable_entries for insert with check (true);
create policy "Allow public update timetable_entries" on timetable_entries for update using (true);
create policy "Allow public delete timetable_entries" on timetable_entries for delete using (true);
