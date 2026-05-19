import { Loader2 } from "lucide-react"

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      size={14}
      className={`animate-spin ${className ?? ""}`.trim()}
    />
  )
}

// Varying widths prevent a monotonous grid of identical rectangles.
const CELL_WIDTHS = [
  "w-24", "w-32", "w-20", "w-28", "w-16",
  "w-24", "w-20", "w-16", "w-8",
] as const

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-50">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className={`h-4 animate-pulse rounded bg-slate-200 ${
              CELL_WIDTHS[i % CELL_WIDTHS.length]
            }`}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTableRows({
  rows,
  cols,
}: {
  rows: number
  cols: number
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  )
}
