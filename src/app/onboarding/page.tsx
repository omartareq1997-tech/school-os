"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { createSchoolAndUpdateProfile } from "@/lib/profile"
import { notify } from "@/lib/toast"
import { Spinner } from "@/components/skeletons"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (!trimmedName) {
      notify.error("School name is required")
      return
    }
    if (!trimmedSlug) {
      notify.error("URL slug is required")
      return
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      notify.error("Slug may only contain lowercase letters, numbers, and hyphens")
      return
    }

    setLoading(true)
    const { error } = await createSchoolAndUpdateProfile(trimmedName, trimmedSlug)
    setLoading(false)

    if (error) {
      notify.error(error)
      return
    }

    notify.success("School created! Welcome to School OS.")
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Bot size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">School OS</h1>
            <p className="text-sm text-slate-500">Set up your school</p>
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="mb-1 text-base font-semibold text-slate-900">
              Create your school
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              You&apos;ll be set as the owner and can invite staff later.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="school-name"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  School name
                </label>
                <input
                  id="school-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Lincoln High School"
                  autoComplete="organization"
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="school-slug"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  URL slug
                </label>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition">
                  <span className="select-none pl-3 text-sm text-slate-400">
                    schoolos.app/
                  </span>
                  <input
                    id="school-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="lincoln-high"
                    autoComplete="off"
                    disabled={loading}
                    className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading && <Spinner />}
                {loading ? "Creating school…" : "Create school"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
