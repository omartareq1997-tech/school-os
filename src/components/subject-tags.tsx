import type { Subject } from "@/lib/database"

type SubjectTagsProps = {
  subjects: Subject[]
  emptyLabel?: string
}

export function SubjectTags({
  subjects,
  emptyLabel = "—",
}: SubjectTagsProps) {
  if (subjects.length === 0) {
    return (
      <span className="text-xs text-slate-400">{emptyLabel}</span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {subjects.map((subject) => (
        <span
          key={subject.id}
          className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100"
        >
          {subject.name}
        </span>
      ))}
    </div>
  )
}

type SubjectPickerProps = {
  allSubjects: Subject[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function SubjectPicker({
  allSubjects,
  selectedIds,
  onChange,
}: SubjectPickerProps) {
  if (allSubjects.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Add subjects first from the Subjects page.
      </p>
    )
  }

  function toggle(subjectId: string) {
    if (selectedIds.includes(subjectId)) {
      onChange(selectedIds.filter((id) => id !== subjectId))
    } else {
      onChange([...selectedIds, subjectId])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {allSubjects.map((subject) => {
        const selected = selectedIds.includes(subject.id)
        return (
          <button
            key={subject.id}
            type="button"
            onClick={() => toggle(subject.id)}
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium transition ${
              selected
                ? "bg-indigo-600 text-white ring-1 ring-indigo-600"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
            }`}
          >
            {subject.name}
          </button>
        )
      })}
    </div>
  )
}
