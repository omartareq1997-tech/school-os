"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  fetchClasses,
  fetchSubjects,
  fetchTeachers,
  fetchTimetableEntries,
  normalizeTime,
  timetableToDb,
  type SchoolClass,
  type Subject,
  type Teacher,
  type TimetableEntry,
} from "@/lib/database"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import { Spinner, SkeletonTableRows } from "@/components/skeletons"
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { inputClassName, labelClassName, SETUP_STEPS } from "@/lib/nav"

type EntryForm = {
  classId: string
  teacherId: string
  subjectId: string
  day: string
  startTime: string
  endTime: string
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const

const DEFAULT_TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
]

const CURRENT_STEP = 6

function timeToMinutes(value: string): number {
  const [h, m] = normalizeTime(value).split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function emptyForm(
  classes: SchoolClass[],
  teachers: Teacher[],
  subjects: Subject[],
  overrides?: Partial<EntryForm>
): EntryForm {
  return {
    classId: classes[0]?.id ?? "",
    teacherId: teachers[0]?.id ?? "",
    subjectId: subjects[0]?.id ?? "",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    ...overrides,
  }
}

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EntryForm>({
    classId: "",
    teacherId: "",
    subjectId: "",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:00",
  })
  const [saving, setSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Post-mutation reload — called from event handlers, never from effects.
  const loadAll = useCallback(async () => {
    const [entriesData, classesData, teachersData, subjectsData] =
      await Promise.all([
        fetchTimetableEntries(),
        fetchClasses(),
        fetchTeachers(),
        fetchSubjects(),
      ])
    setEntries(entriesData)
    setClasses(classesData)
    setTeachers(teachersData)
    setSubjects(subjectsData)
  }, [])

  // Initial load via .then() to avoid synchronous setState in effect body.
  useEffect(() => {
    let alive = true
    void Promise.all([
      fetchTimetableEntries(),
      fetchClasses(),
      fetchTeachers(),
      fetchSubjects(),
    ]).then(([entriesData, classesData, teachersData, subjectsData]) => {
      if (!alive) return
      setEntries(entriesData)
      setClasses(classesData)
      setTeachers(teachersData)
      setSubjects(subjectsData)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const visibleEntries = useMemo(() => {
    let list = entries
    if (classFilter !== "all") {
      list = list.filter((e) => e.classId === classFilter)
    }
    const query = search.trim().toLowerCase()
    if (!query) return list
    return list.filter(
      (e) =>
        e.className.toLowerCase().includes(query) ||
        e.subjectName.toLowerCase().includes(query) ||
        e.teacherName.toLowerCase().includes(query) ||
        e.day.toLowerCase().includes(query)
    )
  }, [entries, classFilter, search])

  const timeSlots = useMemo(() => {
    const slots = new Set(DEFAULT_TIME_SLOTS)
    visibleEntries.forEach((e) => {
      if (e.startTime) slots.add(e.startTime)
    })
    return Array.from(slots).sort(
      (a, b) => timeToMinutes(a) - timeToMinutes(b)
    )
  }, [visibleEntries])

  const openCreateModal = useCallback(
    (preset?: Partial<EntryForm>) => {
      setEditingId(null)
      setForm(emptyForm(classes, teachers, subjects, preset))
      setModalOpen(true)
    },
    [classes, teachers, subjects]
  )

  const openEditModal = useCallback((entry: TimetableEntry) => {
    setEditingId(entry.id)
    setForm({
      classId: entry.classId,
      teacherId: entry.teacherId,
      subjectId: entry.subjectId,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm(classes, teachers, subjects))
  }, [classes, teachers, subjects])

  const updateForm = useCallback(
    (field: keyof EntryForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const saveEntry = useCallback(async () => {
    if (!form.classId || !form.teacherId || !form.subjectId) {
      notify.error("Class, subject and teacher are required")
      return
    }

    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      notify.error("End time must be after start time")
      return
    }

    setSaving(true)
    const payload = timetableToDb(form)

    const result = editingId
      ? await supabase
          .from("timetable_entries")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single()
      : await supabase
          .from("timetable_entries")
          .insert(payload)
          .select("*")
          .single()

    setSaving(false)

    if (result.error) {
      notify.error(result.error.message)
      return
    }

    notify.success(editingId ? "Entry updated" : "Entry added")
    closeModal()
    await loadAll()
  }, [form, editingId, closeModal, loadAll])

  const deleteEntry = useCallback(
    async (id: string) => {
      setDeletingId(id)
      const { error } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("id", id)

      if (error) {
        notify.error(error.message)
        setDeletingId(null)
        return
      }

      notify.success("Entry deleted")
      setDeletingId(null)
      if (editingId === id) closeModal()
      await loadAll()
    },
    [editingId, closeModal, loadAll]
  )

  function entriesInCell(day: string, slot: string) {
    return visibleEntries.filter(
      (e) =>
        e.day.toLowerCase() === day.toLowerCase() &&
        normalizeTime(e.startTime) === normalizeTime(slot)
    )
  }

  return (
    <>
      <AppShell currentStep={CURRENT_STEP}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    Timetable management
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Timetable
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    Plan weekly lessons by class, subject, and teacher across
                    the school week.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  disabled={isLoading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Plus size={16} />
                  Add entry
                </button>
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

              <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-56">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="search"
                        placeholder="Search entries…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="all">All classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {visibleEntries.length}
                    </span>{" "}
                    {visibleEntries.length === 1 ? "entry" : "entries"}
                  </p>
                </div>

                <div className="overflow-x-auto p-4 sm:p-5">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="w-20 border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-medium text-slate-600">
                          Time
                        </th>
                        {DAYS.map((day) => (
                          <th
                            key={day}
                            className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-slate-600"
                          >
                            {day.slice(0, 3)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot) => (
                        <tr key={slot}>
                          <td className="border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium tabular-nums text-slate-600">
                            {slot}
                          </td>
                          {DAYS.map((day) => {
                            const cellEntries = entriesInCell(day, slot)
                            return (
                              <td
                                key={`${day}-${slot}`}
                                className="min-h-[72px] border border-slate-100 p-1 align-top"
                              >
                                <div className="flex min-h-[64px] flex-col gap-1">
                                  {cellEntries.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      onClick={() => openEditModal(entry)}
                                      className="w-full rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1.5 text-left transition hover:border-indigo-200 hover:bg-indigo-100/80"
                                    >
                                      <p className="text-xs font-semibold text-indigo-900">
                                        {entry.subjectName}
                                      </p>
                                      <p className="truncate text-[10px] text-indigo-700/80">
                                        {entry.className}
                                      </p>
                                      <p className="truncate text-[10px] text-slate-500">
                                        {entry.teacherName}
                                      </p>
                                      <p className="text-[10px] tabular-nums text-slate-400">
                                        {entry.startTime}–{entry.endTime}
                                      </p>
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCreateModal({
                                        day,
                                        startTime: slot,
                                        endTime:
                                          timeSlots[
                                            timeSlots.indexOf(slot) + 1
                                          ] ?? slot,
                                      })
                                    }
                                    className="mt-auto flex h-6 w-full items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 transition hover:border-indigo-200 hover:text-indigo-400"
                                    aria-label={`Add entry on ${day} at ${slot}`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-medium text-slate-700">
                    All timetable entries
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Click a row to edit or use the grid above.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Class
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Subject
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Teacher
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Day
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          Start
                        </th>
                        <th className="px-4 py-3 font-medium text-slate-600">
                          End
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonTableRows rows={4} cols={7} />
                      ) : visibleEntries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-12 text-center text-slate-500"
                          >
                            No timetable entries yet. Add your first lesson.
                          </td>
                        </tr>
                      ) : (
                        visibleEntries.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60 ${
                              deletingId === entry.id ? "opacity-50" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {entry.className}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                                {entry.subjectName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {entry.teacherName}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {entry.day}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-slate-700">
                              {entry.startTime}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-slate-700">
                              {entry.endTime}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  aria-label={`Edit ${entry.subjectName}`}
                                  onClick={() => openEditModal(entry)}
                                  disabled={!!deletingId}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${entry.subjectName}`}
                                  onClick={() => void deleteEntry(entry.id)}
                                  disabled={!!deletingId}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                >
                                  {deletingId === entry.id ? (
                                    <Spinner />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
      </AppShell>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-modal-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="entry-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {editingId ? "Edit entry" : "Add entry"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Assign class, subject, and teacher to a time slot.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void saveEntry()
              }}
            >
              <div>
                <label className={labelClassName} htmlFor="entry-class">
                  Class
                </label>
                <select
                  id="entry-class"
                  value={form.classId}
                  onChange={(e) => updateForm("classId", e.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="" disabled>
                    Select class
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.grade !== "—" ? ` · ${c.grade}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName} htmlFor="entry-subject">
                  Subject
                </label>
                <select
                  id="entry-subject"
                  value={form.subjectId}
                  onChange={(e) => updateForm("subjectId", e.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="" disabled>
                    Select subject
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName} htmlFor="entry-teacher">
                  Teacher
                </label>
                <select
                  id="entry-teacher"
                  value={form.teacherId}
                  onChange={(e) => updateForm("teacherId", e.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="" disabled>
                    Select teacher
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName} htmlFor="entry-day">
                  Day
                </label>
                <select
                  id="entry-day"
                  value={form.day}
                  onChange={(e) => updateForm("day", e.target.value)}
                  className={inputClassName}
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClassName} htmlFor="entry-start">
                    Start time
                  </label>
                  <input
                    id="entry-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateForm("startTime", e.target.value)}
                    className={inputClassName}
                    required
                  />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="entry-end">
                    End time
                  </label>
                  <input
                    id="entry-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => updateForm("endTime", e.target.value)}
                    className={inputClassName}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => void deleteEntry(editingId)}
                    disabled={saving || !!deletingId}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === editingId && <Spinner />}
                    {deletingId === editingId ? "Deleting…" : "Delete"}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
