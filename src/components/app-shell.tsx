"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"
import { NAV_ITEMS, SETUP_STEPS } from "@/lib/nav"

type AppShellProps = {
  currentStep?: number
  children: React.ReactNode
}

export function AppShell({ currentStep, children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">School OS</p>
              <p className="text-xs text-slate-500">Timetable setup</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? "text-indigo-600" : "text-slate-400"}
                  />
                  {label}
                </Link>
              )
            })}
          </nav>

          {currentStep !== undefined && (
            <div className="border-t border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500">Setup progress</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Step {currentStep + 1} of {SETUP_STEPS.length}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{
                    width: `${((currentStep + 1) / SETUP_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
                <Bot size={16} />
              </div>
              <span className="text-sm font-semibold">School OS</span>
            </div>
            <Link href="/dashboard" className="text-xs font-medium text-indigo-600">
              Menu
            </Link>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
