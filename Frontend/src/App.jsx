import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Rankings from './pages/Rankings'
import History from './pages/History'
import Navbar from './components/Navbar'
import { Spinner } from './components/UI'

function AppShell() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Spinner size="md" />
          </div>
          <p className="text-dim text-xs font-mono">Loading ResumeAI…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthPage onSuccess={() => setPage('dashboard')} />
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onGoToRankings={() => setPage('rankings')} />
      case 'rankings':
        return <Rankings />
      case 'history':
        return <History />
      default:
        return <Dashboard onGoToRankings={() => setPage('rankings')} />
    }
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(108,99,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-64 h-64 bg-sky/3 rounded-full blur-3xl pointer-events-none" />

      <Navbar page={page} setPage={setPage} />

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-12 relative">
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  )
}