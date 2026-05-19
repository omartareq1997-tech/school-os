"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  fetchCurrentProfile,
  fetchSchool,
  type UserRole,
} from "@/lib/profile"
import { NAV_ITEMS, SETUP_STEPS } from "@/lib/nav"

type AppShellProps = {
  currentStep?: number
  children: React.ReactNode
}

// ─── Role badge styles ────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, string> = {
  owner:   "bg-indigo-50 text-indigo-700",
  admin:   "bg-amber-50 text-amber-700",
  teacher: "bg-slate-100 text-slate-600",
}

// ─── User menu (bottom of sidebar) ───────────────────────────────────────────

function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    let alive = true

    // ── Initial load ──────────────────────────────────────────────────────────
    // All setState lives inside async .then() callbacks (never synchronously
    // in the effect body) to satisfy the react-hooks/set-state-in-effect rule.

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive) setEmail(session?.user?.email ?? null)
    })

    void fetchCurrentProfile().then((profile) => {
      if (!alive || !profile) return
      setRole(profile.role)
      if (!profile.schoolId) return
      void fetchSchool(profile.schoolId).then((school) => {
        if (alive) setSchoolName(school?.name ?? null)
      })
    })

    // ── Auth state subscription ───────────────────────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)

      if (!session?.user) {
        setRole(null)
        setSchoolName(null)
        return
      }

      void fetchCurrentProfile().then((profile) => {
        if (!alive || !profile) return
        setRole(profile.role)
        if (!profile.schoolId) {
          setSchoolName(null)
          return
        }
        void fetchSchool(profile.schoolId).then((school) => {
          if (alive) setSchoolName(school?.name ?? null)
        })
      })
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  function handleSignOut() {
    void supabase.auth.signOut().then(() => {
      window.location.href = "/auth/login"
    })
  }

  // Don't render until we at least have the email.
  if (!email) return null

  const initials = email.slice(0, 2).toUpperCase()
  const showSchoolRow = schoolName !== null || role !== null

  return (
    <div className="border-t border-slate-100 p-4">
      <div className="space-y-2.5">
        {/* School + role row — only once profile data has loaded */}
        {showSchoolRow && (
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
              {schoolName ?? "—"}
            </p>
            {role && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${ROLE_BADGE[role]}`}
              >
                {role}
              </span>
            )}
          </div>
        )}

        {/* User row */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {initials}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
            {email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

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

          <UserMenu />
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
