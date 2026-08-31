import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/store'
import { Game, PITCHING_EVENTS, PitchEvent, PitchResult, Position } from '../types'
import { computeFieldingStatsByPosition, computePitchingStats, fmtPct, fmtRate } from '../lib/stats'
import FieldDiagram from './FieldDiagram'
import Modal from './Modal'

/**
 * Unlike the batter's own pitch count (which resets on their own logged
 * plate-appearance outcome), the pitcher here is never facing a tracked
 * batter — this app doesn't track the opposing roster — so there's no
 * equivalent outcome event to anchor a reset to. Instead this replays the
 * pitcher's whole chronological pitch log and finds the start of the
 * currently-open at-bat itself: the pitches since the last one that would
 * have ended one (a 4th ball, a 3rd non-foul strike, an HBP, or a ball put
 * in play).
 */
function currentOpenAtBat(pitchesAsc: PitchEvent[]): PitchEvent[] {
  let windowStart = 0
  let balls = 0
  let strikes = 0
  for (let i = 0; i < pitchesAsc.length; i++) {
    const result = pitchesAsc[i].result
    if (result === 'ball') {
      balls++
      if (balls >= 4) {
        windowStart = i + 1
        balls = 0
        strikes = 0
      }
    } else if (result === 'strike') {
      strikes++
      if (strikes >= 3) {
        windowStart = i + 1
        balls = 0
        strikes = 0
      }
    } else if (result === 'foul') {
      strikes = Math.min(strikes + 1, 2)
    } else if (result === 'hbp' || result === 'inPlay') {
      windowStart = i + 1
      balls = 0
      strikes = 0
    }
  }
  return pitchesAsc.slice(windowStart)
}

