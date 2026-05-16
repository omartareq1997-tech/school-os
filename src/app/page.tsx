import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-white/10 bg-slate-900/60 p-6">
          <div className="mb-10">
            <h1 className="text-2xl font-bold">School OS</h1>
            <p className="text-sm text-slate-400">AI Timetable Command Center</p>
          </div>

          <nav className="space-y-2 text-sm">
            {[
              "Dashboard",
              "Timetable",
              "Teachers",
              "Classes",
              "Subjects",
              "Lessons",
              "Constraints",
              "AI Generator",
            ].map((item, index) => (
              <div
                key={item}
                className={`rounded-xl px-4 py-3 ${
                  index === 0
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">School Operations Dashboard</h2>
              <p className="text-slate-400">
                Generate, optimize, and manage school timetables with AI.
              </p>
            </div>

            <Button className="rounded-xl">Generate Timetable</Button>
          </header>

          <div className="mb-8 grid grid-cols-4 gap-4">
            {[
              ["Teachers", "42"],
              ["Classes", "18"],
              ["Lessons / Week", "312"],
              ["Conflicts", "0"],
            ].map(([label, value]) => (
              <Card key={label} className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-400">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card className="col-span-2 border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Weekly Timetable Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2 text-sm">
                  {["Time", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div key={day} className="rounded-lg bg-white/10 p-3 font-medium">
                      {day}
                    </div>
                  ))}

                  {["08:00", "09:00", "10:00", "11:00", "12:00"].map((time) => (
                    <>
                      <div className="rounded-lg bg-white/10 p-3">{time}</div>
                      {["Math", "ENG", "BIO", "PE", "GEO"].map((sub, i) => (
                        <div
                          key={`${time}-${sub}-${i}`}
                          className="rounded-lg bg-slate-800 p-3"
                        >
                          <p className="font-semibold">{sub}</p>
                          <p className="text-xs text-slate-400">Teacher assigned</p>
                        </div>
                      ))}
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                  Smart recommendations for timetable optimization.
                </p>

                <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  No teacher conflicts detected.
                </div>

                <div className="rounded-xl bg-blue-500/10 p-4 text-sm text-blue-300">
                  AI suggests reducing teacher gaps by 18%.
                </div>

                <Button className="w-full rounded-xl">Run AI Check</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}