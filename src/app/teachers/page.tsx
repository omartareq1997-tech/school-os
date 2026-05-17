"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Bot,
  CalendarDays,
  Check,
  GraduationCap,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react"

type Teacher = {
  id: string
  name: string
  subject: string
  minWorkingDays: number
  maxWorkingDays: number
  maxHoursPerDay: number
  unavailability: string
  preferences: string
}

type TeacherRow = Record<string, unknown>

function mapRowToTeacher(row: TeacherRow): Teacher {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "New Teacher"),
    subject: String(row.subject ?? "—"),
    minWorkingDays: Number(
      row.min_working_days ?? row.minWorkingDays ?? 0
    ),
    maxWorkingDays: Number(
      row.max_working_days ?? row.maxWorkingDays ?? 0
    ),
    maxHoursPerDay: Number(
      row.max_hours_per_day ?? row.maxHoursPerDay ?? 0
    ),
    unavailability: String(row.unavailability ?? "—"),
    preferences: String(row.preferences ?? "—"),
  }
}

function buildInsertPayload(quick: boolean, count: number) {
  return {
    name: quick ? `Teacher ${count + 1}` : "New Teacher",
    subject: quick ? "Unassigned" : "—",
    min_working_days: 3,
    max_working_days: 5,
    max_hours_per_day: 6,
    unavailability: "—",
    preferences: "—",
  }
}

function buildMinimalInsertPayload(quick: boolean, count: number) {
  return {
    name: quick ? `Teacher ${count + 1}` : "New Teacher",
    subject: quick ? "Unassigned" : "—",
  }
}

function buildUpdatePayload(teacher: Teacher) {
  return {
    name: teacher.name,
    subject: teacher.subject,
    min_working_days: teacher.minWorkingDays,
    max_working_days: teacher.maxWorkingDays,
    max_hours_per_day: teacher.maxHoursPerDay,
    unavailability: teacher.unavailability,
    preferences: teacher.preferences,
  }
}

const cellInputClassName =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"

const SETUP_STEPS = [
  "School config",
  "Classes",
  "Divisions",
  "Subjects",
  "Teachers",
  "Lessons",
  "Timetable constraints",
] as const

