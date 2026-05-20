"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { fetchClasses } from "@/lib/database"
import { fetchCurrentProfile } from "@/lib/profile"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import { Spinner, SkeletonTableRows } from "@/components/skeletons"
import { cellInputClassName, SETUP_STEPS } from "@/lib/nav"
import { Check, Pencil, Plus, Search, Trash2, Zap } from "lucide-react"

type SchoolClass = {
  id: string
  name: string
  grade: string
  studentsCount: number
}

type ClassRow = Record<string, unknown>

function mapRowToClass(row: ClassRow): SchoolClass {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "New Class"),
    grade: String(row.grade ?? "—"),
    studentsCount: Number(row.students_count ?? row.studentsCount ?? 0),
  }
}

function buildInsertPayload(quick: boolean, count: number) {
  return {
    name: quick ? `Class ${count + 1}` : "New Class",
    grade: quick ? "Unassigned" : "—",
    students_count: 0,
  }
}

function buildMinimalInsertPayload(quick: boolean, count: number) {
  return {
    name: quick ? `Class ${count + 1}` : "New Class",
    grade: quick ? "Unassigned" : "—",
  }
}

function buildUpdatePayload(schoolClass: SchoolClass) {
  return {
    name: schoolClass.name,
    grade: schoolClass.grade,
    students_count: schoolClass.studentsCount,
  }
}

const CURRENT_STEP = 1

export default function ClassesPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<SchoolClass | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Post-mutation reload — called from event handlers, never from effects.
  const loadClasses = useCallback(async () => {
    if (!schoolId) return
    setClasses(await fetchClasses(schoolId))
  }, [schoolId])

  // Initial load: fetch profile first to get schoolId, then fetch data.
  // All setState lives inside .then() callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true
    void fetchCurrentProfile().then((profile) => {
      if (!alive) return
      const sid = profile?.schoolId ?? null
      setSchoolId(sid)
      void fetchClasses(sid).then((data) => {
        if (!alive) return
        setClasses(data)
        setIsLoading(false)
      })
    })
    return () => {
      alive = false
    }
  }, [])

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return classes
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.grade.toLowerCase().includes(query)
    )
  }, [classes, search])

  const allVisibleSelected =
    filteredClasses.length > 0 &&
    filteredClasses.every((c) => selectedIds.has(c.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredClasses.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredClasses.forEach((c) => next.add(c.id))
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

  const addClass = useCallback(
    async (quick: boolean) => {
      if (!schoolId) return
      setAdding(true)
      const count = classes.length
      let result = await supabase
        .from("classes")
        .insert({ ...buildInsertPayload(quick, count), school_id: schoolId })
        .select("*")

      if (
        result.error &&
        (result.error.code === "PGRST204" ||
          result.error.message.toLowerCase().includes("column"))
      ) {
        result = await supabase
          .from("classes")
          .insert({ ...buildMinimalInsertPayload(quick, count), school_id: schoolId })
          .select("*")
      }

      if (result.error) {
        notify.error(result.error.message)
        setAdding(false)
        return
      }

      if (result.data?.length) {
        setClasses((prev) => {
          const existing = new Set(prev.map((c) => c.id))
          const added = result.data!.map((row) => mapRowToClass(row))
          return [...prev, ...added.filter((c) => !existing.has(c.id))]
        })
      }

      notify.success("Class added")
      await loadClasses()
      setAdding(false)
    },
    [classes.length, loadClasses, schoolId]
  )

  const deleteClass = useCallback(
    async (id: string) => {
      setDeletingId(id)
      const { error } = await supabase.from("classes").delete().eq("id", id)

      if (error) {
        notify.error(error.message)
        setDeletingId(null)
        return
      }

      if (editingId === id) {
        setEditingId(null)
        setEditDraft(null)
      }

      setClasses((prev) => prev.filter((c) => c.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      notify.success("Class deleted")
      await loadClasses()
      setDeletingId(null)
    },
    [editingId, loadClasses]
  )

  const startEdit = useCallback((schoolClass: SchoolClass) => {
    setEditingId(schoolClass.id)
    setEditDraft({ ...schoolClass })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft(null)
  }, [])

  const updateDraft = useCallback(
    (field: keyof Omit<SchoolClass, "id">, value: string | number) => {
      setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null))
    },
    []
  )

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return
    setSaving(true)

    let result = await supabase
      .from("classes")
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
        .from("classes")
        .update({
          name: editDraft.name,
          grade: editDraft.grade,
        })
        .eq("id", editingId)
        .select("*")
        .single()
    }

    if (result.error) {
      notify.error(result.error.message)
      setSaving(false)
      return
    }

    if (result.data) {
      const updated = mapRowToClass(result.data)
      setClasses((prev) =>
        prev.map((c) => (c.id === editingId ? updated : c))
      )
    }

    notify.success("Class saved")
    setSaving(false)
    setEditingId(null)
    setEditDraft(null)
    await loadClasses()
  }, [editingId, editDraft, loadClasses])

  return (
    <AppShell currentStep={CURRENT_STEP}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    Class management
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Classes
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    Organize grade groups and student counts for timetable
                    planning and room allocation.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addClass(true)}
                    disabled={isLoading || adding}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Zap size={16} className="text-amber-500" />
                    Quick add
                  </button>
                  <button
                    type="button"
                    onClick={() => void addClass(false)}
                    disabled={isLoading || adding}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "New class"}
                  </button>
                </div>
              </div>

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

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="relative w-full sm:max-w-sm">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      placeholder="Search classes…"
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
                          {filteredClasses.length}
                        </span>{" "}
                        {filteredClasses.length === 1 ? "class" : "classes"}
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
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all classes"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Name
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Grade
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Students
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonTableRows rows={4} cols={5} />
                      ) : filteredClasses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-12 text-center text-slate-500"
                          >
                            No classes match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredClasses.map((schoolClass) => {
                          const selected = selectedIds.has(schoolClass.id)
                          const isEditing = editingId === schoolClass.id
                          const draft = isEditing ? editDraft : null
                          const isDeleting = deletingId === schoolClass.id

                          return (
                            <tr
                              key={schoolClass.id}
                              className={`border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60 ${
                                selected || isEditing ? "bg-indigo-50/40" : ""
                              } ${isDeleting ? "opacity-50" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSelect(schoolClass.id)}
                                  disabled={isEditing}
                                  aria-label={`Select ${schoolClass.name}`}
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
                                      {schoolClass.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      {schoolClass.name}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="text"
                                    value={draft.grade}
                                    onChange={(e) =>
                                      updateDraft("grade", e.target.value)
                                    }
                                    className={cellInputClassName}
                                  />
                                ) : (
                                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                    {schoolClass.grade}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.studentsCount}
                                    onChange={(e) =>
                                      updateDraft(
                                        "studentsCount",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className={`${cellInputClassName} tabular-nums`}
                                  />
                                ) : (
                                  <span className="tabular-nums text-slate-700">
                                    {schoolClass.studentsCount}
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
                                        aria-label={`Edit ${schoolClass.name}`}
                                        onClick={() => startEdit(schoolClass)}
                                        disabled={editingId !== null || !!deletingId}
                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Delete ${schoolClass.name}`}
                                        onClick={() =>
                                          void deleteClass(schoolClass.id)
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
                    Classes are linked to timetable entries via foreign keys.
                  </p>
                  <button
                    type="button"
                    onClick={() => void addClass(false)}
                    disabled={isLoading || adding}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60 sm:w-auto"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "Add class"}
                  </button>
                </div>
              </section>
    </AppShell>
  )
}
