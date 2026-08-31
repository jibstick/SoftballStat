import { AppData, Game, Position, POSITIONS } from '../types'

/** Standard softball game length used to scale ERA (earned runs per full game). */
const INNINGS_PER_GAME = 7

export interface BattingStats {
  GP: number
  PA: number
  AB: number
  AVG: number | null
  OBP: number | null
  SLG: number | null
  OPS: number | null
  H: number
  '1B': number
  '2B': number
  '3B': number
  HR: number
  RBI: number
  R: number
  BB: number
  SO: number
  'K-L': number
  HBP: number
  GO: number
  SAC: number
  SF: number
  ROE: number
  FC: number
  SB: number
  'SB%': number | null
  CS: number
  PIK: number
  OA: number
}

export interface PitchingStats {
  G: number
  outs: number
  IP: string
  IPDecimal: number
  BF: number
  H: number
  R: number
  ER: number
  BB: number
  SO: number
  HR: number
  W: number
  L: number
  ERA: number | null
  WHIP: number | null
}

export interface FieldingStats {
  G: number
  PO: number
  A: number
  E: number
  FPCT: number | null
}

function gameIdSet(games: Game[]): Set<string> {
  return new Set(games.map((g) => g.id))
}

/** Games in which the player either appears in the lineup or has any recorded event. */
export function gamesPlayedBy(data: AppData, playerId: string, games: Game[]): number {
  const ids = gameIdSet(games)
  const played = new Set<string>()
  for (const g of games) {
    if (g.lineup.some((s) => s.playerId === playerId)) played.add(g.id)
  }
  for (const e of data.plateAppearances) if (ids.has(e.gameId) && e.playerId === playerId) played.add(e.gameId)
  for (const e of data.baserunningEvents) if (ids.has(e.gameId) && e.playerId === playerId) played.add(e.gameId)
  for (const e of data.fieldingEvents) if (ids.has(e.gameId) && e.playerId === playerId) played.add(e.gameId)
  for (const e of data.pitchingEvents) if (ids.has(e.gameId) && e.playerId === playerId) played.add(e.gameId)
  return played.size
}

export function computeBattingStats(data: AppData, playerId: string, games: Game[]): BattingStats {
  const ids = gameIdSet(games)
  const pas = data.plateAppearances.filter((e) => e.playerId === playerId && ids.has(e.gameId))
  const runs = data.baserunningEvents.filter((e) => e.playerId === playerId && ids.has(e.gameId))

  const count = (outcome: string) => pas.filter((p) => p.outcome === outcome).length

  const singles = count('1B')
  const doubles = count('2B')
  const triples = count('3B')
  const hr = count('HR')
  const bb = count('BB')
  const so = count('SO')
  const kl = count('KL')
  const hbp = count('HBP')
  const go = count('GO')
  const sac = count('SAC')
  const sf = count('SF')
  const roe = count('ROE')
  const fc = count('FC')

  const H = singles + doubles + triples + hr
  const PA = pas.length
  const AB = PA - bb - hbp - sac - sf
  const totalBases = singles + doubles * 2 + triples * 3 + hr * 4

  const AVG = AB > 0 ? H / AB : null
  const obpDenom = AB + bb + hbp + sf
  const OBP = obpDenom > 0 ? (H + bb + hbp) / obpDenom : null
  const SLG = AB > 0 ? totalBases / AB : null
  const OPS = OBP !== null && SLG !== null ? OBP + SLG : null

  const RBI = pas.reduce((sum, p) => sum + (p.rbi || 0), 0)
  const R = runs.filter((r) => r.type === 'R').length
  const SB = runs.filter((r) => r.type === 'SB').length
  const CS = runs.filter((r) => r.type === 'CS').length
  const PIK = runs.filter((r) => r.type === 'PIK').length
  const OA = runs.filter((r) => r.type === 'OA').length
  const sbDenom = SB + CS
  const SBPCT = sbDenom > 0 ? SB / sbDenom : null

  return {
    GP: gamesPlayedBy(data, playerId, games),
    PA,
    AB,
    AVG,
    OBP,
    SLG,
    OPS,
    H,
    '1B': singles,
    '2B': doubles,
    '3B': triples,
    HR: hr,
    RBI,
    R,
    BB: bb,
    SO: so,
    'K-L': kl,
    HBP: hbp,
    GO: go,
    SAC: sac,
    SF: sf,
    ROE: roe,
    FC: fc,
    SB,
    'SB%': SBPCT,
    CS,
    PIK,
    OA,
  }
}

