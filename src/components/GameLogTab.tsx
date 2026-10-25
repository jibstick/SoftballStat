import { useData } from '../lib/store'
import { downloadCsv, toCsv } from '../lib/csv'
import { Game } from '../types'

/**
 * Every logged play in this game, in one chronological list — the "raw log"
 * for when a mistake's category isn't obvious from where it happened, or
 * you just want to see the game's actual flow (runs after errors, etc.)
 * instead of hunting through each player's or position's own menu.
 *
 * Individual pitches (Ball/Strike/Foul/HBP/In Play) are deliberately left
 * out — a real game can log dozens of those, which would bury everything
 * else here. Undo those from the Ball/Strike/Foul buttons where they were
 * logged instead. Starting position assignments are shown for context but
 * aren't editable here — correct those from the Fielding tab.
 */
export default function GameLogTab({ game }: { game: Game }) {
  const {
    data,
    deletePlateAppearance,
    deleteBaserunningEvent,
    deleteFieldingEvent,
    deletePitchingEvent,
  } = useData()

  const playerName = (playerId: string) => {
    const p = data.players.find((pl) => pl.id === playerId)
    if (!p) return 'Unknown player'
    return p.number ? `#${p.number} ${p.name}` : p.name
  }

  type Row = {
    id: string
    ts: number
    inning: number
    tag: string
    tagColor: string
    label: string
    onUndo?: () => void
  }

  const rows: Row[] = [
    ...data.plateAppearances
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'PA',
        tagColor: 'bg-emerald-100 text-emerald-700',
        label: `${playerName(e.playerId)} — ${e.outcome}${e.rbi ? ` (${e.rbi} RBI)` : ''}`,
        onUndo: () => deletePlateAppearance(e.id),
      })),
    ...data.baserunningEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Run',
        tagColor: 'bg-sky-100 text-sky-700',
        label: `${playerName(e.playerId)} — ${e.type}`,
        onUndo: () => deleteBaserunningEvent(e.id),
      })),
    ...data.fieldingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Field',
        tagColor: 'bg-amber-100 text-amber-700',
        label: `${playerName(e.playerId)} (${e.position}) — ${e.type}`,
        onUndo: () => deleteFieldingEvent(e.id),
      })),
    ...data.pitchingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Pitching',
        tagColor: 'bg-purple-100 text-purple-700',
        label: `${playerName(e.playerId)} — ${e.type}`,
        onUndo: () => deletePitchingEvent(e.id),
      })),
    ...data.positionAssignments
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        id: e.id,
        ts: e.timestamp,
        inning: e.inning,
        tag: 'Assign',
        tagColor: 'bg-slate-100 text-slate-500',
        label: `${playerName(e.playerId)} assigned to ${e.position}`,
        // Not deletable here — this is a history record, not the live
        // assignment. Correct a wrong assignment from the Fielding tab.
      })),
  ].sort((a, b) => a.ts - b.ts)

  // The CSV download is the actual "everything" version of this log — unlike
  // the table above, it includes individual pitches (kept off-screen only
  // because dozens of them would bury everything else, not because they're
  // not part of the raw record) and every pitching counter, so nothing about
  // how the game went is left out of the file.
  const csvHeaders = ['Timestamp', 'Inning', 'Type', 'Player', 'Detail', 'RBI']
  const csvRows = [
    ...data.plateAppearances
      .filter((e) => e.gameId === game.id)
      .map((e) => ({ ts: e.timestamp, inning: e.inning, type: 'Plate Appearance', player: playerName(e.playerId), detail: e.outcome, rbi: e.rbi || 0 })),
    ...data.baserunningEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({ ts: e.timestamp, inning: e.inning, type: 'Baserunning', player: playerName(e.playerId), detail: e.type, rbi: '' as const })),
    ...data.fieldingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({ ts: e.timestamp, inning: e.inning, type: 'Fielding', player: playerName(e.playerId), detail: `${e.position} ${e.type}`, rbi: '' as const })),
    ...data.pitchingEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({ ts: e.timestamp, inning: e.inning, type: 'Pitching', player: playerName(e.playerId), detail: e.type, rbi: '' as const })),
    ...data.pitchEvents
      .filter((e) => e.gameId === game.id)
      .map((e) => ({
        ts: e.timestamp,
        inning: e.inning,
        type: e.pitcherId ? 'Pitch (Fielding)' : 'Pitch (Batting)',
        player: playerName((e.pitcherId || e.batterId) as string),
        detail: e.result,
        rbi: '' as const,
      })),
    ...data.positionAssignments
      .filter((e) => e.gameId === game.id)
      .map((e) => ({ ts: e.timestamp, inning: e.inning, type: 'Position Assignment', player: playerName(e.playerId), detail: e.position, rbi: '' as const })),
  ]
    .sort((a, b) => a.ts - b.ts)
    .map((r) => [new Date(r.ts).toLocaleString(), r.inning, r.type, r.player, r.detail, r.rbi])

  function downloadRawLog() {
    const opponentSlug = game.opponent.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'opponent'
    downloadCsv(`softballstat-raw-log-${game.date}-vs-${opponentSlug}.csv`, toCsv(csvHeaders, csvRows))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Every play logged this game, oldest first. Undo any row directly — individual pitches aren't shown here
          (undo those where you logged them); starting assignments are shown for context but corrected from Fielding.
        </p>
        <button className="btn-secondary text-xs shrink-0" onClick={downloadRawLog} disabled={csvRows.length === 0}>
          Download Raw Log CSV
        </button>
      </div>
      <div className="card overflow-hidden divide-y divide-slate-100">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">Nothing logged yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-5 shrink-0 text-right text-xs text-slate-400 font-mono">{r.inning}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${r.tagColor}`}>{r.tag}</span>
              <span className="flex-1 min-w-0 truncate">{r.label}</span>
              {r.onUndo && (
                <button className="shrink-0 text-xs text-red-500 hover:underline" onClick={r.onUndo}>
                  Undo
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
