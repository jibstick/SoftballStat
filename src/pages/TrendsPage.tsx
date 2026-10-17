import { useData } from '../lib/store'
import { useGameFilter } from '../lib/useGameFilter'
import { computeDailyTrends } from '../lib/trends'
import { fmtAvg, fmtRate } from '../lib/stats'
import GameFilterControl from '../components/GameFilterControl'
import TrendChart, { TrendPoint } from '../components/TrendChart'

const fmtCount = (v: number) => String(v)

export default function TrendsPage() {
  const { data } = useData()
  const {
    games,
    quickRange,
    setQuickRange,
    showGamePicker,
    setShowGamePicker,
    setCustomSelectedIds,
    toggleGame,
    scopeSummary,
  } = useGameFilter(data.games)

  const days = computeDailyTrends(data, games)

  const hittingSeries: { title: string; subtitle: string; format: (v: number) => string; points: TrendPoint[] }[] = [
    { title: 'AVG', subtitle: 'Batting Average', format: fmtAvg, points: days.map((d) => ({ date: d.date, value: d.hitting.AVG })) },
    { title: 'H', subtitle: 'Hits', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.hitting.H })) },
    { title: 'BB', subtitle: 'Walks', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.hitting.BB })) },
    { title: 'SO', subtitle: 'Strikeouts', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.hitting.SO })) },
    { title: 'RBI', subtitle: 'Runs Batted In', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.hitting.RBI })) },
    { title: 'R', subtitle: 'Runs Scored', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.hitting.R })) },
  ]

  const pitchingSeries: { title: string; subtitle: string; format: (v: number) => string; points: TrendPoint[] }[] = [
    { title: 'ERA', subtitle: 'Earned Run Average', format: fmtRate, points: days.map((d) => ({ date: d.date, value: d.pitching.ERA })) },
    { title: 'SO', subtitle: 'Strikeouts', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.pitching.SO })) },
    { title: 'BB', subtitle: 'Walks', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.pitching.BB })) },
    { title: 'W', subtitle: 'Wins', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.pitching.W })) },
    { title: 'L', subtitle: 'Losses', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.pitching.L })) },
  ]

  const fieldingSeries: { title: string; subtitle: string; format: (v: number) => string; points: TrendPoint[] }[] = [
    { title: 'E', subtitle: 'Errors', format: fmtCount, points: days.map((d) => ({ date: d.date, value: d.fielding.E })) },
    { title: 'FPCT', subtitle: 'Fielding Percentage', format: fmtAvg, points: days.map((d) => ({ date: d.date, value: d.fielding.FPCT })) },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trends</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-md">
            Team totals by day, for the period selected — not a per-player breakdown (that's the Stats page). Hover or
            touch a chart for that day's exact value; every day's full numbers are also in Stats →{' '}
            <span className="font-medium">By Game CSV</span>.
          </p>
        </div>
        <GameFilterControl
          allGames={data.games}
          games={games}
          quickRange={quickRange}
          setQuickRange={setQuickRange}
          showGamePicker={showGamePicker}
          setShowGamePicker={setShowGamePicker}
          setCustomSelectedIds={setCustomSelectedIds}
          toggleGame={toggleGame}
          scopeSummary={scopeSummary}
        />
      </div>

      {days.length === 0 ? (
        <p className="card p-6 text-center text-slate-400 text-sm">No games in this range yet.</p>
      ) : (
        <>
          <TrendSection title="Hitting" series={hittingSeries} />
          <TrendSection title="Pitching" series={pitchingSeries} />
          <TrendSection title="Fielding" series={fieldingSeries} />
        </>
      )}
    </div>
  )
}

function TrendSection({
  title,
  series,
}: {
  title: string
  series: { title: string; subtitle: string; format: (v: number) => string; points: TrendPoint[] }[]
}) {
  return (
    <section>
      <h2 className="font-semibold text-slate-700 mb-2">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {series.map((s) => (
          <TrendChart key={s.title} title={s.title} subtitle={s.subtitle} format={s.format} points={s.points} />
        ))}
      </div>
    </section>
  )
}
