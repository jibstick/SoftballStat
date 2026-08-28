// Core data model for SoftballStat.
// Everything is event-sourced (plate appearances, baserunning, fielding,
// pitching are individual timestamped events) so stats can be recomputed
// per-game or rolled up for the season, and any single entry can be undone.

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'

export const POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']

export interface Player {
  id: string
  name: string
  number: string
  primaryPosition?: Position
  createdAt: number
}

/** Outcome of a single plate appearance. */
export type PAOutcome =
  | '1B'
  | '2B'
  | '3B'
  | 'HR'
  | 'BB'
  | 'SO'
  | 'KL'
  | 'HBP'
  | 'SAC'
  | 'SF'
  | 'ROE'
  | 'FC'
  | 'OUT'

export const PA_OUTCOMES: { key: PAOutcome; label: string }[] = [
  { key: '1B', label: 'Single' },
  { key: '2B', label: 'Double' },
  { key: '3B', label: 'Triple' },
  { key: 'HR', label: 'Home Run' },
  { key: 'BB', label: 'Walk' },
  { key: 'HBP', label: 'Hit By Pitch' },
  { key: 'SO', label: 'Strikeout (swinging)' },
  { key: 'KL', label: 'Strikeout Looking' },
  { key: 'SAC', label: 'Sac Bunt' },
  { key: 'SF', label: 'Sac Fly' },
  { key: 'ROE', label: 'Reached on Error' },
  { key: 'FC', label: "Fielder's Choice" },
  { key: 'OUT', label: 'Other Out' },
]

export interface PlateAppearance {
  id: string
  gameId: string
  playerId: string
  outcome: PAOutcome
  rbi: number
  inning: number
  timestamp: number
}

export type BaserunningType = 'R' | 'SB' | 'CS' | 'PIK'

export const BASERUNNING_TYPES: { key: BaserunningType; label: string }[] = [
  { key: 'R', label: 'Run Scored' },
  { key: 'SB', label: 'Stolen Base' },
  { key: 'CS', label: 'Caught Stealing' },
  { key: 'PIK', label: 'Picked Off' },
]

export interface BaserunningEvent {
  id: string
  gameId: string
  playerId: string
  type: BaserunningType
  inning: number
  timestamp: number
}

export type FieldingEventType = 'PO' | 'A' | 'E'

export interface FieldingEvent {
  id: string
  gameId: string
  playerId: string
  position: Position
  type: FieldingEventType
  inning: number
  timestamp: number
}

/** Counting events for whoever is pitching. IP is derived from OUT events (3 outs/inning). */
export type PitchingEventType = 'OUT' | 'BF' | 'H' | 'R' | 'ER' | 'BB' | 'SO' | 'HR' | 'HBP'

export const PITCHING_EVENTS: { key: PitchingEventType; label: string }[] = [
  { key: 'BF', label: 'Batter Faced' },
  { key: 'OUT', label: 'Out Recorded' },
  { key: 'H', label: 'Hit Allowed' },
  { key: 'BB', label: 'Walk' },
  { key: 'SO', label: 'Strikeout' },
  { key: 'HR', label: 'Home Run Allowed' },
  { key: 'R', label: 'Run Allowed' },
  { key: 'ER', label: 'Earned Run' },
  { key: 'HBP', label: 'Hit Batter' },
]

export interface PitchingEvent {
  id: string
  gameId: string
  playerId: string
  type: PitchingEventType
  inning: number
  timestamp: number
}

export interface LineupSlot {
  playerId: string
  battingOrder: number
  startPosition: Position | 'BENCH'
}

export type GameStatus = 'setup' | 'in_progress' | 'final'

export interface Game {
  id: string
  opponent: string
  date: string // ISO date (yyyy-mm-dd)
  homeAway: 'home' | 'away'
  inningsScheduled: number
  status: GameStatus
  lineup: LineupSlot[]
  /** Live defensive assignment: position -> playerId. Seeded from lineup, editable during the game. */
  currentPositions: Partial<Record<Position, string>>
  currentInning: number
  ourScore: number
  theirScore: number
  winningPitcherId?: string
  losingPitcherId?: string
  createdAt: number
}

export interface AppData {
  players: Player[]
  games: Game[]
  plateAppearances: PlateAppearance[]
  baserunningEvents: BaserunningEvent[]
  fieldingEvents: FieldingEvent[]
  pitchingEvents: PitchingEvent[]
}

export const EMPTY_DATA: AppData = {
  players: [],
  games: [],
  plateAppearances: [],
  baserunningEvents: [],
  fieldingEvents: [],
  pitchingEvents: [],
}
