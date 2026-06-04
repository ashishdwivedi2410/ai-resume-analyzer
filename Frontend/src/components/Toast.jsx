import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose flex-shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-sky flex-shrink-0" />,
  }

  const borders = {
    success: 'border-emerald/30',
    error: 'border-rose/30',
    warning: 'border-amber/30',
    info: 'border-sky/30',
  }

  return (
    <div
      className={clsx(
        'pointer-events-auto glass border rounded-lg px-4 py-3',
        'flex items-center gap-3 min-w-[280px] max-w-[380px]',
        'animate-fade-up shadow-xl',
        borders[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-text flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-ghost hover:text-dim ml-1 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