const CURRENT_STEP = 4

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Timetable", href: "/timetable", icon: CalendarDays },
  { label: "Teachers", href: "/teachers", icon: Users },
  { label: "Classes", href: "/classes", icon: GraduationCap },
  { label: "AI Generator", href: "/ai-generator", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
] as const

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Teacher | null>(null)

  const loadTeachers = useCallback(async () => {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("name")

    if (error) {
      console.error("Failed to load teachers:", error.message, error)
      return
    }

    setTeachers((data ?? []).map((row) => mapRowToTeacher(row)))
  }, [])

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return teachers
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query)
    )
  }, [teachers, search])

  const allVisibleSelected =
    filteredTeachers.length > 0 &&
    filteredTeachers.every((t) => selectedIds.has(t.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredTeachers.forEach((t) => next.delete(t.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredTeachers.forEach((t) => next.add(t.id))
        return next
      })
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addTeacher = useCallback(
    async (quick: boolean) => {
      const count = teachers.length
      let result = await supabase
        .from("teachers")
        .insert(buildInsertPayload(quick, count))
        .select("*")

      if (
        result.error &&
        (result.error.code === "PGRST204" ||
          result.error.message.toLowerCase().includes("column"))
      ) {
        result = await supabase
          .from("teachers")
          .insert(buildMinimalInsertPayload(quick, count))
          .select("*")
      }

      if (result.error) {
        console.error(
          "Failed to add teacher:",
          result.error.message,
          result.error
        )
        return
      }

      if (result.data?.length) {
        setTeachers((prev) => {
          const existing = new Set(prev.map((t) => t.id))
          const added = result.data!.map((row) => mapRowToTeacher(row))
          return [...prev, ...added.filter((t) => !existing.has(t.id))]
        })
      }

      await loadTeachers()
    },
    [teachers.length, loadTeachers]
  )

  const deleteTeacher = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("teachers").delete().eq("id", id)

      if (error) {
        console.error("Failed to delete teacher:", error.message, error)
        return
      }

      if (editingId === id) {
        setEditingId(null)
        setEditDraft(null)
      }

      setTeachers((prev) => prev.filter((t) => t.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      await loadTeachers()
    },
    [editingId, loadTeachers]
  )

  const startEdit = useCallback((teacher: Teacher) => {
    setEditingId(teacher.id)
    setEditDraft({ ...teacher })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft(null)
  }, [])

  const updateDraft = useCallback(
    (field: keyof Omit<Teacher, "id">, value: string | number) => {
      setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null))
    },
    []
  )

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return

    let result = await supabase
      .from("teachers")
      .update(buildUpdatePayload(editDraft))
      .eq("id", editingId)
      .select("*")
      .single()

    if (
      result.error &&
      (result.error.code === "PGRST204" ||
        result.error.message.toLowerCase().includes("column"))
    ) {
      result = await supabase
        .from("teachers")
        .update({
          name: editDraft.name,
          subject: editDraft.subject,
        })
        .eq("id", editingId)
        .select("*")
        .single()
    }

    if (result.error) {
      console.error("Failed to update teacher:", result.error.message, result.error)
      return
    }

    if (result.data) {
      const updated = mapRowToTeacher(result.data)
      setTeachers((prev) =>
        prev.map((t) => (t.id === editingId ? updated : t))
      )
    }

    setEditingId(null)
    setEditDraft(null)
    await loadTeachers()
  }, [editingId, editDraft, loadTeachers])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">School OS</p>
              <p className="text-xs text-slate-500">Timetable setup</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = href === "/teachers"
              return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={18}
                  className={active ? "text-indigo-600" : "text-slate-400"}
                />
                {label}
              </Link>
            )})}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <p className="text-xs font-medium text-slate-500">Setup progress</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Step {CURRENT_STEP + 1} of {SETUP_STEPS.length}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${((CURRENT_STEP + 1) / SETUP_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
                <Bot size={16} />
              </div>
              <span className="text-sm font-semibold">School OS</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-indigo-600"
            >
              Menu
            </Link>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {/* Page header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    Staff management
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Teachers
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    Define availability, workload limits, and scheduling
                    preferences for each teacher.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addTeacher(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Zap size={16} className="text-amber-500" />
                    Quick add
                  </button>
                  <button
                    type="button"
                    onClick={() => void addTeacher(false)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
                  >
                    <Plus size={16} />
                    New teacher
                  </button>
                </div>
              </div>

              {/* Setup progress */}
              <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">
                    Setup wizard
                  </p>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {SETUP_STEPS[CURRENT_STEP]}
                  </span>
                </div>

                <div className="overflow-x-auto pb-1">
                  <ol className="flex min-w-[640px] items-center">
                    {SETUP_STEPS.map((step, index) => {
                      const done = index < CURRENT_STEP
                      const current = index === CURRENT_STEP
                      const upcoming = index > CURRENT_STEP

                      return (
                        <li
                          key={step}
                          className={`flex items-center ${index < SETUP_STEPS.length - 1 ? "flex-1" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                done
                                  ? "bg-indigo-600 text-white"
                                  : current
                                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                                    : "border border-slate-200 bg-slate-50 text-slate-400"
                              }`}
                            >
                              {done ? (
                                <Check size={14} strokeWidth={2.5} />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span
                              className={`max-w-[5.5rem] text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-xs ${
                                current
                                  ? "text-indigo-700"
                                  : done
                                    ? "text-slate-600"
                                    : upcoming
                                      ? "text-slate-400"
                                      : "text-slate-500"
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                          {index < SETUP_STEPS.length - 1 && (
                            <div
                              className={`mx-1 mb-5 h-0.5 flex-1 rounded-full sm:mx-2 ${
                                done ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </section>

              {/* Toolbar + table card */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="relative w-full sm:max-w-sm">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      placeholder="Search teachers…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {filteredTeachers.length}
                    </span>{" "}
                    {filteredTeachers.length === 1 ? "teacher" : "teachers"}
                    {selectedIds.size > 0 && (
                      <span className="ml-2 text-indigo-600">
                        · {selectedIds.size} selected
                      </span>
                    )}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all teachers"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Name
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Subject
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Min working days
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Max working days
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Max hours/day
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Unavailability
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Preferences
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-12 text-center text-slate-500"
                          >
                            No teachers match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredTeachers.map((teacher) => {
                          const selected = selectedIds.has(teacher.id)
                          const isEditing = editingId === teacher.id
                          const draft = isEditing ? editDraft : null

                          return (
                            <tr
                              key={teacher.id}
                              className={`border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60 ${
                                selected || isEditing ? "bg-indigo-50/40" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSelect(teacher.id)}
                                  disabled={isEditing}
                                  aria-label={`Select ${teacher.name}`}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                      {draft.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </span>
                                    <input
                                      type="text"
                                      value={draft.name}
                                      onChange={(e) =>
                                        updateDraft("name", e.target.value)
                                      }
                                      className={`${cellInputClassName} min-w-[120px] font-medium`}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                      {teacher.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      {teacher.name}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="text"
                                    value={draft.subject}
                                    onChange={(e) =>
                                      updateDraft("subject", e.target.value)
                                    }
                                    className={cellInputClassName}
                                  />
                                ) : (
                                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                    {teacher.subject}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.minWorkingDays}
                                    onChange={(e) =>
                                      updateDraft(
                                        "minWorkingDays",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className={`${cellInputClassName} tabular-nums`}
                                  />
                                ) : (
                                  <span className="tabular-nums text-slate-700">
                                    {teacher.minWorkingDays}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.maxWorkingDays}
                                    onChange={(e) =>
                                      updateDraft(
                                        "maxWorkingDays",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className={`${cellInputClassName} tabular-nums`}
                                  />
                                ) : (
                                  <span className="tabular-nums text-slate-700">
                                    {teacher.maxWorkingDays}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.maxHoursPerDay}
                                    onChange={(e) =>
                                      updateDraft(
                                        "maxHoursPerDay",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className={`${cellInputClassName} tabular-nums`}
                                  />
                                ) : (
                                  <span className="tabular-nums text-slate-700">
                                    {teacher.maxHoursPerDay}h
                                  </span>
                                )}
                              </td>
                              <td className="max-w-[140px] px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="text"
                                    value={draft.unavailability}
                                    onChange={(e) =>
                                      updateDraft(
                                        "unavailability",
                                        e.target.value
                                      )
                                    }
                                    className={cellInputClassName}
                                  />
                                ) : (
                                  <span className="block truncate text-slate-600">
                                    {teacher.unavailability}
                                  </span>
                                )}
                              </td>
                              <td className="max-w-[160px] px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="text"
                                    value={draft.preferences}
                                    onChange={(e) =>
                                      updateDraft("preferences", e.target.value)
                                    }
                                    className={cellInputClassName}
                                  />
                                ) : (
                                  <span className="block truncate text-slate-600">
                                    {teacher.preferences}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void saveEdit()}
                                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        aria-label={`Edit ${teacher.name}`}
                                        onClick={() => startEdit(teacher)}
                                        disabled={editingId !== null}
                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Delete ${teacher.name}`}
                                        onClick={() =>
                                          void deleteTeacher(teacher.id)
                                        }
                                        disabled={editingId !== null}
                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:px-5">
                  <p className="text-xs text-slate-500">
                    Changes are saved locally until backend is connected.
                  </p>
                  <button
                    type="button"
                    onClick={() => void addTeacher(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 sm:w-auto"
                  >
                    <Plus size={16} />
                    Add teacher
                  </button>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

