import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/store'
import { Game, PITCHING_EVENTS, Position } from '../types'
import { computeFieldingStats, computePitchingStats, fmtPct, fmtRate } from '../lib/stats'
import FieldDiagram from './FieldDiagram'
import Modal from './Modal'

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
    updateGame,
  } = useData()

  const assignedPlayerId = game.currentPositions[position]
  const assignedPlayer = data.players.find((p) => p.id === assignedPlayerId)
  const isPitcher = position === 'P'

  const fieldingLine = assignedPlayerId ? computeFieldingStats(data, assignedPlayerId, [game]) : null
  const pitchingLine = assignedPlayerId ? computePitchingStats(data, assignedPlayerId, [game]) : null

  const fieldingEvents = data.fieldingEvents
    .filter((e) => e.gameId === game.id && e.position === position)
    .sort((a, b) => b.timestamp - a.timestamp)
  const pitchingEvents = isPitcher
    ? data.pitchingEvents
        .filter((e) => e.gameId === game.id && e.playerId === assignedPlayerId)
        .sort((a, b) => b.timestamp - a.timestamp)
    : []

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
        </div>

        {isPitcher && (
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase">Pitching</h4>
              {pitchingLine && (
                <span className="text-xs text-slate-500 font-mono">
                  IP {pitchingLine.IP} · ERA {fmtRate(pitchingLine.ERA)} · WHIP {fmtRate(pitchingLine.WHIP)}
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
