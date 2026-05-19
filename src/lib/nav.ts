import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"

export const SETUP_STEPS = [
  "School config",
  "Classes",
  "Divisions",
  "Subjects",
  "Teachers",
  "Lessons",
  "Timetable constraints",
] as const

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Timetable", href: "/timetable", icon: CalendarDays },
  { label: "Teachers", href: "/teachers", icon: Users },
  { label: "Classes", href: "/classes", icon: GraduationCap },
  { label: "Subjects", href: "/subjects", icon: BookOpen },
  { label: "AI Generator", href: "/ai-generator", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
] as const

export const cellInputClassName =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"

export const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"

export const labelClassName = "mb-1 block text-xs font-medium text-slate-600"
