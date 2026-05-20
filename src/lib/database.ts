import { supabase } from "@/lib/supabase"

export type Subject = {
  id: string
  name: string
}

export type Teacher = {
  id: string
  name: string
  minWorkingDays: number
  maxWorkingDays: number
  maxHoursPerDay: number
  unavailability: string
  preferences: string
  subjects: Subject[]
}

export type SchoolClass = {
  id: string
  name: string
  grade: string
  studentsCount: number
}

export type TimetableEntry = {
  id: string
  classId: string
  teacherId: string
  subjectId: string
  className: string
  teacherName: string
  subjectName: string
  day: string
  startTime: string
  endTime: string
}

type TeacherSubjectRow = {
  subject_id: string
  subjects: { id: string; name: string } | { id: string; name: string }[] | null
}

type TeacherRow = {
  id: string
  name: string
  min_working_days: number
  max_working_days: number
  max_hours_per_day: number
  unavailability: string
  preferences: string
  teacher_subjects?: TeacherSubjectRow[] | null
}

type TimetableRow = {
  id: string
  class_id: string
  teacher_id: string
  subject_id: string
  day: string
  start_time: string
  end_time: string
  classes: { id: string; name: string } | { id: string; name: string }[] | null
  teachers: { id: string; name: string } | { id: string; name: string }[] | null
  subjects: { id: string; name: string } | { id: string; name: string }[] | null
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function normalizeTime(value: string): string {
  if (!value) return ""
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value.trim()
  return `${match[1].padStart(2, "0")}:${match[2]}`
}

function mapTeacherRow(row: TeacherRow): Teacher {
  const subjects: Subject[] = []
  for (const link of row.teacher_subjects ?? []) {
    const subject = unwrapRelation(link.subjects)
    if (subject) {
      subjects.push({ id: subject.id, name: subject.name })
    }
  }
  return {
    id: row.id,
    name: row.name,
    minWorkingDays: row.min_working_days,
    maxWorkingDays: row.max_working_days,
    maxHoursPerDay: row.max_hours_per_day,
    unavailability: row.unavailability,
    preferences: row.preferences,
    subjects,
  }
}

function mapTimetableRow(row: TimetableRow): TimetableEntry {
  const schoolClass = unwrapRelation(row.classes)
  const teacher = unwrapRelation(row.teachers)
  const subject = unwrapRelation(row.subjects)
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    subjectId: row.subject_id,
    className: schoolClass?.name ?? "—",
    teacherName: teacher?.name ?? "—",
    subjectName: subject?.name ?? "—",
    day: row.day,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
  }
}

export async function fetchSubjects(schoolId: string | null): Promise<Subject[]> {
  if (!schoolId) return []

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name")

  if (error) {
    console.error("Failed to load subjects:", error.message, error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))
}

export async function fetchTeachers(schoolId: string | null): Promise<Teacher[]> {
  if (!schoolId) return []

  const { data, error } = await supabase
    .from("teachers")
    .select(
      `
      id,
      name,
      min_working_days,
      max_working_days,
      max_hours_per_day,
      unavailability,
      preferences,
      teacher_subjects (
        subject_id,
        subjects ( id, name )
      )
    `
    )
    .eq("school_id", schoolId)
    .order("name")

  if (error) {
    console.error("Failed to load teachers:", error.message, error)
    return []
  }

  return (data as TeacherRow[]).map(mapTeacherRow)
}

export async function fetchClasses(schoolId: string | null): Promise<SchoolClass[]> {
  if (!schoolId) return []

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, grade, students_count")
    .eq("school_id", schoolId)
    .order("name")

  if (error) {
    console.error("Failed to load classes:", error.message, error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    grade: row.grade,
    studentsCount: row.students_count,
  }))
}

export async function fetchTimetableEntries(schoolId: string | null): Promise<TimetableEntry[]> {
  if (!schoolId) return []

  const { data, error } = await supabase
    .from("timetable_entries")
    .select(
      `
      id,
      class_id,
      teacher_id,
      subject_id,
      day,
      start_time,
      end_time,
      classes ( id, name ),
      teachers ( id, name ),
      subjects ( id, name )
    `
    )
    .eq("school_id", schoolId)
    .order("day")
    .order("start_time")

  if (error) {
    console.error("Failed to load timetable entries:", error.message, error)
    return []
  }

  return (data as TimetableRow[]).map(mapTimetableRow)
}

export async function syncTeacherSubjects(
  teacherId: string,
  subjectIds: string[]
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("teacher_subjects")
    .delete()
    .eq("teacher_id", teacherId)

  if (deleteError) {
    console.error("Failed to clear teacher subjects:", deleteError.message, deleteError)
    return false
  }

  if (subjectIds.length === 0) return true

  const { error: insertError } = await supabase.from("teacher_subjects").insert(
    subjectIds.map((subjectId) => ({
      teacher_id: teacherId,
      subject_id: subjectId,
    }))
  )

  if (insertError) {
    console.error("Failed to link teacher subjects:", insertError.message, insertError)
    return false
  }

  return true
}

