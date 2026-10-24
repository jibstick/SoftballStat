/** Scoreboard-style outs display — three dots, filled left to right. A 4th+ out (forgot to advance the inning) still shows its real count rather than silently capping, so the mistake is visible. */
export default function OutsIndicator({ outs }: { outs: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase">Outs</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full border-2 ${
              i < outs ? 'bg-slate-800 border-slate-800' : 'border-slate-300'
            }`}
          />
        ))}
      </div>
      {outs > 3 && <span className="text-xs text-amber-600 font-mono">{outs}</span>}
    </div>
  )
}
