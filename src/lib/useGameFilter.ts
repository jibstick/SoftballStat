import { useMemo, useState } from 'react'
import { Game } from '../types'

export type QuickRange = 'all' | 'custom' | 1 | 2 | 7 | 30

export const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'all', label: 'Season (All)' },
  { key: 1, label: 'Last 1 Day' },
  { key: 2, label: 'Last 2 Days' },
  { key: 7, label: 'Last 7 Days' },
  { key: 30, label: 'Last 30 Days' },
]

/** Calendar days between a game's date and today, both at local midnight — a game played earlier today is 0. */
export function daysAgo(dateStr: string): number {
  const gameDate = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - gameDate.getTime()) / 86_400_000)
}

/**
 * The quick-range / multi-select game filter shared by Stats and Trends — one
 * state machine so picking "Last 7 Days" (or a custom set of games) means the
 * same thing, and scopes the same way, no matter which page you're on.
 */
export function useGameFilter(allGames: Game[]) {
  const [quickRange, setQuickRange] = useState<QuickRange>('all')
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set())
  const [showGamePicker, setShowGamePicker] = useState(false)

  const games = useMemo(() => {
    if (quickRange === 'all') return allGames
    if (quickRange === 'custom') return allGames.filter((g) => customSelectedIds.has(g.id))
    return allGames.filter((g) => daysAgo(g.date) < quickRange)
  }, [quickRange, customSelectedIds, allGames])

  // Toggling any individual game forks into a custom selection seeded from
  // whatever's currently showing (a quick range or an earlier custom pick),
  // so unchecking one game out of "Last 7 Days" behaves the way it looks —
  // everything else in that range stays selected.
  function toggleGame(id: string) {
    const current = new Set(games.map((g) => g.id))
    if (current.has(id)) current.delete(id)
    else current.add(id)
    setCustomSelectedIds(current)
    setQuickRange('custom')
  }

  const scopeLabel =
    quickRange === 'all'
      ? 'season'
      : quickRange === 'custom'
        ? games.length === 1
          ? games[0]?.date || 'game'
          : `${games.length}-games`
        : `last-${quickRange}-day${quickRange === 1 ? '' : 's'}`

  const scopeSummary =
    quickRange === 'all'
      ? `Season — ${games.length} game${games.length === 1 ? '' : 's'}`
      : quickRange === 'custom'
        ? `${games.length} selected game${games.length === 1 ? '' : 's'}`
        : `Last ${quickRange} day${quickRange === 1 ? '' : 's'} — ${games.length} game${games.length === 1 ? '' : 's'}`

  return {
    games,
    quickRange,
    setQuickRange,
    showGamePicker,
    setShowGamePicker,
    setCustomSelectedIds,
    toggleGame,
    scopeLabel,
    scopeSummary,
  }
}
