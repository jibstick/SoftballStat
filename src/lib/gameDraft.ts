import { Position } from '../types'

// Autosaves the New Game form while it's being filled out, separate from
// the main event-sourced data. Without this, navigating away (or the tab
// closing) before "Start Game" silently discarded everything typed — every
// other screen in the app persists on every tap, so this was the one
// unfinished-form-loses-everything screen. This is deliberately kept out
// of AppData: it's ephemeral draft state, not something that should ever
// show up as a real game until "Start Game" is actually pressed.
const DRAFT_KEY = 'softballstat.newGameDraft.v1'

export interface GameDraftRow {
  playerId: string
  startPosition: Position | 'BENCH'
}

export interface GameDraft {
  opponent: string
  date: string
  homeAway: 'home' | 'away'
  innings: number
  rows: GameDraftRow[]
}

export function loadGameDraft(): GameDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.rows)) return null
    return parsed as GameDraft
  } catch (err) {
    console.error('Failed to load in-progress New Game draft', err)
    return null
  }
}

export function saveGameDraft(draft: GameDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (err) {
    console.error('Failed to save in-progress New Game draft', err)
  }
}

export function clearGameDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch (err) {
    console.error('Failed to clear in-progress New Game draft', err)
  }
}
