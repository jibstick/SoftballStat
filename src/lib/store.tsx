import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadData, loadLastExportAt, requestPersistentStorage, saveData, saveLastExportAt } from './storage'
import {
  AppData,
  BaserunningEvent,
  BaserunningType,
  FieldingEvent,
  FieldingEventType,
  Game,
  LineupSlot,
  PAOutcome,
  Player,
  Position,
  PitchingEvent,
  PitchingEventType,
  PlateAppearance,
  PositionAssignmentEvent,
} from '../types'

export interface StorageNotice {
  type: 'corrupted'
  backupKey: string
}

interface DataContextValue {
  data: AppData

  /** Set when saved data couldn't be read; autosave is paused until acknowledgeCorruption() is called. */
  storageNotice: StorageNotice | null
  acknowledgeCorruption: () => void
  /** True if the most recent autosave attempt failed (e.g. storage full or disabled). */
  saveFailed: boolean

  /** Backup reminder: when a CSV was last exported, and how to record a fresh export. */
  lastExportAt: number | null
  recordExport: () => void

  addPlayer: (input: { name: string; number: string; primaryPosition?: Position }) => string
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id' | 'createdAt'>>) => void
  deletePlayer: (id: string) => void

  addGame: (input: {
    opponent: string
    date: string
    homeAway: 'home' | 'away'
    inningsScheduled: number
    lineup: LineupSlot[]
  }) => string
  updateGame: (id: string, patch: Partial<Omit<Game, 'id' | 'createdAt'>>) => void
  deleteGame: (id: string) => void
  setPositionAssignment: (gameId: string, position: Position, playerId: string | null) => void

  addPlateAppearance: (input: {
    gameId: string
    playerId: string
    outcome: PAOutcome
    rbi: number
    inning: number
  }) => string
  deletePlateAppearance: (id: string) => void

  addBaserunningEvent: (input: {
    gameId: string
    playerId: string
    type: BaserunningType
    inning: number
  }) => string
  deleteBaserunningEvent: (id: string) => void

  addFieldingEvent: (input: {
    gameId: string
    playerId: string
    position: Position
    type: FieldingEventType
    inning: number
  }) => string
  deleteFieldingEvent: (id: string) => void

