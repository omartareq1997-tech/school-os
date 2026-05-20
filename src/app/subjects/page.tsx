"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Subject } from "@/lib/database"
import { fetchSubjects } from "@/lib/database"
import { fetchCurrentProfile } from "@/lib/profile"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import { Spinner, SkeletonTableRows } from "@/components/skeletons"
import { Check, Pencil, Plus, Search, Trash2, Zap } from "lucide-react"
import { cellInputClassName, SETUP_STEPS } from "@/lib/nav"

const CURRENT_STEP = 3

export default function SubjectsPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Subject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Post-mutation reload — called from event handlers, never from effects.
  const loadSubjects = useCallback(async () => {
    if (!schoolId) return
    setSubjects(await fetchSubjects(schoolId))
  }, [schoolId])

  // Initial load: fetch profile first to get schoolId, then fetch data.
  // All setState lives inside .then() callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true
    void fetchCurrentProfile().then((profile) => {
      if (!alive) return
      const sid = profile?.schoolId ?? null
      setSchoolId(sid)
      void fetchSubjects(sid).then((data) => {
        if (!alive) return
        setSubjects(data)
        setIsLoading(false)
      })
    })
    return () => {
      alive = false
    }
  }, [])

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return subjects
    return subjects.filter((s) => s.name.toLowerCase().includes(query))
  }, [subjects, search])

  const allVisibleSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => selectedIds.has(s.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredSubjects.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredSubjects.forEach((s) => next.add(s.id))
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

  const addSubject = useCallback(
    async (quick: boolean) => {
      if (!schoolId) return
      setAdding(true)
      const name = quick ? `Subject ${subjects.length + 1}` : "New Subject"
      const { error } = await supabase
        .from("subjects")
        .insert({ name, school_id: schoolId })
        .select("id")

      if (error) {
        notify.error(error.message)
        setAdding(false)
        return
      }

      notify.success("Subject added")
      await loadSubjects()
      setAdding(false)
    },
    [subjects.length, loadSubjects, schoolId]
  )

  const deleteSubject = useCallback(
    async (id: string) => {
      setDeletingId(id)
      const { error } = await supabase.from("subjects").delete().eq("id", id)

      if (error) {
        notify.error(error.message)
        setDeletingId(null)
        return
      }

      if (editingId === id) {
        setEditingId(null)
        setEditDraft(null)
      }

      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      notify.success("Subject deleted")
      await loadSubjects()
      setDeletingId(null)
    },
    [editingId, loadSubjects]
  )

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return
    setSaving(true)

    if (!editDraft.name.trim()) {
      notify.error("Subject name cannot be empty")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("subjects")
      .update({ name: editDraft.name.trim() })
      .eq("id", editingId)

    if (error) {
      notify.error(error.message)
      setSaving(false)
      return
    }

    notify.success("Subject saved")
    setSaving(false)
    setEditingId(null)
    setEditDraft(null)
    await loadSubjects()
  }, [editingId, editDraft, loadSubjects])

  return (
    <AppShell currentStep={CURRENT_STEP}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    Curriculum
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Subjects
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    Manage subjects linked to teachers and timetable lessons.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addSubject(true)}
                    disabled={isLoading || adding}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Zap size={16} className="text-amber-500" />
                    Quick add
                  </button>
                  <button
                    type="button"
                    onClick={() => void addSubject(false)}
                    disabled={isLoading || adding}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "New subject"}
                  </button>
                </div>
              </div>

              <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Setup wizard</p>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {SETUP_STEPS[CURRENT_STEP]}
                  </span>
                </div>
                <div className="overflow-x-auto pb-1">
                  <ol className="flex min-w-[640px] items-center">
                    {SETUP_STEPS.map((step, index) => {
                      const done = index < CURRENT_STEP
                      const current = index === CURRENT_STEP
                      return (
                        <li
                          key={step}
                          className={`flex items-center ${index < SETUP_STEPS.length - 1 ? "flex-1" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                done || current
                                  ? "bg-indigo-600 text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-400"
                              } ${current ? "ring-4 ring-indigo-100" : ""}`}
                            >
                              {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                            </span>
                            <span className="max-w-[5.5rem] text-center text-[10px] font-medium sm:text-xs">
                              {step}
                            </span>
                          </div>
                          {index < SETUP_STEPS.length - 1 && (
                            <div
                              className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${done ? "bg-indigo-600" : "bg-slate-200"}`}
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
                      placeholder="Search subjects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                          {filteredSubjects.length}
                        </span>{" "}
                        {filteredSubjects.length === 1 ? "subject" : "subjects"}
                      </>
                    )}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonTableRows rows={4} cols={3} />
                      ) : filteredSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                            No subjects match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredSubjects.map((subject) => {
                          const isEditing = editingId === subject.id
                          const isDeleting = deletingId === subject.id
                          return (
                            <tr
                              key={subject.id}
                              className={`border-b border-slate-50 hover:bg-slate-50/60 ${isDeleting ? "opacity-50" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(subject.id)}
                                  onChange={() => toggleSelect(subject.id)}
                                  disabled={isEditing}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {isEditing && editDraft ? (
                                  <input
                                    value={editDraft.name}
                                    onChange={(e) =>
                                      setEditDraft({ ...editDraft, name: e.target.value })
                                    }
                                    className={cellInputClassName}
                                  />
                                ) : (
                                  <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                                    {subject.name}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void saveEdit()}
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                                      >
                                        {saving && <Spinner />}
                                        {saving ? "Saving…" : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingId(null)
                                          setEditDraft(null)
                                        }}
                                        disabled={saving}
                                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingId(subject.id)
                                          setEditDraft({ ...subject })
                                        }}
                                        disabled={editingId !== null || !!deletingId}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteSubject(subject.id)}
                                        disabled={editingId !== null || !!deletingId}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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

                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => void addSubject(false)}
                    disabled={isLoading || adding}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                  >
                    {adding ? <Spinner /> : <Plus size={16} />}
                    {adding ? "Adding…" : "Add subject"}
                  </button>
                </div>
              </section>
    </AppShell>
  )
}
