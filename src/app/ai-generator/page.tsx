"use client";

import { useState } from "react";
import { Spinner } from "@/components/skeletons";

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateAI() {
    try {
      setLoading(true);

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      setResponse(data.result || "No response");
    } catch (error) {
      console.error(error);
      setResponse("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          AI Timetable Generator
        </h1>

        <p className="mt-2 text-slate-500">
          Generate schedules and school planning ideas with AI.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Generate a timetable for 5 classes and 12 teachers..."
          className="mt-6 h-40 w-full rounded-xl border border-slate-300 p-4 outline-none"
        />

        <button
          onClick={generateAI}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
        >
          {loading && <Spinner />}
          {loading ? "Generating…" : "Generate"}
        </button>

        {response && (
          <div className="mt-6 rounded-xl bg-slate-100 p-4 whitespace-pre-wrap">
            {response}
          </div>
        )}
      </div>
    </div>
  );
}