export type TeacherPayload = {
  name: string
  minWorkingDays: number
  maxWorkingDays: number
  maxHoursPerDay: number
  unavailability: string
  preferences: string
}

export function teacherToDb(payload: TeacherPayload, schoolId: string) {
  return {
    school_id: schoolId,
    name: payload.name,
    min_working_days: payload.minWorkingDays,
    max_working_days: payload.maxWorkingDays,
    max_hours_per_day: payload.maxHoursPerDay,
    unavailability: payload.unavailability,
    preferences: payload.preferences,
  }
}

export type TimetablePayload = {
  classId: string
  teacherId: string
  subjectId: string
  day: string
  startTime: string
  endTime: string
}

export function timetableToDb(payload: TimetablePayload, schoolId: string) {
  return {
    school_id: schoolId,
    class_id: payload.classId,
    teacher_id: payload.teacherId,
    subject_id: payload.subjectId,
    day: payload.day,
    start_time: payload.startTime,
    end_time: payload.endTime,
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardStats = {
  teachersCount: number
  classesCount: number
  subjectsCount: number
  timetableEntriesCount: number
}

export type RecentActivityItem = {
  id: string
  name: string
  createdAt: string | null
}

export type RecentTimetableItem = {
  id: string
  subjectName: string
  className: string
  day: string
  createdAt: string | null
}

export type RecentActivity = {
  latestTeacher: RecentActivityItem | null
  latestClass: RecentActivityItem | null
  latestEntry: RecentTimetableItem | null
}

type RecentEntryRow = {
  id: string
  day: string
  created_at: string | null
  subjects: { name: string } | { name: string }[] | null
  classes: { name: string } | { name: string }[] | null
}

export async function fetchDashboardStats(schoolId: string | null): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  if (!schoolId) return { data: null, error: "No school assigned" }

  const [teachers, classes, subjects, entries] = await Promise.all([
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("subjects").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("timetable_entries").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
  ])

  const firstError =
    teachers.error?.message ??
    classes.error?.message ??
    subjects.error?.message ??
    entries.error?.message

  if (firstError) {
    return { data: null, error: firstError }
  }

  return {
    data: {
      teachersCount: teachers.count ?? 0,
      classesCount: classes.count ?? 0,
      subjectsCount: subjects.count ?? 0,
      timetableEntriesCount: entries.count ?? 0,
    },
    error: null,
  }
}

async function queryRecentRow(
  table: "teachers" | "classes" | "timetable_entries",
  selectCols: string,
  schoolId: string
) {
  // Try ordering by created_at first. If the column doesn't exist (pre-migration),
  // fall back to ordering by id so the query still returns a row.
  const withTimestamp = await supabase
    .from(table)
    .select(selectCols)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!withTimestamp.error) return withTimestamp

  // PostgREST returns code "42703" (undefined_column) when the column is missing.
  // Fall back to id ordering and omit created_at from the select.
  const fallbackCols = selectCols
    .split(",")
    .map((c) => c.trim())
    .filter((c) => !c.startsWith("created_at"))
    .join(", ")

  return supabase
    .from(table)
    .select(fallbackCols)
    .eq("school_id", schoolId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function fetchRecentActivity(schoolId: string | null): Promise<{
  data: RecentActivity | null
  error: string | null
}> {
  if (!schoolId) return { data: null, error: "No school assigned" }

  const [teacherRes, classRes, entryRes] = await Promise.all([
    queryRecentRow("teachers", "id, name, created_at", schoolId),
    queryRecentRow("classes", "id, name, created_at", schoolId),
    queryRecentRow(
      "timetable_entries",
      "id, day, created_at, subjects(name), classes(name)",
      schoolId
    ),
  ])

  const firstError =
    teacherRes.error?.message ??
    classRes.error?.message ??
    entryRes.error?.message

  if (firstError) {
    return { data: null, error: firstError }
  }

  const teacher = teacherRes.data as {
    id: string
    name: string
    created_at?: string | null
  } | null
  const schoolClass = classRes.data as {
    id: string
    name: string
    created_at?: string | null
  } | null
  const entry = entryRes.data as RecentEntryRow | null

  return {
    data: {
      latestTeacher: teacher
        ? { id: teacher.id, name: teacher.name, createdAt: teacher.created_at ?? null }
        : null,
      latestClass: schoolClass
        ? { id: schoolClass.id, name: schoolClass.name, createdAt: schoolClass.created_at ?? null }
        : null,
      latestEntry: entry
        ? {
            id: entry.id,
            subjectName: unwrapRelation(entry.subjects)?.name ?? "—",
            className: unwrapRelation(entry.classes)?.name ?? "—",
            day: entry.day,
            createdAt: entry.created_at ?? null,
          }
        : null,
    },
    error: null,
  }
}