  addPitchingEvent: (input: {
    gameId: string
    playerId: string
    type: PitchingEventType
    inning: number
  }) => string
  deletePitchingEvent: (id: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(() => loadData())
  const [data, setData] = useState<AppData>(initial.data)
  // While true, the autosave effect below is a no-op — this is what stops a
  // corrupted read from being silently papered over by the very next write.
  const [saveBlocked, setSaveBlocked] = useState(initial.status === 'corrupted')
  const [storageNotice, setStorageNotice] = useState<StorageNotice | null>(
    initial.status === 'corrupted' ? { type: 'corrupted', backupKey: initial.backupKey } : null,
  )
  const [saveFailed, setSaveFailed] = useState(false)
  const [lastExportAt, setLastExportAt] = useState<number | null>(() => loadLastExportAt())

  useEffect(() => {
    if (saveBlocked) return
    setSaveFailed(!saveData(data))
  }, [data, saveBlocked])

  useEffect(() => {
    requestPersistentStorage()
  }, [])

  const acknowledgeCorruption = useCallback(() => {
    setSaveBlocked(false)
    setStorageNotice(null)
  }, [])

  const recordExport = useCallback(() => {
    const now = Date.now()
    saveLastExportAt(now)
    setLastExportAt(now)
  }, [])

  const addPlayer = useCallback<DataContextValue['addPlayer']>((input) => {
    const id = uuid()
    const player: Player = { id, createdAt: Date.now(), ...input }
    setData((d) => ({ ...d, players: [...d.players, player] }))
    return id
  }, [])

  const updatePlayer = useCallback<DataContextValue['updatePlayer']>((id, patch) => {
    setData((d) => ({
      ...d,
      players: d.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }, [])

  const deletePlayer = useCallback<DataContextValue['deletePlayer']>((id) => {
    setData((d) => ({ ...d, players: d.players.filter((p) => p.id !== id) }))
  }, [])

  const addGame = useCallback<DataContextValue['addGame']>((input) => {
    const id = uuid()
    const currentPositions: Partial<Record<Position, string>> = {}
    const startingAssignments: PositionAssignmentEvent[] = []
    const now = Date.now()
    for (const slot of input.lineup) {
      if (slot.startPosition !== 'BENCH') {
        currentPositions[slot.startPosition] = slot.playerId
        // Record the starting assignment even though nothing's happened on
        // the field yet — this is what lets "positions actually played"
        // include an inning where a player never got a fielding chance.
        startingAssignments.push({
          id: uuid(),
          gameId: id,
          playerId: slot.playerId,
          position: slot.startPosition,
          inning: 1,
          timestamp: now,
        })
      }
    }
    const game: Game = {
      id,
      createdAt: now,
      status: 'setup',
      currentInning: 1,
      ourScore: 0,
      theirScore: 0,
      currentPositions,
      ...input,
    }
    setData((d) => ({
      ...d,
      games: [...d.games, game],
      positionAssignments: [...d.positionAssignments, ...startingAssignments],
    }))
    return id
  }, [])

  const updateGame = useCallback<DataContextValue['updateGame']>((id, patch) => {
    setData((d) => ({
      ...d,
      games: d.games.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }))
  }, [])

  const deleteGame = useCallback<DataContextValue['deleteGame']>((id) => {
    setData((d) => ({
      ...d,
      games: d.games.filter((g) => g.id !== id),
      plateAppearances: d.plateAppearances.filter((e) => e.gameId !== id),
      baserunningEvents: d.baserunningEvents.filter((e) => e.gameId !== id),
      fieldingEvents: d.fieldingEvents.filter((e) => e.gameId !== id),
      pitchingEvents: d.pitchingEvents.filter((e) => e.gameId !== id),
      positionAssignments: d.positionAssignments.filter((e) => e.gameId !== id),
    }))
  }, [])

  const setPositionAssignment = useCallback<DataContextValue['setPositionAssignment']>(
    (gameId, position, playerId) => {
      setData((d) => {
        const game = d.games.find((g) => g.id === gameId)
        const games = d.games.map((g) => {
          if (g.id !== gameId) return g
          const currentPositions = { ...g.currentPositions }
          if (playerId) {
            // A player can only hold one position at a time; clear their old spot.
            for (const pos of Object.keys(currentPositions) as Position[]) {
              if (currentPositions[pos] === playerId) delete currentPositions[pos]
            }
            currentPositions[position] = playerId
          } else {
            delete currentPositions[position]
          }
          return { ...g, currentPositions }
        })
        // Unassigning (playerId === null) just clears a spot; there's nothing to attribute a play to.
        const positionAssignments = playerId
          ? [
              ...d.positionAssignments,
              {
                id: uuid(),
                gameId,
                playerId,
                position,
                inning: game?.currentInning ?? 1,
                timestamp: Date.now(),
              },
            ]
          : d.positionAssignments
        return { ...d, games, positionAssignments }
      })
    },
    [],
  )

  const addPlateAppearance = useCallback<DataContextValue['addPlateAppearance']>((input) => {
    const id = uuid()
    const pa: PlateAppearance = { id, timestamp: Date.now(), ...input }
    setData((d) => ({ ...d, plateAppearances: [...d.plateAppearances, pa] }))
    return id
  }, [])

  const deletePlateAppearance = useCallback<DataContextValue['deletePlateAppearance']>((id) => {
    setData((d) => ({ ...d, plateAppearances: d.plateAppearances.filter((e) => e.id !== id) }))
  }, [])

  const addBaserunningEvent = useCallback<DataContextValue['addBaserunningEvent']>((input) => {
    const id = uuid()
    const ev: BaserunningEvent = { id, timestamp: Date.now(), ...input }
    setData((d) => ({ ...d, baserunningEvents: [...d.baserunningEvents, ev] }))
    return id
  }, [])

  const deleteBaserunningEvent = useCallback<DataContextValue['deleteBaserunningEvent']>((id) => {
    setData((d) => ({ ...d, baserunningEvents: d.baserunningEvents.filter((e) => e.id !== id) }))
  }, [])

  const addFieldingEvent = useCallback<DataContextValue['addFieldingEvent']>((input) => {
    const id = uuid()
    const ev: FieldingEvent = { id, timestamp: Date.now(), ...input }
    setData((d) => ({ ...d, fieldingEvents: [...d.fieldingEvents, ev] }))
    return id
  }, [])

  const deleteFieldingEvent = useCallback<DataContextValue['deleteFieldingEvent']>((id) => {
    setData((d) => ({ ...d, fieldingEvents: d.fieldingEvents.filter((e) => e.id !== id) }))
  }, [])

  const addPitchingEvent = useCallback<DataContextValue['addPitchingEvent']>((input) => {
    const id = uuid()
    const ev: PitchingEvent = { id, timestamp: Date.now(), ...input }
    setData((d) => ({ ...d, pitchingEvents: [...d.pitchingEvents, ev] }))
    return id
  }, [])

  const deletePitchingEvent = useCallback<DataContextValue['deletePitchingEvent']>((id) => {
    setData((d) => ({ ...d, pitchingEvents: d.pitchingEvents.filter((e) => e.id !== id) }))
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      storageNotice,
      acknowledgeCorruption,
      saveFailed,
      lastExportAt,
      recordExport,
      addPlayer,
      updatePlayer,
      deletePlayer,
      addGame,
      updateGame,
      deleteGame,
      setPositionAssignment,
      addPlateAppearance,
      deletePlateAppearance,
      addBaserunningEvent,
      deleteBaserunningEvent,
      addFieldingEvent,
      deleteFieldingEvent,
      addPitchingEvent,
      deletePitchingEvent,
    }),
    [
      data,
      storageNotice,
      acknowledgeCorruption,
      saveFailed,
      lastExportAt,
      recordExport,
      addPlayer,
      updatePlayer,
      deletePlayer,
      addGame,
      updateGame,
      deleteGame,
      setPositionAssignment,
      addPlateAppearance,
      deletePlateAppearance,
      addBaserunningEvent,
      deleteBaserunningEvent,
      addFieldingEvent,
      deleteFieldingEvent,
      addPitchingEvent,
      deletePitchingEvent,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
