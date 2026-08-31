import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/store'
import { BASERUNNING_TYPES, BaserunningType, Game, PA_OUTCOMES, PAOutcome } from '../types'
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
  const { data, addPlateAppearance, deletePlateAppearance, addBaserunningEvent, deleteBaserunningEvent } = useData()
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
