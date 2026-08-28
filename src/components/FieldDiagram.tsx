import { POSITIONS, Player, Position } from '../types'

const COORDS: Record<Position, { x: number; y: number }> = {
  CF: { x: 50, y: 12 },
  LF: { x: 20, y: 28 },
  RF: { x: 80, y: 28 },
  SS: { x: 36, y: 50 },
  '2B': { x: 64, y: 50 },
  '3B': { x: 26, y: 66 },
  '1B': { x: 74, y: 66 },
  P: { x: 50, y: 66 },
  C: { x: 50, y: 88 },
}

export default function FieldDiagram({
  assignments,
  players,
  onSelect,
}: {
  assignments: Partial<Record<Position, string>>
  players: Player[]
  onSelect: (pos: Position) => void
}) {
  const playerFor = (id?: string) => players.find((p) => p.id === id)

  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-md mx-auto select-none">
      <rect x="0" y="0" width="100" height="100" rx="4" fill="#3f7d3f" />
      <polygon points="50,90 78,64 50,40 22,64" fill="#c98a4b" stroke="#f2f2e6" strokeWidth="0.6" />
      <polygon
        points="50,90 78,64 50,40 22,64"
        fill="none"
        stroke="#f2f2e6"
        strokeWidth="1.2"
        strokeDasharray="0"
      />
      {/* base markers */}
      <rect x="48.5" y="88" width="3" height="3" fill="#f2f2e6" transform="rotate(45 50 89.5)" />
      <rect x="76.5" y="62.5" width="3" height="3" fill="#f2f2e6" transform="rotate(45 78 64)" />
      <rect x="48.5" y="38.5" width="3" height="3" fill="#f2f2e6" transform="rotate(45 50 40)" />
      <rect x="20.5" y="62.5" width="3" height="3" fill="#f2f2e6" transform="rotate(45 22 64)" />

      {POSITIONS.map((pos) => {
        const { x, y } = COORDS[pos]
        const player = playerFor(assignments[pos])
        return (
          <g
            key={pos}
            onClick={() => onSelect(pos)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(pos)}
          >
            <circle
              cx={x}
              cy={y}
              r={7.5}
              fill={player ? '#ffffff' : '#e2e8f0'}
              stroke="#1e293b"
              strokeWidth="0.6"
              className="hover:fill-emerald-100"
            />
            <text x={x} y={y - 1.2} textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#1e293b">
              {pos}
            </text>
            <text x={x} y={y + 4} textAnchor="middle" fontSize="3.4" fill="#475569">
              {player ? player.number || player.name.slice(0, 3) : '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
