import { useEffect, useState } from 'react'
import { useData } from '../lib/store'
import { Game } from '../types'
import OutsIndicator from './OutsIndicator'

const OUT_PA_OUTCOMES = new Set(['SO', 'KL', 'GO', 'SAC', 'SF', 'FC', 'OUT'])
const OUT_BASERUNNING_TYPES = new Set(['CS', 'PIK', 'OA'])
const AUTOPLAY_MS = 1400

type Side = 'batting' | 'fielding'

type PlayRow = {
  id: string
  ts: number
  inning: number
  tag: string
  tagColor: string
  label: string
  side: Side | null
  isOut: boolean
  isRun: boolean
}

/**
 * Play-by-play recreation of the game, stepping through the same events the
 * Log tab shows (minus individual pitches, for the same reason — too many
 * to be worth replaying one at a time). At each step it derives the
 * half-inning, outs, and our own running score from the events themselves,
 * rather than from the live ourScore/currentInning fields on Game, since
 * those are just "current value" counters with no history — they can't
 * tell you what the score or out count *was* three plays ago.
 *
 * There's no equivalent event trail for the opponent — this app never
 * tracks the other team's roster or plays — so their score can only ever
 * be shown as the final tally, not stepped through play by play.
 *
 * Half-inning (Top/Bottom) isn't stored either; it's inferred from
 * homeAway plus whichever side (batting vs fielding) the current run of
 * events belongs to, and outs reset whenever that side flips — which is
 * also how a half-inning boundary is detected, since the inning number
 * alone doesn't distinguish top from bottom.
 */
export default function ReplayTab({ game }: { game: Game }) {
  const { data } = useData()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const playerName = (playerId: string) => {
    const p = data.players.find((pl) => pl.id === playerId)
    if (!p) return 'Unknown player'
    return p.number ? `#${p.number} ${p.name}` : p.name
  }

  const rows: PlayRow[] = [
    ...data.plateAppearances
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'PA',
        tagColor: 'bg-emerald-100 text-emerald-700',
        label: `${playerName(e.playerId)} — ${e.outcome}${e.rbi ? ` (${e.rbi} RBI)` : ''}`,
        side: 'batting' as Side,
        isOut: OUT_PA_OUTCOMES.has(e.outcome),
        isRun: false,
      })),
    ...data.baserunningEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Run',
        tagColor: 'bg-sky-100 text-sky-700',
        label: `${playerName(e.playerId)} — ${e.type}`,
        side: 'batting' as Side,
        isOut: OUT_BASERUNNING_TYPES.has(e.type),
        isRun: e.type === 'R',
      })),
    ...data.fieldingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Field',
        tagColor: 'bg-amber-100 text-amber-700',
        label: `${playerName(e.playerId)} (${e.position}) — ${e.type}`,
        side: 'fielding' as Side,
        isOut: false,
        isRun: false,
      })),
    ...data.pitchingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Pitching',
        tagColor: 'bg-purple-100 text-purple-700',
        label: `${playerName(e.playerId)} — ${e.type}`,
        side: 'fielding' as Side,
        isOut: e.type === 'OUT',
        isRun: false,
      })),
    ...data.positionAssignments
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Assign',
        tagColor: 'bg-slate-100 text-slate-500',
        label: `${playerName(e.playerId)} assigned to ${e.position}`,
        side: null,
        isOut: false,
        isRun: false,
      })),
  ].sort((a, b) => a.ts - b.ts)

  // We bat in the Top if we're the visiting team, Bottom if we're home —
  // flips the other way for fielding.
  const weBatTop = game.homeAway === 'away'

  type Computed = { halfLabel: string; outs: number; usRuns: number }
  const computed: Computed[] = []
  {
    let currentSide: Side | null = null
    let outs = 0
    let usRuns = 0
    for (const r of rows) {
      if (r.side && r.side !== currentSide) {
        currentSide = r.side
        outs = 0
      }
      if (r.isOut) outs++
      if (r.isRun) usRuns++
      const half = currentSide ? ((currentSide === 'batting') === weBatTop ? 'Top' : 'Bottom') : null
      computed.push({ halfLabel: half ? `${half} ${r.inning}` : `Inning ${r.inning}`, outs, usRuns })
    }
  }

  useEffect(() => {
    if (!playing) return
    if (step >= rows.length) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => Math.min(rows.length, s + 1)), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [playing, step, rows.length])

  if (rows.length === 0) {
    return (
      <p className="card p-6 text-center text-slate-400 text-sm">
        Nothing logged yet — the play-by-play replay will appear here once you start scoring the game.
      </p>
    )
  }

  const atStart = step === 0
  const atEnd = step >= rows.length
  const current = step > 0 ? computed[step - 1] : null
  const currentRow = step > 0 ? rows[step - 1] : null

  function goTo(n: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(rows.length, n)))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Step back through the game exactly as it was logged. "Us" reflects runs logged via a baserunner's{' '}
        <span className="font-mono">R</span> event; {game.opponent}'s score isn't logged play by play, so only the
        final tally is shown.
      </p>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="font-mono text-base font-semibold text-slate-800">
            {step === 0 ? 'Pregame' : current!.halfLabel}
          </span>
          <OutsIndicator outs={step === 0 ? 0 : current!.outs} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            Us <span className="font-mono font-semibold text-slate-800">{step === 0 ? 0 : current!.usRuns}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            {game.opponent}{' '}
            <span className="font-mono font-semibold text-slate-800">{game.theirScore}</span>{' '}
            <span className="text-xs text-slate-400">(final)</span>
          </span>
        </div>

        {currentRow ? (
          <div className="flex items-center gap-2 bg-slate-50 rounded-md p-3">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${currentRow.tagColor}`}>
              {currentRow.tag}
            </span>
            <span className="text-sm flex-1">{currentRow.label}</span>
          </div>
        ) : (
          <p className="text-sm text-slate-400 bg-slate-50 rounded-md p-3">Nothing logged yet.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-secondary px-3" onClick={() => goTo(0)} disabled={atStart}>
          ⏮
        </button>
        <button className="btn-secondary px-3" onClick={() => goTo(step - 1)} disabled={atStart}>
          ◀ Prev
        </button>
        <button
          className="btn-primary flex-1"
          onClick={() => {
            if (atEnd) {
              setStep(0)
              setPlaying(true)
            } else {
              setPlaying((p) => !p)
            }
          }}
        >
          {playing ? 'Pause' : atEnd ? 'Replay from Start' : 'Play'}
        </button>
        <button className="btn-secondary px-3" onClick={() => goTo(step + 1)} disabled={atEnd}>
          Next ▶
        </button>
        <button className="btn-secondary px-3" onClick={() => goTo(rows.length)} disabled={atEnd}>
          ⏭
        </button>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={rows.length}
          value={step}
          onChange={(e) => goTo(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-slate-400 text-right">
          Play {step} of {rows.length}
        </p>
      </div>
    </div>
  )
}
