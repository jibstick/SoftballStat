import { AppData, Game } from '../types'

/** Must match stats.ts's own constant — ERA is scaled to a 7-inning game there too. */
const INNINGS_PER_GAME = 7

export interface DayTrend {
  date: string
  hitting: { AVG: number | null; H: number; BB: number; SO: number; RBI: number; R: number }
  pitching: { ERA: number | null; SO: number; BB: number; W: number; L: number }
  fielding: { E: number; FPCT: number | null }
}

/**
 * Team totals by day, for the Trends page — deliberately NOT a per-player
 * breakdown (that's what the Stats tables are for). Uses the exact same
 * formulas as stats.ts (AB, ERA, FPCT) so a day's numbers here always agree
 * with what you'd get by hand-summing that day's rows there; it just works
 * straight off the raw events instead of going through computeBattingStats
 * per player, since a team total doesn't need a per-player breakdown first.
 *
 * Multiple games on the same date are merged into one point — this charts
 * calendar days, not individual games.
 */
export function computeDailyTrends(data: AppData, games: Game[]): DayTrend[] {
  const byDate = new Map<string, Game[]>()
  for (const g of games) {
    const list = byDate.get(g.date)
    if (list) list.push(g)
    else byDate.set(g.date, [g])
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, dayGames]) => {
      const gameIds = new Set(dayGames.map((g) => g.id))

      const pas = data.plateAppearances.filter((e) => gameIds.has(e.gameId))
      const count = (outcome: string) => pas.filter((p) => p.outcome === outcome).length
      const H = count('1B') + count('2B') + count('3B') + count('HR')
      const BB = count('BB')
      const SO = count('SO')
      const HBP = count('HBP')
      const SAC = count('SAC')
      const SF = count('SF')
      const AB = pas.length - BB - HBP - SAC - SF
      const RBI = pas.reduce((sum, p) => sum + (p.rbi || 0), 0)
      const R = data.baserunningEvents.filter((e) => gameIds.has(e.gameId) && e.type === 'R').length
      const AVG = AB > 0 ? H / AB : null

      const pitchEvents = data.pitchingEvents.filter((e) => gameIds.has(e.gameId))
      const pCount = (type: string) => pitchEvents.filter((e) => e.type === type).length
      const outs = pCount('OUT')
      const ER = pCount('ER')
      const ERA = outs > 0 ? (ER / (outs / 3)) * INNINGS_PER_GAME : null
      const W = dayGames.filter((g) => g.winningPitcherId).length
      const L = dayGames.filter((g) => g.losingPitcherId).length

      const fieldEvents = data.fieldingEvents.filter((e) => gameIds.has(e.gameId))
      const PO = fieldEvents.filter((e) => e.type === 'PO').length
      const A = fieldEvents.filter((e) => e.type === 'A').length
      const E = fieldEvents.filter((e) => e.type === 'E').length
      const chances = PO + A + E
      const FPCT = chances > 0 ? (PO + A) / chances : null

      return {
        date,
        hitting: { AVG, H, BB, SO, RBI, R },
        pitching: { ERA, SO: pCount('SO'), BB: pCount('BB'), W, L },
        fielding: { E, FPCT },
      }
    })
}
