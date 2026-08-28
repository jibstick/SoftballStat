import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import BattingTab from '../components/BattingTab'
import FieldingTab from '../components/FieldingTab'

export default function GameLivePage() {
  const { gameId } = useParams()
  const { data, updateGame, deleteGame } = useData()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'batting' | 'fielding'>('batting')

  const game = data.games.find((g) => g.id === gameId)

  if (!game) {
    return (
      <div className="card p-6 text-center text-slate-500">
        Game not found. <button className="text-emerald-600 underline" onClick={() => navigate('/games')}>Back to games</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              vs {game.opponent} <span className="text-slate-400 font-normal">({game.homeAway})</span>
            </h1>
            <p className="text-sm text-slate-500">{game.date}</p>
          </div>
          <span
            className={`px-2 py-0.5 h-fit rounded-full text-xs font-medium ${
              game.status === 'final' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {game.status === 'final' ? 'Final' : 'In Progress'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <ScoreControl
            label="Us"
            value={game.ourScore}
            onChange={(v) => updateGame(game.id, { ourScore: v })}
          />
          <ScoreControl
            label="Them"
            value={game.theirScore}
            onChange={(v) => updateGame(game.id, { theirScore: v })}
          />
          <div className="flex items-center gap-2">
            <span className="label mb-0">Inning</span>
            <button
              className="btn-secondary px-2"
              onClick={() => updateGame(game.id, { currentInning: Math.max(1, game.currentInning - 1) })}
            >
              −
            </button>
            <span className="w-6 text-center font-mono">{game.currentInning}</span>
            <button
              className="btn-secondary px-2"
              onClick={() => updateGame(game.id, { currentInning: game.currentInning + 1 })}
            >
              +
            </button>
            <span className="text-xs text-slate-400">/ {game.inningsScheduled}</span>
          </div>

          <div className="ml-auto flex gap-2">
            {game.status === 'final' ? (
              <button className="btn-secondary" onClick={() => updateGame(game.id, { status: 'in_progress' })}>
                Reopen
              </button>
            ) : (
              <button className="btn-primary" onClick={() => updateGame(game.id, { status: 'final' })}>
                Finalize Game
              </button>
            )}
            <button
              className="btn-danger"
              onClick={() => {
                if (confirm(`Delete the game vs ${game.opponent}? This removes all its stats.`)) {
                  deleteGame(game.id)
                  navigate('/games')
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className={`btn ${tab === 'batting' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          onClick={() => setTab('batting')}
        >
          Batting
        </button>
        <button
          className={`btn ${tab === 'fielding' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          onClick={() => setTab('fielding')}
        >
          Fielding
        </button>
      </div>

      {tab === 'batting' ? <BattingTab game={game} /> : <FieldingTab game={game} />}
    </div>
  )
}

function ScoreControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label mb-0">{label}</span>
      <button className="btn-secondary px-2" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span className="w-6 text-center font-mono">{value}</span>
      <button className="btn-secondary px-2" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}
