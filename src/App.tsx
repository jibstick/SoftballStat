import { NavLink, Route, Routes } from 'react-router-dom'
import RosterPage from './pages/RosterPage'
import GamesPage from './pages/GamesPage'
import GameSetupPage from './pages/GameSetupPage'
import GameLivePage from './pages/GameLivePage'
import StatsPage from './pages/StatsPage'
import GuidePage from './pages/GuidePage'
import softballIcon from './assets/softball.svg'
import { useData } from './lib/store'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-emerald-600 text-white' : 'text-slate-200 hover:bg-slate-700 hover:text-white'
  }`

export default function App() {
  const { storageNotice, acknowledgeCorruption, saveFailed } = useData()

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
            <NavLink to="/guide" className={navLinkClass}>
              Guide
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {storageNotice && (
          <div className="card p-4 mb-6 bg-amber-50 border-amber-200 text-amber-800 text-sm space-y-2">
            <p className="font-semibold">Your saved data couldn't be read.</p>
            <p>
              This browser has SoftballStat data that's unreadable — usually a sign the browser tab or storage was
              interrupted mid-save. Nothing has been deleted: the original is preserved in this browser under a
              recovery key ({storageNotice.backupKey}). Starting fresh below will not touch it, so a developer can
              still recover it if needed.
            </p>
            <button className="btn-primary" onClick={acknowledgeCorruption}>
              Start Fresh
            </button>
          </div>
        )}
        {!storageNotice && saveFailed && (
          <div className="card p-3 mb-6 bg-red-50 border-red-200 text-red-800 text-sm">
            <span className="font-semibold">Your last change couldn't be saved.</span> This browser's storage may be
            full or disabled (e.g. private browsing). Export a CSV backup from the Stats page as soon as you can.
          </div>
        )}
        <Routes>
          <Route path="/" element={<RosterPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/new" element={<GameSetupPage />} />
          <Route path="/games/:gameId" element={<GameLivePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">
        Data is stored locally in this browser only.
      </footer>
    </div>
  )
}
