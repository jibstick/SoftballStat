import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/store'
import { BASERUNNING_TYPES, BaserunningType, Game, PA_OUTCOMES, PAOutcome, PitchResult } from '../types'
import { computeBattingStats, fmtAvg } from '../lib/stats'
import Modal from './Modal'

export default function BattingTab({ game }: { game: Game }) {
  const { data } = useData()
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)

  const order = [...game.lineup].sort((a, b) => a.battingOrder - b.battingOrder)

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Tap a batter to log a plate appearance or baserunning event.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left">Batter</th>
              <th className="px-2 py-2 text-left w-14">Pos</th>
              <th className="px-2 py-2 text-right">AB</th>
              <th className="px-2 py-2 text-right">H</th>
              <th className="px-2 py-2 text-right">BB</th>
              <th className="px-2 py-2 text-right">RBI</th>
              <th className="px-2 py-2 text-right">R</th>
              <th className="px-2 py-2 text-right">AVG</th>
            </tr>
          </thead>
          <tbody>
            {order.map((slot) => {
              const player = data.players.find((p) => p.id === slot.playerId)
              if (!player) return null
              const line = computeBattingStats(data, player.id, [game])
              return (
                <tr
                  key={slot.playerId}
                  className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-emerald-50 active:bg-emerald-100"
                  onClick={() => setActivePlayerId(player.id)}
                >
                  <td className="px-2 py-2 text-slate-400 font-mono">{slot.battingOrder}</td>
                  <td className="px-2 py-2 font-medium">
                    {player.number ? `#${player.number} ` : ''}
                    {player.name}
                  </td>
                  <td className="px-2 py-2 text-slate-500">
                    {game.currentPositions &&
                      (Object.entries(game.currentPositions).find(([, pid]) => pid === player.id)?.[0] ??
                        (slot.startPosition !== 'BENCH' ? slot.startPosition : '-'))}
                  </td>
                  <td className="px-2 py-2 text-right">{line.AB}</td>
                  <td className="px-2 py-2 text-right">{line.H}</td>
                  <td className="px-2 py-2 text-right">{line.BB}</td>
                  <td className="px-2 py-2 text-right">{line.RBI}</td>
                  <td className="px-2 py-2 text-right">{line.R}</td>
                  <td className="px-2 py-2 text-right font-mono">{fmtAvg(line.AVG)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {activePlayerId && (
        <PlayerBattingModal
          game={game}
          playerId={activePlayerId}
          onClose={() => setActivePlayerId(null)}
        />
      )}
    </div>
  )
}

function PlayerBattingModal({
  game,
  playerId,
  onClose,
}: {
  game: Game
  playerId: string
  onClose: () => void
}) {
  const {
    data,
    addPlateAppearance,
    deletePlateAppearance,
    addBaserunningEvent,
    deleteBaserunningEvent,
    addPitchEvent,
    deletePitchEvent,
  } = useData()
  const player = data.players.find((p) => p.id === playerId)
  const [pendingOutcome, setPendingOutcome] = useState<PAOutcome | null>(null)
  const [rbi, setRbi] = useState(0)

  if (!player) return null

  const gameEvents = [
    ...data.plateAppearances
      .filter((e) => e.gameId === game.id && e.playerId === playerId)
      .map((e) => ({ id: e.id, kind: 'pa' as const, label: e.outcome + (e.rbi ? ` (${e.rbi} RBI)` : ''), ts: e.timestamp })),
    ...data.baserunningEvents
      .filter((e) => e.gameId === game.id && e.playerId === playerId)
      .map((e) => ({ id: e.id, kind: 'run' as const, label: e.type, ts: e.timestamp })),
  ].sort((a, b) => b.ts - a.ts)

  // Pitch-by-pitch is layered on top of the outcome buttons below, not a
  // replacement for them — "the current at-bat" is derived (not stored) as
  // every pitch logged for this batter since their last plate-appearance
  // outcome in this game, so there's no separate "who's up" state to keep in
  // sync. A pitcher must be assigned to log one, same rule as Fielding.
  const currentPitcherId = game.currentPositions.P
  const lastPA = [...data.plateAppearances]
    .filter((e) => e.gameId === game.id && e.playerId === playerId)
    .sort((a, b) => b.timestamp - a.timestamp)[0]
  const currentPitches = data.pitchEvents
    .filter((e) => e.gameId === game.id && e.batterId === playerId && e.timestamp > (lastPA?.timestamp ?? 0))
    .sort((a, b) => a.timestamp - b.timestamp)
  const ballCount = currentPitches.filter((p) => p.result === 'ball').length
  // A foul only adds a strike below 2 — the standard "can't strike out on a foul" rule.
  const strikeCount = currentPitches.reduce((s, p) => {
    if (p.result === 'strike') return s + 1
    if (p.result === 'foul') return Math.min(s + 1, 2)
    return s
  }, 0)

  function logPitch(result: PitchResult) {
    if (!currentPitcherId) return
    addPitchEvent({ gameId: game.id, pitcherId: currentPitcherId, batterId: playerId, result, inning: game.currentInning })
    // Pre-fill the outcome so a walk/strikeout/HBP is one confirm tap away —
    // RBI is still adjustable before that tap (e.g. a bases-loaded walk).
    if (result === 'ball' && ballCount + 1 >= 4) setPendingOutcome('BB')
    else if (result === 'strike' && strikeCount + 1 >= 3) setPendingOutcome('SO')
    else if (result === 'hbp') setPendingOutcome('HBP')
  }

  function undoLastPitch() {
    const last = currentPitches[currentPitches.length - 1]
    if (last) deletePitchEvent(last.id)
  }

  function logPA() {
    if (!pendingOutcome) return
    addPlateAppearance({ gameId: game.id, playerId, outcome: pendingOutcome, rbi, inning: game.currentInning })
    setPendingOutcome(null)
    setRbi(0)
  }

  function logRun(type: BaserunningType) {
    addBaserunningEvent({ gameId: game.id, playerId, type, inning: game.currentInning })
  }

  return (
    <Modal
      title={`${player.number ? `#${player.number} ` : ''}${player.name}`}
      subtitle={`Inning ${game.currentInning}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase">Pitch Count</h4>
            <Link to="/guide" state={{ scrollTo: 'pitching' }} className="text-xs text-emerald-600 hover:underline">
              What do these mean?
            </Link>
          </div>
          {currentPitcherId ? (
            <div className="flex items-center gap-3 bg-slate-50 rounded-md p-3">
              <span className="font-mono text-lg text-slate-800 tabular-nums">
                {ballCount}-{strikeCount}
              </span>
              <div className="grid grid-cols-3 gap-2 flex-1">
                <button className="btn-secondary text-xs" onClick={() => logPitch('ball')}>
                  Ball
                </button>
                <button className="btn-secondary text-xs" onClick={() => logPitch('strike')}>
                  Strike
                </button>
                <button className="btn-secondary text-xs" onClick={() => logPitch('foul')}>
                  Foul
                </button>
                <button className="btn-secondary text-xs" onClick={() => logPitch('hbp')}>
                  HBP
                </button>
                <button className="btn-secondary text-xs" onClick={() => logPitch('inPlay')}>
                  In Play
                </button>
              </div>
              {currentPitches.length > 0 && (
                <button className="text-xs text-slate-400 hover:text-red-600 shrink-0" onClick={undoLastPitch}>
                  Undo pitch
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Assign a pitcher (tap the P spot on Fielding) to track pitches.</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Optional — log every pitch, or skip straight to the outcome below. "In Play" just counts the pitch;
            still pick what happened from the outcomes below.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase">Plate Appearance</h4>
            <Link
              to="/guide"
              state={{ scrollTo: 'plate-appearance' }}
              className="text-xs text-emerald-600 hover:underline"
            >
              What do these mean?
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PA_OUTCOMES.map((o) => (
              <button
                key={o.key}
                className={`btn text-xs ${
                  pendingOutcome === o.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => setPendingOutcome(o.key)}
              >
                {o.key}
              </button>
            ))}
          </div>
          {pendingOutcome && (
            <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-md p-3">
              <span className="text-sm text-slate-600">RBI on this play:</span>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-2" onClick={() => setRbi((r) => Math.max(0, r - 1))}>
                  −
                </button>
                <span className="w-4 text-center font-mono">{rbi}</span>
                <button className="btn-secondary px-2" onClick={() => setRbi((r) => Math.min(4, r + 1))}>
                  +
                </button>
              </div>
              <button className="btn-primary ml-auto" onClick={logPA}>
                Log {pendingOutcome}
              </button>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Baserunning</h4>
          <div className="grid grid-cols-3 gap-2">
            {BASERUNNING_TYPES.map((b) => (
              <button key={b.key} className="btn-secondary text-xs" onClick={() => logRun(b.key)}>
                {b.key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">This Game's Log</h4>
          {gameEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {gameEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{e.label}</span>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => (e.kind === 'pa' ? deletePlateAppearance(e.id) : deleteBaserunningEvent(e.id))}
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
