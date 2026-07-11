import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { LangToggle } from './components/LangToggle'
import { syncSeedDeals } from './lib/db'
import AddFillUp from './pages/AddFillUp'
import Dashboard from './pages/Dashboard'
import Deals from './pages/Deals'
import History from './pages/History'

function App() {
  useEffect(() => {
    syncSeedDeals()
    // Ask the browser to exempt this origin's storage from automatic eviction
    // under storage pressure (best-effort; unsupported/denied browsers no-op).
    navigator.storage?.persist?.()
  }, [])

  return (
    <HashRouter>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <LangToggle />
        <div className="mx-auto max-w-md pb-20">
          <Routes>
            <Route path="/" element={<AddFillUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/deals" element={<Deals />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  )
}

export default App
