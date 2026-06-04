import { clsx } from 'clsx'

// ── Button ────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className, loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-semibold transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-panel border border-border hover:border-ghost text-text hover:text-bright',
    ghost: 'text-dim hover:text-text hover:bg-muted',
    danger: 'bg-rose/10 border border-rose/30 text-rose hover:bg-rose/20',
    outline: 'border border-accent/40 text-accent hover:bg-accent-dim',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
    xl: 'text-base px-8 py-4',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className, glow, ...props }) {
  return (
    <div
      className={clsx(
        'bg-panel border border-border rounded-xl p-5',
        glow && 'glow-accent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-muted text-dim',
    accent: 'bg-accent-dim text-accent border border-accent/20',
    emerald: 'bg-emerald-dim text-emerald border border-emerald/20',
    amber: 'bg-amber-dim text-amber border border-amber/20',
    rose: 'bg-rose-dim text-rose border border-rose/20',
    sky: 'bg-sky-dim text-sky border border-sky/20',
  }

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-8 h-8', xl: 'w-12 h-12' }
  return (
    <svg
      className={clsx('animate-spin text-accent', sizes[size], className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'accent', label, showValue = true }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = {
    accent: 'bg-accent',
    emerald: 'bg-emerald',
    amber: 'bg-amber',
    rose: 'bg-rose',
    sky: 'bg-sky',
  }

  const getColor = (score) => {
    if (score >= 70) return 'bg-emerald'
    if (score >= 45) return 'bg-amber'
    return 'bg-rose'
  }

  const barColor = color === 'auto' ? getColor(value) : colors[color] || colors.accent

  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-dim font-mono">{label}</span>}
          {showValue && (
            <span className="text-xs font-mono font-medium text-text">{value.toFixed(1)}</span>
          )}
        </div>
      )}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-1000 ease-out', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Score Ring (SVG) ──────────────────────────────────────────────────────
export function ScoreRing({ score, size = 100, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (s) => {
    if (s >= 70) return '#10B981'
    if (s >= 45) return '#F59E0B'
    return '#F43F5E'
  }

  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1E1E2E" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-bright" style={{ fontSize: size * 0.22 }}>
          {score.toFixed(0)}
        </span>
        {label && (
          <span className="text-dim font-mono" style={{ fontSize: size * 0.1 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
        {Icon && <Icon className="w-7 h-7 text-ghost" />}
      </div>
      <h3 className="font-display font-semibold text-text mb-1">{title}</h3>
      <p className="text-dim text-sm max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-mono text-dim uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={clsx(
            'w-full bg-surface border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-ghost',
            'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all',
            error ? 'border-rose/50' : 'border-border hover:border-ghost',
            Icon && 'pl-9',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────
export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-mono text-dim uppercase tracking-wider">{label}</label>}
      <textarea
        className={clsx(
          'w-full bg-surface border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-ghost',
          'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all resize-none',
          error ? 'border-rose/50' : 'border-border hover:border-ghost',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={clsx('shimmer-bg rounded-lg', className)} />
}

// ── Divider ───────────────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <div className="h-px bg-border my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-ghost font-mono">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
