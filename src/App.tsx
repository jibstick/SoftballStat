import { NavLink, Route, Routes } from 'react-router-dom'
import RosterPage from './pages/RosterPage'
import GamesPage from './pages/GamesPage'
import GameSetupPage from './pages/GameSetupPage'
import GameLivePage from './pages/GameLivePage'
import StatsPage from './pages/StatsPage'
import softballIcon from './assets/softball.svg'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-emerald-600 text-white' : 'text-slate-200 hover:bg-slate-700 hover:text-white'
  }`

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <img src={softballIcon} alt="" className="w-7 h-7" />
            <span className="font-bold text-lg tracking-tight">SoftballStat</span>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Roster
            </NavLink>
            <NavLink to="/games" className={navLinkClass}>
              Games
            </NavLink>
            <NavLink to="/stats" className={navLinkClass}>
              Stats
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<RosterPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/new" element={<GameSetupPage />} />
          <Route path="/games/:gameId" element={<GameLivePage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">
        Data is stored locally in this browser only.
      </footer>
    </div>
  )
}
