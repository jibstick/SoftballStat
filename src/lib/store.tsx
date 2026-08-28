import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadData, saveData } from './storage'
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
} from '../types'

interface DataContextValue {
  data: AppData

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
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

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
    for (const slot of input.lineup) {
      if (slot.startPosition !== 'BENCH') {
        currentPositions[slot.startPosition] = slot.playerId
      }
    }
    const game: Game = {
      id,
      createdAt: Date.now(),
      status: 'setup',
      currentInning: 1,
      ourScore: 0,
      theirScore: 0,
      currentPositions,
      ...input,
    }
    setData((d) => ({ ...d, games: [...d.games, game] }))
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
    }))
  }, [])

  const setPositionAssignment = useCallback<DataContextValue['setPositionAssignment']>(
    (gameId, position, playerId) => {
      setData((d) => ({
        ...d,
        games: d.games.map((g) => {
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
        }),
      }))
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
