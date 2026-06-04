import { Brain, LogOut, BarChart2, Upload, Trophy, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'

export default function Navbar({ page, setPage }) {
  const { user, logout } = useAuth()

  const navItems = [
    { id: 'dashboard', label: 'Analyze', icon: Upload },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'history', label: 'History', icon: BarChart2 },
  ]

  return (
    <header className="fixed top-0 inset-x-0 z-40 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setPage('dashboard')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <Brain className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="font-display font-bold text-bright text-sm tracking-tight">
            Resume<span className="text-gradient">AI</span>
          </span>
        </button>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-medium transition-all',
                page === id
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-dim hover:text-text hover:bg-muted'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs font-mono font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-xs text-dim font-mono max-w-[120px] truncate">
              {user?.email || 'User'}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-ghost hover:text-rose hover:bg-rose-dim transition-all"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