export default function FieldingTab({ game }: { game: Game }) {
  const { data } = useData()
  const [activePosition, setActivePosition] = useState<Position | null>(null)

  const assignedIds = new Set(Object.values(game.currentPositions))
  const bench = game.lineup.filter((s) => !assignedIds.has(s.playerId))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Tap a position to assign a fielder or log a play.</p>
      <div className="card p-4">
        <FieldDiagram assignments={game.currentPositions} players={data.players} onSelect={setActivePosition} />
      </div>

      {bench.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Bench</h4>
          <div className="flex flex-wrap gap-2">
            {bench.map((s) => {
              const player = data.players.find((p) => p.id === s.playerId)
              if (!player) return null
              return (
                <span key={s.playerId} className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {activePosition && (
        <PositionModal game={game} position={activePosition} onClose={() => setActivePosition(null)} />
      )}
    </div>
  )
}

function PositionModal({ game, position, onClose }: { game: Game; position: Position; onClose: () => void }) {
  const {
    data,
    setPositionAssignment,
    addFieldingEvent,
    deleteFieldingEvent,
    addPitchingEvent,
    deletePitchingEvent,
    addPitchEvent,
    deletePitchEvent,
    updateGame,
  } = useData()

  const assignedPlayerId = game.currentPositions[position]
  const assignedPlayer = data.players.find((p) => p.id === assignedPlayerId)
  const isPitcher = position === 'P'

  // Scoped to THIS position specifically, not blended with other positions
  // the player may have covered elsewhere in the same game.
  const fieldingLine = assignedPlayerId
    ? computeFieldingStatsByPosition(data, assignedPlayerId, [game]).find((s) => s.position === position) ?? {
        position,
        G: 0,
        PO: 0,
        A: 0,
        E: 0,
        FPCT: null,
      }
    : null
  const pitchingLine = assignedPlayerId ? computePitchingStats(data, assignedPlayerId, [game]) : null

  const fieldingEvents = data.fieldingEvents
    .filter((e) => e.gameId === game.id && e.position === position)
    .sort((a, b) => b.timestamp - a.timestamp)
  const pitchingEvents = isPitcher
    ? data.pitchingEvents
        .filter((e) => e.gameId === game.id && e.playerId === assignedPlayerId)
        .sort((a, b) => b.timestamp - a.timestamp)
    : []

  const allPitcherPitches = isPitcher
    ? data.pitchEvents
        .filter((e) => e.gameId === game.id && e.pitcherId === assignedPlayerId)
        .sort((a, b) => a.timestamp - b.timestamp)
    : []
  const currentPitches = currentOpenAtBat(allPitcherPitches)
  const ballCount = currentPitches.filter((p) => p.result === 'ball').length
  const strikeCount = currentPitches.reduce((s, p) => {
    if (p.result === 'strike') return s + 1
    if (p.result === 'foul') return Math.min(s + 1, 2)
    return s
  }, 0)

  function logPitch(result: PitchResult) {
    if (!assignedPlayerId) return
    addPitchEvent({ gameId: game.id, pitcherId: assignedPlayerId, result, inning: game.currentInning })
  }

  function undoLastPitch() {
    const last = allPitcherPitches[allPitcherPitches.length - 1]
    if (last) deletePitchEvent(last.id)
  }

  // Everyone currently in the game (lineup) is eligible to be assigned here.
  const eligible = game.lineup
    .map((s) => data.players.find((p) => p.id === s.playerId))
    .filter((p): p is NonNullable<typeof p> => !!p)

  return (
    <Modal title={`${position}${assignedPlayer ? ` — ${assignedPlayer.name}` : ''}`} subtitle={`Inning ${game.currentInning}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Assigned Player</h4>
          <select
            className="input"
            value={assignedPlayerId || ''}
            onChange={(e) => setPositionAssignment(game.id, position, e.target.value || null)}
          >
            <option value="">— Unassigned —</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number ? `#${p.number} ` : ''}
                {p.name}
              </option>
            ))}
          </select>
          {assignedPlayerId &&
            (() => {
              const otherPositions = computeFieldingStatsByPosition(data, assignedPlayerId, [game])
                .map((s) => s.position)
                .filter((p) => p !== position)
              return otherPositions.length > 0 ? (
                <p className="text-xs text-slate-400 mt-1">Also played {otherPositions.join(', ')} this game.</p>
              ) : null
            })()}
        </div>

        {isPitcher && (
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase">Pitching</h4>
              {pitchingLine && (
                <span className="text-xs text-slate-500 font-mono">
                  IP {pitchingLine.IP} · P {pitchingLine.P} · ERA {fmtRate(pitchingLine.ERA)} · WHIP{' '}
                  {fmtRate(pitchingLine.WHIP)}
                </span>
              )}
            </div>
            <div className="text-right mb-2">
              <Link
                to="/guide"
                state={{ scrollTo: 'pitching' }}
                className="text-xs text-emerald-600 hover:underline"
              >
                What do these mean?
              </Link>
            </div>

            {assignedPlayerId && (
              <div className="mb-3">
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
                  {allPitcherPitches.length > 0 && (
                    <button className="text-xs text-slate-400 hover:text-red-600 shrink-0" onClick={undoLastPitch}>
                      Undo pitch
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Optional pitch count for this pitcher — separate from the counters below, which you still tap
                  yourself for BF/OUT/H/BB/etc.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {PITCHING_EVENTS.map((ev) => (
                <button
                  key={ev.key}
                  className="btn-secondary text-xs disabled:opacity-30"
                  disabled={!assignedPlayerId}
                  onClick={() =>
                    assignedPlayerId &&
                    addPitchingEvent({ gameId: game.id, playerId: assignedPlayerId, type: ev.key, inning: game.currentInning })
                  }
                >
                  +{ev.key}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={`btn text-xs ${
                  game.winningPitcherId === assignedPlayerId ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                disabled={!assignedPlayerId}
                onClick={() =>
                  updateGame(game.id, {
                    winningPitcherId: game.winningPitcherId === assignedPlayerId ? undefined : assignedPlayerId,
                  })
                }
              >
                Winning Pitcher
              </button>
              <button
                className={`btn text-xs ${
                  game.losingPitcherId === assignedPlayerId ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                disabled={!assignedPlayerId}
                onClick={() =>
                  updateGame(game.id, {
                    losingPitcherId: game.losingPitcherId === assignedPlayerId ? undefined : assignedPlayerId,
                  })
                }
              >
                Losing Pitcher
              </button>
            </div>
            {pitchingEvents.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 max-h-32 overflow-y-auto">
                {pitchingEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-1 text-sm">
                    <span>{e.type}</span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => deletePitchingEvent(e.id)}>
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase">Fielding</h4>
            {fieldingLine && (
              <span className="text-xs text-slate-500 font-mono">
                PO {fieldingLine.PO} · A {fieldingLine.A} · E {fieldingLine.E} · FPCT {fmtPct(fieldingLine.FPCT)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['PO', 'A', 'E'] as const).map((t) => (
              <button
                key={t}
                className="btn-secondary text-xs disabled:opacity-30"
                disabled={!assignedPlayerId}
                onClick={() =>
                  assignedPlayerId &&
                  addFieldingEvent({ gameId: game.id, playerId: assignedPlayerId, position, type: t, inning: game.currentInning })
                }
              >
                +{t}
              </button>
            ))}
          </div>
          {fieldingEvents.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 max-h-32 overflow-y-auto">
              {fieldingEvents.map((e) => {
                const p = data.players.find((pl) => pl.id === e.playerId)
                return (
                  <li key={e.id} className="flex items-center justify-between py-1 text-sm">
                    <span>
                      {e.type} — {p?.name || 'Unknown'}
                    </span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => deleteFieldingEvent(e.id)}>
                      Undo
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
