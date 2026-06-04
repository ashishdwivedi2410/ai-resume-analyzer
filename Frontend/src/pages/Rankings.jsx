import { useState, useEffect } from 'react'
import { Trophy, RefreshCw, TrendingUp, Medal, ArrowUpDown } from 'lucide-react'
import { Card, Badge, ScoreRing, Spinner, EmptyState, Button } from '../components/UI'
import { SectionRadar } from '../components/Charts'
import ResultCard from '../components/ResultCard'
import { analyzeAPI } from '../services/api'
import { useToast } from '../components/Toast'
import { clsx } from 'clsx'

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-xs font-mono font-bold text-dim">
      {rank}
    </span>
  )
}

function ScoreLabel(score) {
  if (score >= 70) return { label: 'Strong', variant: 'emerald' }
  if (score >= 45) return { label: 'Moderate', variant: 'amber' }
  return { label: 'Weak', variant: 'rose' }
}

export default function Rankings() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('total_score')
  const [expandedId, setExpandedId] = useState(null)
  const toast = useToast()

  useEffect(() => { fetchRankings() }, [])

  const fetchRankings = async () => {
    setLoading(true)
    try {
      const res = await analyzeAPI.getRankings()
      setResults(res.data)
    } catch {
      toast.error('Failed to load rankings')
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...results].sort((a, b) => b[sortKey] - a[sortKey])

  const topCandidate = sorted[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bright flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber" />
            Rankings
          </h1>
          <p className="text-dim text-sm mt-0.5">All-time candidate rankings across analyses</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchRankings} disabled={loading}>
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No rankings yet"
          description="Analyze some resumes from the Dashboard to see candidates ranked here"
        />
      ) : (
        <>
          {/* Top 3 podium */}
          {sorted.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sorted.slice(0, 3).map((r, i) => {
                const { label, variant } = ScoreLabel(r.total_score)
                return (
                  <Card
                    key={r.id}
                    className={clsx(
                      'text-center relative overflow-hidden transition-all hover:border-ghost cursor-pointer',
                      i === 0 && 'border-amber/30 glow-amber md:order-2'
                    )}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    {i === 0 && (
                      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber to-transparent" />
                    )}
                    <div className="flex justify-center mb-3">
                      <MedalIcon rank={i + 1} />
                    </div>
                    <ScoreRing score={r.total_score} size={80} strokeWidth={7} label="score" />
                    <h3 className="font-display font-semibold text-bright text-sm mt-3 truncate px-2">
                      {r.candidate_name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-ghost font-mono truncate px-2 mb-2">{r.resume_filename}</p>
                    <Badge variant={variant}>{label}</Badge>

                    <div className="grid grid-cols-3 gap-1 mt-4 text-center">
                      {[
                        { label: 'SKL', value: r.skills_score },
                        { label: 'EXP', value: r.experience_score },
                        { label: 'EDU', value: r.education_score },
                      ].map(({ label: l, value }) => (
                        <div key={l} className="bg-surface rounded p-1">
                          <p className="text-xs text-ghost font-mono">{l}</p>
                          <p className="text-xs font-mono font-bold text-text">{value.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Expanded top card detail */}
          {expandedId && (
            <ResultCard
              result={sorted.find(r => r.id === expandedId)}
              rank={sorted.findIndex(r => r.id === expandedId) + 1}
            />
          )}

          {/* Radar chart */}
          {sorted.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <p className="text-xs font-mono text-dim uppercase tracking-wider mb-4">
                  Top 3 — Section Radar
                </p>
                <SectionRadar results={sorted} />
                <div className="flex justify-center gap-4 mt-2">
                  {sorted.slice(0, 3).map((r, i) => {
                    const colors = ['#6C63FF', '#38BDF8', '#10B981']
                    return (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
                        <span className="text-xs text-dim font-mono truncate max-w-[80px]">
                          {r.candidate_name?.split(' ')[0] || `#${r.resume_id}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Stats */}
              <Card>
                <p className="text-xs font-mono text-dim uppercase tracking-wider mb-4">Pool Statistics</p>
                <div className="space-y-4">
                  {[
                    { label: 'Total Candidates', value: results.length, suffix: '' },
                    { label: 'Average Score', value: (results.reduce((a, b) => a + b.total_score, 0) / results.length).toFixed(1), suffix: '/100' },
                    { label: 'Strong Matches (≥70)', value: results.filter(r => r.total_score >= 70).length, suffix: '' },
                    { label: 'Moderate (45–70)', value: results.filter(r => r.total_score >= 45 && r.total_score < 70).length, suffix: '' },
                    { label: 'Weak Matches (<45)', value: results.filter(r => r.total_score < 45).length, suffix: '' },
                  ].map(({ label, value, suffix }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-dim font-mono">{label}</span>
                      <span className="text-sm font-display font-bold text-bright">{value}{suffix}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Full table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-dim uppercase tracking-wider">
                All Candidates ({sorted.length})
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-ghost font-mono mr-2">Sort by:</span>
                {[
                  { key: 'total_score', label: 'Total' },
                  { key: 'skills_score', label: 'Skills' },
                  { key: 'experience_score', label: 'Exp' },
                  { key: 'education_score', label: 'Edu' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={clsx(
                      'text-xs font-mono px-2 py-1 rounded transition-colors',
                      sortKey === key ? 'bg-accent/15 text-accent' : 'text-ghost hover:text-dim'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Rank', 'Candidate', 'Skills', 'Experience', 'Education', 'Total', 'Match'].map((h) => (
                      <th key={h} className="text-left font-mono text-ghost pb-2 pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((r, i) => {
                    const { label, variant } = ScoreLabel(r.total_score)
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-surface cursor-pointer transition-colors"
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        <td className="py-2.5 pr-4">
                          <MedalIcon rank={i + 1} />
                        </td>
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-text">{r.candidate_name || 'Unknown'}</p>
                          <p className="text-ghost truncate max-w-[140px]">{r.resume_filename}</p>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-text">{r.skills_score.toFixed(1)}</td>
                        <td className="py-2.5 pr-4 font-mono text-text">{r.experience_score.toFixed(1)}</td>
                        <td className="py-2.5 pr-4 font-mono text-text">{r.education_score.toFixed(1)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="font-display font-bold text-bright">{r.total_score.toFixed(1)}</span>
                        </td>
                        <td className="py-2.5">
                          <Badge variant={variant}>{label}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
