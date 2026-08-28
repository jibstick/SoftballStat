import { useState } from 'react'
import { useData } from '../lib/store'
import { POSITIONS, Position } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'

export default function RosterPage() {
  const { data, addPlayer, updatePlayer, deletePlayer } = useData()
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<Position | ''>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const sorted = [...data.players].sort((a, b) => {
    const an = Number(a.number)
    const bn = Number(b.number)
    if (!Number.isNaN(an) && !Number.isNaN(bn) && an !== bn) return an - bn
    return a.name.localeCompare(b.name)
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addPlayer({ name: name.trim(), number: number.trim(), primaryPosition: position || undefined })
    setName('')
    setNumber('')
    setPosition('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Roster</h1>
        <p className="text-slate-500 text-sm mt-1">Add every player you might field this season.</p>
      </div>

      <form onSubmit={handleAdd} className="card p-4 flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="label" htmlFor="number">
            #
          </label>
          <input
            id="number"
            className="input"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="12"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label" htmlFor="name">
            Player name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Smith"
            required
          />
        </div>
        <div className="w-40">
          <label className="label" htmlFor="pos">
            Primary position
          </label>
          <select
            id="pos"
            className="input"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position | '')}
          >
            <option value="">—</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Add Player
        </button>
      </form>

      <div className="card overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">No players yet. Add your first player above.</p>
        ) : (
          <>
            {/* Card list on small screens — a table gets too cramped below sm. */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {sorted.map((p) =>
                editingId === p.id ? (
                  <li key={p.id} className="p-3">
                    <EditRowMobile
                      name={p.name}
                      number={p.number}
                      position={p.primaryPosition}
                      onCancel={() => setEditingId(null)}
                      onSave={(patch) => {
                        updatePlayer(p.id, patch)
                        setEditingId(null)
                      }}
                    />
                  </li>
                ) : (
                  <li key={p.id} className="p-3 flex items-center gap-3">
                    <span className="w-10 shrink-0 font-mono text-slate-400 text-sm">{p.number || '-'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.primaryPosition || 'No primary position'}</div>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <button className="btn-secondary" onClick={() => setEditingId(p.id)}>
                        Edit
                      </button>
                      <button className="btn-danger" onClick={() => setConfirmDeleteId(p.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>

            {/* Table on sm and up. */}
            <table className="w-full text-sm hidden sm:table">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left w-16">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left w-32">Position</th>
                  <th className="px-3 py-2 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    {editingId === p.id ? (
                      <EditRow
                        name={p.name}
                        number={p.number}
                        position={p.primaryPosition}
                        onCancel={() => setEditingId(null)}
                        onSave={(patch) => {
                          updatePlayer(p.id, patch)
                          setEditingId(null)
                        }}
                      />
                    ) : (
                      <>
                        <td className="px-3 py-2 font-mono">{p.number || '-'}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-slate-500">{p.primaryPosition || '-'}</td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <button className="btn-secondary" onClick={() => setEditingId(p.id)}>
                            Edit
                          </button>
                          <button className="btn-danger" onClick={() => setConfirmDeleteId(p.id)}>
                            Remove
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {confirmDeleteId &&
        (() => {
          const target = data.players.find((p) => p.id === confirmDeleteId)
          if (!target) return null
          return (
            <ConfirmDialog
              title="Remove player?"
              message={`Remove ${target.name} from the roster? Their logged stats stay in past games.`}
              confirmLabel="Remove"
              onCancel={() => setConfirmDeleteId(null)}
              onConfirm={() => {
                deletePlayer(confirmDeleteId)
                setConfirmDeleteId(null)
              }}
            />
          )
        })()}
    </div>
  )
}

function EditRow({
  name,
  number,
  position,
  onCancel,
  onSave,
}: {
  name: string
  number: string
  position?: Position
  onCancel: () => void
  onSave: (patch: { name: string; number: string; primaryPosition?: Position }) => void
}) {
  const [n, setN] = useState(name)
  const [num, setNum] = useState(number)
  const [pos, setPos] = useState<Position | ''>(position || '')

  return (
    <>
      <td className="px-3 py-2">
        <input className="input" value={num} onChange={(e) => setNum(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className="input" value={n} onChange={(e) => setN(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <select className="input" value={pos} onChange={(e) => setPos(e.target.value as Position | '')}>
          <option value="">—</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right space-x-2">
        <button
          className="btn-primary"
          onClick={() => onSave({ name: n.trim() || name, number: num.trim(), primaryPosition: pos || undefined })}
        >
          Save
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </td>
    </>
  )
}

function EditRowMobile({
  name,
  number,
  position,
  onCancel,
  onSave,
}: {
  name: string
  number: string
  position?: Position
  onCancel: () => void
  onSave: (patch: { name: string; number: string; primaryPosition?: Position }) => void
}) {
  const [n, setN] = useState(name)
  const [num, setNum] = useState(number)
  const [pos, setPos] = useState<Position | ''>(position || '')

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="input w-16" value={num} onChange={(e) => setNum(e.target.value)} placeholder="#" />
        <input className="input flex-1" value={n} onChange={(e) => setN(e.target.value)} placeholder="Name" />
      </div>
      <select className="input" value={pos} onChange={(e) => setPos(e.target.value as Position | '')}>
        <option value="">— Position —</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1"
          onClick={() => onSave({ name: n.trim() || name, number: num.trim(), primaryPosition: pos || undefined })}
        >
          Save
        </button>
        <button className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
