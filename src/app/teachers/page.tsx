"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  fetchSubjects,
  fetchTeachers,
  syncTeacherSubjects,
  teacherToDb,
  type Subject,
  type Teacher,
} from "@/lib/database"
import { fetchCurrentProfile } from "@/lib/profile"
import { SubjectPicker, SubjectTags } from "@/components/subject-tags"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import { Spinner, SkeletonTableRows } from "@/components/skeletons"
import { Check, Pencil, Plus, Search, Trash2, Zap } from "lucide-react"
import { cellInputClassName, SETUP_STEPS } from "@/lib/nav"

const CURRENT_STEP = 4

type TeacherDraft = {
  name: string
  minWorkingDays: number
  maxWorkingDays: number
  maxHoursPerDay: number
  unavailability: string
  preferences: string
  subjectIds: string[]
}

function teacherToDraft(teacher: Teacher): TeacherDraft {
  return {
    name: teacher.name,
    minWorkingDays: teacher.minWorkingDays,
    maxWorkingDays: teacher.maxWorkingDays,
    maxHoursPerDay: teacher.maxHoursPerDay,
    unavailability: teacher.unavailability,
    preferences: teacher.preferences,
    subjectIds: teacher.subjects.map((s) => s.id),
  }
}

function defaultDraft(quick: boolean, count: number): TeacherDraft {
  return {
    name: quick ? `Teacher ${count + 1}` : "New Teacher",
    minWorkingDays: 3,
    maxWorkingDays: 5,
    maxHoursPerDay: 6,
    unavailability: "—",
    preferences: "—",
    subjectIds: [],
  }
}

export default function TeachersPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TeacherDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Post-mutation reload — called from event handlers, never from effects.
  const loadTeachers = useCallback(async () => {
    if (!schoolId) return
    setTeachers(await fetchTeachers(schoolId))
  }, [schoolId])

  // Initial load: fetch profile first to get schoolId, then fetch data.
  // All setState lives inside .then() callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true
    void fetchCurrentProfile().then((profile) => {
      if (!alive) return
      const sid = profile?.schoolId ?? null
      setSchoolId(sid)
      void Promise.all([fetchTeachers(sid), fetchSubjects(sid)]).then(
        ([teachersData, subjectsData]) => {
          if (!alive) return
          setTeachers(teachersData)
          setAllSubjects(subjectsData)
          setIsLoading(false)
        }
      )
    })
    return () => {
      alive = false
    }
  }, [])

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return teachers
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.subjects.some((s) => s.name.toLowerCase().includes(query))
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
      if (!schoolId) return
      setAdding(true)
      const draft = defaultDraft(quick, teachers.length)
      const { data, error } = await supabase
        .from("teachers")
        .insert(teacherToDb(draft, schoolId))
        .select("id")
        .single()

      if (error) {
        notify.error(error.message)
        setAdding(false)
        return
      }

      if (data?.id) {
        const ok = await syncTeacherSubjects(data.id, draft.subjectIds)
        if (!ok) {
          notify.error("Teacher added but subject assignments failed")
          await loadTeachers()
          setAdding(false)
          return
        }
      }

      notify.success("Teacher added")
      await loadTeachers()
      setAdding(false)
    },
    [teachers.length, loadTeachers, schoolId]
  )

  const deleteTeacher = useCallback(
    async (id: string) => {
      setDeletingId(id)
      const { error } = await supabase.from("teachers").delete().eq("id", id)

      if (error) {
        notify.error(error.message)
        setDeletingId(null)
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

      notify.success("Teacher deleted")
      await loadTeachers()
      setDeletingId(null)
    },
    [editingId, loadTeachers]
  )

  const startEdit = useCallback((teacher: Teacher) => {
    setEditingId(teacher.id)
    setEditDraft(teacherToDraft(teacher))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft(null)
  }, [])

  const updateDraft = useCallback(
    (field: keyof Omit<TeacherDraft, "subjectIds">, value: string | number) => {
      setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null))
    },
    []
  )

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft || !schoolId) return
    setSaving(true)

    const { error } = await supabase
      .from("teachers")
      .update(teacherToDb(editDraft, schoolId))
      .eq("id", editingId)

    if (error) {
      notify.error(error.message)
      setSaving(false)
      return
    }

    const ok = await syncTeacherSubjects(editingId, editDraft.subjectIds)
    if (!ok) {
      notify.error("Saved but subject assignments failed")
    } else {
      notify.success("Teacher saved")
    }
    setSaving(false)
    setEditingId(null)
    setEditDraft(null)
    await loadTeachers()
  }, [editingId, editDraft, loadTeachers, schoolId])

  const busy = isLoading || adding

  return (
    <AppShell currentStep={CURRENT_STEP}>
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
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Zap size={16} className="text-amber-500" />
                    Quick add
                  </button>
                  <button
                    type="button"
                    onClick={() => void addTeacher(false)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "New teacher"}
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
                    {isLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Spinner /> Loading…
                      </span>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700">
                          {filteredTeachers.length}
                        </span>{" "}
                        {filteredTeachers.length === 1 ? "teacher" : "teachers"}
                        {selectedIds.size > 0 && (
                          <span className="ml-2 text-indigo-600">
                            · {selectedIds.size} selected
                          </span>
                        )}
                      </>
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
                          Subject skills
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
                      {isLoading ? (
                        <SkeletonTableRows rows={5} cols={9} />
                      ) : filteredTeachers.length === 0 ? (
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
                          const isDeleting = deletingId === teacher.id

                          return (
                            <tr
                              key={teacher.id}
                              className={`border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60 ${
                                selected || isEditing ? "bg-indigo-50/40" : ""
                              } ${isDeleting ? "opacity-50" : ""}`}
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
                                  <SubjectPicker
                                    allSubjects={allSubjects}
                                    selectedIds={draft.subjectIds}
                                    onChange={(subjectIds) =>
                                      setEditDraft((prev) =>
                                        prev ? { ...prev, subjectIds } : null
                                      )
                                    }
                                  />
                                ) : (
                                  <SubjectTags subjects={teacher.subjects} />
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
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-60"
                                      >
                                        {saving && <Spinner />}
                                        {saving ? "Saving…" : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
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
                                        disabled={editingId !== null || !!deletingId}
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
                                        disabled={editingId !== null || !!deletingId}
                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                      >
                                        {isDeleting ? (
                                          <Spinner />
                                        ) : (
                                          <Trash2 size={16} />
                                        )}
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
                    Subject skills link teachers to subjects via Supabase relations.
                  </p>
                  <button
                    type="button"
                    onClick={() => void addTeacher(false)}
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60 sm:w-auto"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "Add teacher"}
                  </button>
                </div>
              </section>
    </AppShell>
  )
}
