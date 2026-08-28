import { Link } from 'react-router-dom'
import { useData } from '../lib/store'

export default function GamesPage() {
  const { data, deleteGame } = useData()

  const sorted = [...data.games].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Games</h1>
          <p className="text-slate-500 text-sm mt-1">Create a game, set the lineup, then track it live.</p>
        </div>
        <Link to="/games/new" className="btn-primary">
          + New Game
        </Link>
      </div>

      {data.players.length === 0 && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 border-amber-200">
          Add players to your roster first before creating a game.
        </div>
      )}

      <div className="card overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">No games yet.</p>
        ) : (
          <>
            {/* Card list on small screens. */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {sorted.map((g) => (
                <li key={g.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{g.opponent}</div>
                      <div className="text-xs text-slate-500">
                        {g.date} · <span className="capitalize">{g.homeAway}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        g.status === 'final' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {g.status === 'final' ? 'Final' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-600">
                      {g.ourScore} - {g.theirScore}
                    </span>
                    <div className="flex gap-2">
                      <Link to={`/games/${g.id}`} className="btn-secondary">
                        Open
                      </Link>
                      <button
                        className="btn-danger"
                        onClick={() => {
                          if (confirm(`Delete the game vs ${g.opponent} on ${g.date}? This removes all its stats.`)) {
                            deleteGame(g.id)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Table on sm and up. */}
            <table className="w-full text-sm hidden sm:table">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Opponent</th>
                  <th className="px-3 py-2 text-left">Home/Away</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{g.date}</td>
                    <td className="px-3 py-2 font-medium">{g.opponent}</td>
                    <td className="px-3 py-2 capitalize text-slate-500">{g.homeAway}</td>
                    <td className="px-3 py-2">
                      {g.ourScore} - {g.theirScore}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.status === 'final'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {g.status === 'final' ? 'Final' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Link to={`/games/${g.id}`} className="btn-secondary">
                        Open
                      </Link>
                      <button
                        className="btn-danger"
                        onClick={() => {
                          if (confirm(`Delete the game vs ${g.opponent} on ${g.date}? This removes all its stats.`)) {
                            deleteGame(g.id)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