export function computePitchingStats(data: AppData, playerId: string, games: Game[]): PitchingStats {
  const ids = gameIdSet(games)
  const events = data.pitchingEvents.filter((e) => e.playerId === playerId && ids.has(e.gameId))
  const count = (type: string) => events.filter((e) => e.type === type).length

  const outs = count('OUT')
  const full = Math.floor(outs / 3)
  const rem = outs % 3
  const IP = `${full}.${rem}`
  const IPDecimal = outs / 3

  const BF = count('BF')
  const H = count('H')
  const R = count('R')
  const ER = count('ER')
  const BB = count('BB')
  const SO = count('SO')
  const HR = count('HR')

  const gamesWithEvents = new Set(events.map((e) => e.gameId)).size
  const W = games.filter((g) => g.winningPitcherId === playerId).length
  const L = games.filter((g) => g.losingPitcherId === playerId).length

  const ERA = IPDecimal > 0 ? (ER / IPDecimal) * INNINGS_PER_GAME : null
  const WHIP = IPDecimal > 0 ? (BB + H) / IPDecimal : null

  return { G: gamesWithEvents, outs, IP, IPDecimal, BF, H, R, ER, BB, SO, HR, W, L, ERA, WHIP }
}

/** Fielding stats blended across every position a player fielded — see computeFieldingStatsByPosition for the per-position breakdown. */
export function computeFieldingStats(data: AppData, playerId: string, games: Game[]): FieldingStats {
  const ids = gameIdSet(games)
  const events = data.fieldingEvents.filter((e) => e.playerId === playerId && ids.has(e.gameId))
  const PO = events.filter((e) => e.type === 'PO').length
  const A = events.filter((e) => e.type === 'A').length
  const E = events.filter((e) => e.type === 'E').length
  const chances = PO + A + E
  const FPCT = chances > 0 ? (PO + A) / chances : null
  const G = new Set(events.map((e) => e.gameId)).size
  return { G, PO, A, E, FPCT }
}

export interface FieldingStatsByPosition extends FieldingStats {
  position: Position
}

/**
 * Fielding stats broken out per position actually played, instead of
 * blended together — a player who moved from SS to 2B mid-game gets a
 * separate line for each, matching what was actually happening on the
 * field at the time of each play.
 *
 * "Played this position" is judged from position-assignment history first
 * (accurate even for an inning with zero fielding chances); a fielding
 * event's own position is also honored so games recorded before assignment
 * history existed still show up.
 */
export function computeFieldingStatsByPosition(data: AppData, playerId: string, games: Game[]): FieldingStatsByPosition[] {
  const ids = gameIdSet(games)
  const assignments = data.positionAssignments.filter((e) => e.playerId === playerId && ids.has(e.gameId))
  const events = data.fieldingEvents.filter((e) => e.playerId === playerId && ids.has(e.gameId))

  const positions = new Set<Position>()
  assignments.forEach((e) => positions.add(e.position))
  events.forEach((e) => positions.add(e.position))

  return POSITIONS.filter((p) => positions.has(p)).map((position) => {
    const posEvents = events.filter((e) => e.position === position)
    const PO = posEvents.filter((e) => e.type === 'PO').length
    const A = posEvents.filter((e) => e.type === 'A').length
    const E = posEvents.filter((e) => e.type === 'E').length
    const chances = PO + A + E
    const FPCT = chances > 0 ? (PO + A) / chances : null
    const gameIds = new Set([
      ...assignments.filter((e) => e.position === position).map((e) => e.gameId),
      ...posEvents.map((e) => e.gameId),
    ])
    return { position, G: gameIds.size, PO, A, E, FPCT }
  })
}

export function fmtAvg(v: number | null): string {
  if (v === null) return '-'
  // Batting-average style: .385 (no leading zero), 1.000 kept whole.
  const s = v.toFixed(3)
  return v < 1 ? s.replace(/^0/, '') : s
}

export function fmtRate(v: number | null, digits = 2): string {
  if (v === null) return '-'
  return v.toFixed(digits)
}

export function fmtPct(v: number | null): string {
  if (v === null) return '-'
  return `${(v * 100).toFixed(1)}%`
}
