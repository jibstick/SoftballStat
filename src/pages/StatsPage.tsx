import { useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { computeBattingStats, computeFieldingStats, computePitchingStats, fmtAvg, fmtPct, fmtRate } from '../lib/stats'
import { downloadCsv, toCsv } from '../lib/csv'

export default function StatsPage() {
  const { data } = useData()
  const [gameFilter, setGameFilter] = useState<string>('season')

  const games = useMemo(() => {
    if (gameFilter === 'season') return data.games
    const g = data.games.find((g) => g.id === gameFilter)
    return g ? [g] : []
  }, [gameFilter, data.games])

  const scopeLabel = gameFilter === 'season' ? 'season' : games[0]?.date || 'game'

  const battingRows = data.players.map((p) => ({ player: p, stats: computeBattingStats(data, p.id, games) }))
  const pitchingRows = data.players
    .map((p) => ({ player: p, stats: computePitchingStats(data, p.id, games) }))
    .filter((r) => r.stats.outs > 0 || r.stats.BF > 0)
  const fieldingRows = data.players
    .map((p) => ({ player: p, stats: computeFieldingStats(data, p.id, games) }))
    .filter((r) => r.stats.PO + r.stats.A + r.stats.E > 0)

  function exportBatting() {
    const headers = [
      'Player', 'Number', 'GP', 'PA', 'AB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '1B', '2B', '3B', 'HR', 'RBI', 'R',
      'BB', 'SO', 'K-L', 'HBP', 'SAC', 'SF', 'ROE', 'FC', 'SB', 'SB%', 'CS', 'PIK',
    ]
    const rows = battingRows.map(({ player, stats: s }) => [
      player.name, player.number, s.GP, s.PA, s.AB, fmtAvg(s.AVG), fmtAvg(s.OBP), fmtAvg(s.SLG), fmtAvg(s.OPS),
      s.H, s['1B'], s['2B'], s['3B'], s.HR, s.RBI, s.R, s.BB, s.SO, s['K-L'], s.HBP, s.SAC, s.SF, s.ROE, s.FC,
      s.SB, fmtPct(s['SB%']), s.CS, s.PIK,
    ])
    downloadCsv(`softballstat-batting-${scopeLabel}.csv`, toCsv(headers, rows))
  }

  function exportPitching() {
    const headers = ['Player', 'Number', 'G', 'IP', 'BF', 'H', 'R', 'ER', 'BB', 'SO', 'HR', 'W', 'L', 'ERA', 'WHIP']
    const rows = pitchingRows.map(({ player, stats: s }) => [
      player.name, player.number, s.G, s.IP, s.BF, s.H, s.R, s.ER, s.BB, s.SO, s.HR, s.W, s.L,
      fmtRate(s.ERA), fmtRate(s.WHIP),
    ])
    downloadCsv(`softballstat-pitching-${scopeLabel}.csv`, toCsv(headers, rows))
  }

  function exportFielding() {
    const headers = ['Player', 'Number', 'G', 'PO', 'A', 'E', 'FPCT']
    const rows = fieldingRows.map(({ player, stats: s }) => [
      player.name, player.number, s.G, s.PO, s.A, s.E, fmtAvg(s.FPCT),
    ])
    downloadCsv(`softballstat-fielding-${scopeLabel}.csv`, toCsv(headers, rows))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stats</h1>
          <p className="text-slate-500 text-sm mt-1">Season totals roll up every game unless you filter to one.</p>
        </div>
        <div className="w-56">
          <label className="label" htmlFor="scope">
            Showing
          </label>
          <select id="scope" className="input" value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
            <option value="season">Season (all games)</option>
            {[...data.games]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.date} vs {g.opponent}
                </option>
              ))}
          </select>
        </div>
      </div>

      <Section title="Batting" onExport={exportBatting} empty={battingRows.length === 0}>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'GP', 'PA', 'AB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '1B', '2B', '3B', 'HR', 'RBI', 'R', 'BB', 'SO', 'K-L', 'HBP', 'SAC', 'SF', 'ROE', 'FC', 'SB', 'SB%', 'CS', 'PIK'].map(
                (h) => (
                  <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {battingRows.map(({ player, stats: s }) => (
              <tr key={player.id}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right">{s.GP}</td>
                <td className="text-right">{s.PA}</td>
                <td className="text-right">{s.AB}</td>
                <td className="text-right font-mono">{fmtAvg(s.AVG)}</td>
                <td className="text-right font-mono">{fmtAvg(s.OBP)}</td>
                <td className="text-right font-mono">{fmtAvg(s.SLG)}</td>
                <td className="text-right font-mono">{fmtAvg(s.OPS)}</td>
                <td className="text-right">{s.H}</td>
                <td className="text-right">{s['1B']}</td>
                <td className="text-right">{s['2B']}</td>
                <td className="text-right">{s['3B']}</td>
                <td className="text-right">{s.HR}</td>
                <td className="text-right">{s.RBI}</td>
                <td className="text-right">{s.R}</td>
                <td className="text-right">{s.BB}</td>
                <td className="text-right">{s.SO}</td>
                <td className="text-right">{s['K-L']}</td>
                <td className="text-right">{s.HBP}</td>
                <td className="text-right">{s.SAC}</td>
                <td className="text-right">{s.SF}</td>
                <td className="text-right">{s.ROE}</td>
                <td className="text-right">{s.FC}</td>
                <td className="text-right">{s.SB}</td>
                <td className="text-right">{fmtPct(s['SB%'])}</td>
                <td className="text-right">{s.CS}</td>
                <td className="text-right">{s.PIK}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Pitching" onExport={exportPitching} empty={pitchingRows.length === 0}>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'G', 'IP', 'BF', 'H', 'R', 'ER', 'BB', 'SO', 'HR', 'W', 'L', 'ERA', 'WHIP'].map((h) => (
                <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pitchingRows.map(({ player, stats: s }) => (
              <tr key={player.id}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right">{s.G}</td>
                <td className="text-right font-mono">{s.IP}</td>
                <td className="text-right">{s.BF}</td>
                <td className="text-right">{s.H}</td>
                <td className="text-right">{s.R}</td>
                <td className="text-right">{s.ER}</td>
                <td className="text-right">{s.BB}</td>
                <td className="text-right">{s.SO}</td>
                <td className="text-right">{s.HR}</td>
                <td className="text-right">{s.W}</td>
                <td className="text-right">{s.L}</td>
                <td className="text-right font-mono">{fmtRate(s.ERA)}</td>
                <td className="text-right font-mono">{fmtRate(s.WHIP)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Fielding" onExport={exportFielding} empty={fieldingRows.length === 0}>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'G', 'PO', 'A', 'E', 'FPCT'].map((h) => (
                <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fieldingRows.map(({ player, stats: s }) => (
              <tr key={player.id}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right">{s.G}</td>
                <td className="text-right">{s.PO}</td>
                <td className="text-right">{s.A}</td>
                <td className="text-right">{s.E}</td>
                <td className="text-right font-mono">{fmtAvg(s.FPCT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

function Section({
  title,
  onExport,
  empty,
  children,
}: {
  title: string
  onExport: () => void
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        <button className="btn-secondary text-xs" onClick={onExport} disabled={empty}>
          Export CSV
        </button>
      </div>
      <div className="card overflow-x-auto">
        {empty ? (
          <p className="p-6 text-center text-slate-400 text-sm">No {title.toLowerCase()} data yet.</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
