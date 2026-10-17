import { useState } from 'react'

export interface TrendPoint {
  date: string
  value: number | null
}

const WIDTH = 320
const HEIGHT = 120
const PAD = { top: 14, right: 40, bottom: 20, left: 8 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

/** d/m short label, e.g. "Oct 5" — compact enough for an x-axis tick on a small card. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * A single-series day-by-day line chart — one of these per stat, never a
 * multi-line combo of a rate stat (AVG/ERA/FPCT) with counting stats, since
 * those live on incompatible scales (see dataviz skill: no dual-axis charts).
 * One hue throughout (this app's own emerald accent), since a single series
 * needs no legend — the title above the chart already says what it is.
 *
 * The key numbers (latest value, and the 0/max gridlines) are always drawn,
 * not hidden behind hover — hover/touch adds the exact value for every other
 * day, and the Stats page's "By Game CSV" export has the full numbers behind
 * every point here if you need them in a spreadsheet.
 */
export default function TrendChart({
  title,
  subtitle,
  points,
  format,
}: {
  title: string
  subtitle: string
  points: TrendPoint[]
  format: (v: number) => string
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const validIndices = points.map((_, i) => i).filter((i) => points[i].value !== null)
  if (validIndices.length === 0) {
    return (
      <div className="card p-3">
        <ChartHeader title={title} subtitle={subtitle} />
        <p className="text-sm text-slate-400 py-6 text-center">No data yet</p>
      </div>
    )
  }

  const values = validIndices.map((i) => points[i].value as number)
  const maxVal = Math.max(...values)
  // Floor at 0 — every stat here is non-negative — with headroom above the
  // max so the line/end-dot never sits flush against the top edge.
  const domainMax = maxVal === 0 ? 1 : maxVal * 1.15

  const xStep = points.length > 1 ? PLOT_W / (points.length - 1) : 0
  const xAt = (i: number) => PAD.left + (points.length > 1 ? i * xStep : PLOT_W / 2)
  const yAt = (v: number) => PAD.top + PLOT_H - (v / domainMax) * PLOT_H

  const linePath = validIndices.map((i, k) => `${k === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(points[i].value as number)}`).join(' ')
  const lastIdx = validIndices[validIndices.length - 1]
  const firstIdx = validIndices[0]
  const areaPath = `${linePath} L ${xAt(lastIdx)} ${PAD.top + PLOT_H} L ${xAt(firstIdx)} ${PAD.top + PLOT_H} Z`

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const nearest = points.length > 1 ? Math.round((relX - PAD.left) / xStep) : 0
    setHoverIndex(Math.min(points.length - 1, Math.max(0, nearest)))
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div className="card p-3">
      <ChartHeader title={title} subtitle={subtitle} />
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto touch-none">
          {/* 0 and max gridlines — the two always-visible reference values */}
          <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={WIDTH - PAD.right} y2={PAD.top + PLOT_H} stroke="#e1e0d9" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top} x2={WIDTH - PAD.right} y2={PAD.top} stroke="#e1e0d9" strokeWidth={1} />
          <text x={WIDTH - PAD.right + 4} y={PAD.top + PLOT_H} dy="0.32em" fontSize={9} fill="#898781">
            0
          </text>
          <text x={WIDTH - PAD.right + 4} y={PAD.top} dy="0.32em" fontSize={9} fill="#898781">
            {format(domainMax)}
          </text>

          {/* area wash, then the line itself */}
          <path d={areaPath} fill="#059669" fillOpacity={0.1} stroke="none" />
          <path d={linePath} fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* end dot + its direct label — the endpoint value, always visible */}
          <circle cx={xAt(lastIdx)} cy={yAt(points[lastIdx].value as number)} r={4} fill="#059669" stroke="#fcfcfb" strokeWidth={2} />
          <text
            x={Math.min(xAt(lastIdx) + 6, WIDTH - PAD.right + 2)}
            y={yAt(points[lastIdx].value as number)}
            dy="0.32em"
            fontSize={10}
            fontWeight={600}
            fill="#0b0b0b"
          >
            {format(points[lastIdx].value as number)}
          </text>

          {/* first/last date labels on the x-axis */}
          <text x={PAD.left} y={HEIGHT - 4} fontSize={9} fill="#898781">
            {shortDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text x={xAt(points.length - 1)} y={HEIGHT - 4} fontSize={9} fill="#898781" textAnchor="end">
              {shortDate(points[points.length - 1].date)}
            </text>
          )}

          {/* hover crosshair */}
          {hoverIndex !== null && (
            <line
              x1={xAt(hoverIndex)}
              y1={PAD.top}
              x2={xAt(hoverIndex)}
              y2={PAD.top + PLOT_H}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
          )}

          {/* transparent hit area spanning the whole plot, for hover/touch */}
          <rect
            x={PAD.left}
            y={0}
            width={PLOT_W}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        {hovered && (
          <div
            className="absolute top-0 -translate-y-full bg-slate-800 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap"
            style={{ left: `${(xAt(hoverIndex!) / WIDTH) * 100}%`, transform: 'translate(-50%, -4px)' }}
          >
            <div className="font-semibold">{hovered.value !== null ? format(hovered.value) : '—'}</div>
            <div className="text-slate-300">{shortDate(hovered.date)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <span className="font-mono font-semibold text-slate-800 text-sm">{title}</span>
      <span className="text-xs text-slate-400 ml-1.5">{subtitle}</span>
    </div>
  )
}
