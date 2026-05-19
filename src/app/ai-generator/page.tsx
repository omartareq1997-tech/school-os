"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import { Spinner } from "@/components/skeletons"

const MAX_CHARS = 2000

type ApiResponse = { result: string; error?: never } | { error: string; result?: never }

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    const trimmed = prompt.trim()

    if (!trimmed) {
      notify.error("Prompt is required")
      return
    }
    if (prompt.length > MAX_CHARS) {
      notify.error(`Prompt must be ${MAX_CHARS} characters or fewer`)
      return
    }

    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      })

      const data = (await res.json()) as ApiResponse

      if (!res.ok || data.error) {
        notify.error(data.error ?? "Something went wrong")
        return
      }

      setResponse(data.result ?? null)
      notify.success("Response generated")
    } catch {
      notify.error("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!response) return
    void navigator.clipboard
      .writeText(response)
      .then(() => notify.success("Copied to clipboard"))
      .catch(() => notify.error("Failed to copy"))
  }

  const charsUsed = prompt.length
  const charsLeft = MAX_CHARS - charsUsed
  const overLimit = charsLeft < 0
  const nearLimit = charsLeft >= 0 && charsLeft <= 200

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">AI</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            AI Generator
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Describe your scheduling needs and let AI suggest a timetable
            structure.
          </p>
        </div>
      </div>

      {/* Prompt card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-medium text-slate-700">Your prompt</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Describe your school, classes, teachers, and any scheduling
            constraints.
          </p>
        </div>

        <div className="p-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Generate a weekly timetable for 5 classes and 12 teachers. Each class needs Maths, English, Science, and PE. No teacher should teach more than 6 hours per day."
            rows={7}
            disabled={loading}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <p
              className={`text-xs tabular-nums ${
                overLimit
                  ? "font-medium text-red-500"
                  : nearLimit
                    ? "text-amber-600"
                    : "text-slate-400"
              }`}
            >
              {overLimit
                ? `${Math.abs(charsLeft)} characters over limit`
                : `${charsLeft} of ${MAX_CHARS} characters remaining`}
            </p>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading || overLimit}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? <Spinner /> : <Sparkles size={16} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </section>

      {/* Response card */}
      {response && (
        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-medium text-slate-700">
                AI response
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Review and adapt this suggestion to your school&apos;s needs.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {response}
            </p>
          </div>
        </section>
      )}
    </AppShell>
  )
}
