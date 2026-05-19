import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "teacher"

export type School = {
  id: string
  name: string
  slug: string
  createdAt: string
}

export type Profile = {
  id: string
  schoolId: string | null
  role: UserRole
  fullName: string
  createdAt: string
  updatedAt: string
}

// ─── Internal row shapes ──────────────────────────────────────────────────────

type ProfileRow = {
  id: string
  school_id: string | null
  role: string
  full_name: string
  created_at: string
  updated_at: string
}

type SchoolRow = {
  id: string
  name: string
  slug: string
  created_at: string
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    schoolId: row.school_id,
    role: row.role as UserRole,
    fullName: row.full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  }
}

// ─── Client-side helpers ──────────────────────────────────────────────────────
// Use these in "use client" components and event handlers.
// For Route Handlers use createSupabaseServerClient() from supabase-server.ts.

/** Fetch the profile for the currently signed-in user. Returns null if not authenticated. */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data) return null
  return mapProfile(data as ProfileRow)
}

/** Fetch a school by its ID. */
export async function fetchSchool(schoolId: string): Promise<School | null> {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, slug, created_at")
    .eq("id", schoolId)
    .maybeSingle()

  if (error || !data) return null
  return mapSchool(data as SchoolRow)
}

/** Fetch the school assigned to the currently signed-in user. */
export async function fetchCurrentSchool(): Promise<School | null> {
  const profile = await fetchCurrentProfile()
  if (!profile?.schoolId) return null
  return fetchSchool(profile.schoolId)
}

/** Returns true if the current user's role is owner or admin. */
export async function currentUserIsStaff(): Promise<boolean> {
  const profile = await fetchCurrentProfile()
  return profile?.role === "owner" || profile?.role === "admin"
}
