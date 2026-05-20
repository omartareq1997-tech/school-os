"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { notify } from "@/lib/toast"
import {
  fetchDashboardStats,
  fetchRecentActivity,
  type DashboardStats,
  type RecentActivity,
} from "@/lib/database"
import { fetchCurrentProfile } from "@/lib/profile"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  count,
  sublabel,
  href,
  icon: Icon,
}: {
  label: string
  count: number
  sublabel: string
  href: string
  icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
        {count}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="mt-3 h-8 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1 h-3 w-24 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

function ActivityItem({
  label,
  name,
  timestamp,
  href,
}: {
  label: string
  name: string | null
  timestamp: string | null
  href: string
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {name ? (
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
            {name}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-slate-400">None added yet</p>
        )}
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {timestamp && name && (
          <p className="text-xs tabular-nums text-slate-400">
            {formatRelativeTime(timestamp)}
          </p>
        )}
        {!name && (
          <Link
            href={href}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Add →
          </Link>
        )}
      </div>
    </div>
  )
}

function SkeletonActivityItem() {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div>
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-1.5 h-4 w-36 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  // Start as true so the first render shows skeletons without a flash of empty content.
  const [loading, setLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // No synchronous setState inside the effect body — all updates happen inside
  // the async .then() so the lint rule (react-hooks/set-state-in-effect) is not
  // triggered. Loading is reset in the event handler before the key changes.
  useEffect(() => {
    let alive = true

    void fetchCurrentProfile().then((profile) => {
      if (!alive) return
      const sid = profile?.schoolId ?? null
      void Promise.all([fetchDashboardStats(sid), fetchRecentActivity(sid)]).then(
        ([statsRes, activityRes]) => {
          if (!alive) return
          setLoading(false)
          if (statsRes.error) setStatsError(statsRes.error)
          else setStats(statsRes.data)
          if (activityRes.error) setActivityError(activityRes.error)
          else setActivity(activityRes.data)
          if (!statsRes.error && !activityRes.error && refreshKey > 0) {
            notify.success("Dashboard refreshed")
          }
        }
      )
    })

    return () => {
      alive = false
    }
  }, [refreshKey])

  function handleRefresh() {
    setLoading(true)
    setStatsError(null)
    setActivityError(null)
    setRefreshKey((k) => k + 1)
  }

  const anyError = statsError ?? activityError

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Live snapshot of your school&apos;s timetable data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin text-indigo-500" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {anyError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load dashboard data</p>
            <p className="mt-0.5 text-red-600">{anyError}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Teachers"
              count={stats?.teachersCount ?? 0}
              sublabel="on staff"
              href="/teachers"
              icon={Users}
            />
            <StatCard
              label="Classes"
              count={stats?.classesCount ?? 0}
              sublabel="across all grades"
              href="/classes"
              icon={GraduationCap}
            />
            <StatCard
              label="Subjects"
              count={stats?.subjectsCount ?? 0}
              sublabel="in curriculum"
              href="/subjects"
              icon={BookOpen}
            />
            <StatCard
              label="Lessons / week"
              count={stats?.timetableEntriesCount ?? 0}
              sublabel="timetable entries"
              href="/timetable"
              icon={CalendarDays}
            />
          </>
        )}
      </div>

      {/* Recent activity */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-medium text-slate-700">Recent activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest additions across the school.
          </p>
        </div>

        <div className="divide-y divide-slate-50 px-5">
          {loading ? (
            <>
              <SkeletonActivityItem />
              <SkeletonActivityItem />
              <SkeletonActivityItem />
            </>
          ) : activityError ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Could not load recent activity.
            </p>
          ) : (
            <>
              <ActivityItem
                label="Latest teacher"
                name={activity?.latestTeacher?.name ?? null}
                timestamp={activity?.latestTeacher?.createdAt ?? null}
                href="/teachers"
              />
              <ActivityItem
                label="Latest class"
                name={activity?.latestClass?.name ?? null}
                timestamp={activity?.latestClass?.createdAt ?? null}
                href="/classes"
              />
              <ActivityItem
                label="Latest timetable entry"
                name={
                  activity?.latestEntry
                    ? `${activity.latestEntry.subjectName} · ${activity.latestEntry.className} · ${activity.latestEntry.day}`
                    : null
                }
                timestamp={activity?.latestEntry?.createdAt ?? null}
                href="/timetable"
              />
            </>
          )}
        </div>
      </section>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: "Manage teachers", href: "/teachers" },
          { label: "Manage classes", href: "/classes" },
          { label: "Manage subjects", href: "/subjects" },
          { label: "View timetable", href: "/timetable" },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
          >
            {label}
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
