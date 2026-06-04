import { useState } from 'react'
import { Brain, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'
import { Button, Input, Divider } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const toast = useToast()

  const update = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
        onSuccess()
      } else {
        await register(form.email, form.password, form.full_name)
        toast.success('Account created! Please sign in.')
        setMode('login')
        setForm((p) => ({ ...p, password: '' }))
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#6C63FF 1px, transparent 1px), linear-gradient(90deg, #6C63FF 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-sky/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 mb-4 mx-auto">
            <Brain className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-bright mb-1">
            Resume<span className="text-gradient">AI</span>
          </h1>
          <p className="text-dim text-sm">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-panel border border-border rounded-2xl p-6 space-y-4">
          {mode === 'register' && (
            <Input
              label="Full Name"
              icon={User}
              placeholder="John Doe"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              error={errors.full_name}
            />
          )}

          <Input
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <Input
            label="Password"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <Button
            className="w-full mt-2"
            onClick={handleSubmit}
            loading={loading}
            size="lg"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Divider />

          <p className="text-center text-xs text-dim">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}) }}
              className="text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Feature hints */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🧠', label: 'AI Scoring' },
            { icon: '📊', label: 'Analytics' },
            { icon: '⚡', label: 'Instant' },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-3">
              <div className="text-lg mb-1">{icon}</div>
              <span className="text-xs text-ghost font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
