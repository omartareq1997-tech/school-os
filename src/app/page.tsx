import {
  Bot,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["Timetable", CalendarDays],
  ["Teachers", Users],
  ["Classes", GraduationCap],
  ["AI Generator", Sparkles],
  ["Settings", Settings],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070A13] text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-white/10 bg-white/[0.03] p-5">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold">School OS</h1>
              <p className="text-xs text-slate-400">AI School Command Center</p>
            </div>
          </div>

          <nav className="space-y-1">
            {nav.map(([label, Icon], i) => (
              <div
                key={label as string}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  i === 0
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {label as string}
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm text-blue-300">Welcome back, Omar</p>
              <h2 className="text-4xl font-bold tracking-tight">
                AI Timetable Operations
              </h2>
              <p className="mt-2 text-slate-400">
                Generate schedules, detect conflicts, optimize teacher workload,
                and manage school operations from one place.
              </p>
            </div>

            <Button className="rounded-2xl bg-blue-500 px-6 hover:bg-blue-600">
              Generate Timetable
            </Button>
          </header>

          <div className="mb-8 grid grid-cols-4 gap-4">
            {[
              ["Teachers", "42", "+4 this term"],
              ["Classes", "18", "5 active grades"],
              ["Lessons / Week", "312", "auto-balanced"],
              ["Conflicts", "0", "clean schedule"],
            ].map(([label, value, note]) => (
              <Card key={label} className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-3 text-4xl font-bold text-white">{value}</p>
                  <p className="mt-2 text-xs text-slate-500">{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-6">
            <Card className="col-span-8 border-white/10 bg-white/[0.04]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Timetable Preview
                    </h3>
                    <p className="text-sm text-slate-400">
                      Class 5A · optimized weekly schedule
                    </p>
                  </div>
                  <Button variant="secondary" className="rounded-xl">
                    View Full Timetable
                  </Button>
                </div>

                <div className="grid grid-cols-6 gap-2 text-sm">
                  {["Time", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div
                      key={day}
                      className="rounded-xl bg-white/10 p-3 font-medium text-slate-200"
                    >
                      {day}
                    </div>
                  ))}

                  {["08:00", "09:00", "10:00", "11:00", "12:00"].map(
                    (time) => (
                      <>
                        <div className="rounded-xl bg-white/10 p-3 text-slate-300">
                          {time}
                        </div>
                        {["Math", "ENG", "BIO", "PE", "GEO"].map((sub, i) => (
                          <div
                            key={`${time}-${sub}-${i}`}
                            className="rounded-xl border border-white/10 bg-slate-800/70 p-3"
                          >
                            <p className="font-semibold text-white">{sub}</p>
                            <p className="text-xs text-slate-400">
                              Teacher assigned
                            </p>
                          </div>
                        ))}
                      </>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-4 border-white/10 bg-white/[0.04]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      AI Command Center
                    </h3>
                    <p className="text-sm text-slate-400">Smart school logic</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                    No teacher conflicts detected.
                  </div>

                  <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-300">
                    AI can reduce teacher gaps by 18%.
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-300">
                    3 teachers are close to max weekly load.
                  </div>

                  <Button className="mt-4 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-200">
                    Run AI Optimization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}