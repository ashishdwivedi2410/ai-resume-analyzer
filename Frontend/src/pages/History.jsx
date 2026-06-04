import { useState, useEffect, useMemo } from 'react'
import { BarChart2, Search, Trash2, RefreshCw, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Card, Badge, ScoreRing, ProgressBar, Spinner, EmptyState, Button, Skeleton } from '../components/UI'
import { analyzeAPI, resumeAPI } from '../services/api'
import { useToast } from '../components/Toast'
import { clsx } from 'clsx'

function ScoreLabel(score) {
  if (score >= 70) return { label: 'Strong', variant: 'emerald' }
  if (score >= 45) return { label: 'Moderate', variant: 'amber' }
  return { label: 'Weak', variant: 'rose' }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function truncateJD(text, n = 120) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n) + '…' : text
}

export default function History() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMatch, setFilterMatch] = useState('all') // 'all' | 'strong' | 'moderate' | 'weak'
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await analyzeAPI.getRankings()
      setResults(res.data)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await analyzeAPI.deleteResult(id)
      setResults((p) => p.filter((r) => r.id !== id))
      toast.success('Analysis deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let out = [...results]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((r) =>
        r.candidate_name?.toLowerCase().includes(q) ||
        r.resume_filename?.toLowerCase().includes(q) ||
        r.match_summary?.toLowerCase().includes(q)
      )
    }

    // Match filter
    if (filterMatch !== 'all') {
      out = out.filter((r) => {
        if (filterMatch === 'strong') return r.total_score >= 70
        if (filterMatch === 'moderate') return r.total_score >= 45 && r.total_score < 70
        return r.total_score < 45
      })
    }

    // Sort
    out.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return out
  }, [results, search, filterMatch, sortKey, sortDir])

  const stats = useMemo(() => ({
    total: results.length,
    strong: results.filter((r) => r.total_score >= 70).length,
    moderate: results.filter((r) => r.total_score >= 45 && r.total_score < 70).length,
    weak: results.filter((r) => r.total_score < 45).length,
    avg: results.length
      ? (results.reduce((s, r) => s + r.total_score, 0) / results.length).toFixed(1)
      : 0,
  }), [results])

  const SortIcon = ({ k }) => (
    sortKey === k
      ? <span className="text-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>
      : <span className="text-ghost">↕</span>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bright flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-sky" />
            Analysis History
          </h1>
          <p className="text-dim text-sm mt-0.5">All past resume analyses</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-text' },
            { label: 'Avg Score', value: stats.avg, color: 'text-sky' },
            { label: 'Strong', value: stats.strong, color: 'text-emerald' },
            { label: 'Moderate', value: stats.moderate, color: 'text-amber' },
            { label: 'Weak', value: stats.weak, color: 'text-rose' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3 px-2">
              <p className="text-xs text-ghost font-mono mb-1">{label}</p>
              <p className={clsx('font-display text-xl font-bold', color)}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ghost" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates, files…"
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder:text-ghost focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all font-mono"
            />
          </div>

          {/* Match filter pills */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'strong', label: 'Strong' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'weak', label: 'Weak' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterMatch(value)}
                className={clsx(
                  'text-xs font-mono px-3 py-1.5 rounded-md transition-all',
                  filterMatch === value
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'text-ghost hover:text-dim'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="No analysis history"
          description="Run your first analysis from the Dashboard to see results here"
        />
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-dim font-mono text-sm">No results match your filter</p>
          <button
            className="text-xs text-accent hover:underline mt-2 font-mono"
            onClick={() => { setSearch(''); setFilterMatch('all') }}
          >
            Clear filters
          </button>
        </Card>
      ) : (
        <>
          {/* Table header */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr>
                    {[
                      { key: 'candidate_name', label: 'Candidate' },
                      { key: 'skills_score', label: 'Skills' },
                      { key: 'experience_score', label: 'Exp' },
                      { key: 'education_score', label: 'Edu' },
                      { key: 'total_score', label: 'Total' },
                      { key: null, label: 'Match' },
                      { key: 'created_at', label: 'Date' },
                      { key: null, label: '' },
                    ].map(({ key, label }) => (
                      <th
                        key={label}
                        onClick={() => key && toggleSort(key)}
                        className={clsx(
                          'text-left font-mono text-ghost py-3 px-4 whitespace-nowrap',
                          key && 'cursor-pointer hover:text-dim select-none'
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon k={key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => {
                    const { label, variant } = ScoreLabel(r.total_score)
                    const isExpanded = expandedId === r.id
                    return (
                      <>
                        <tr
                          key={r.id}
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="hover:bg-surface/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-text">{r.candidate_name || 'Unknown'}</p>
                            <p className="text-ghost truncate max-w-[160px] font-mono">{r.resume_filename}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-text">{r.skills_score.toFixed(1)}</td>
                          <td className="py-3 px-4 font-mono text-text">{r.experience_score.toFixed(1)}</td>
                          <td className="py-3 px-4 font-mono text-text">{r.education_score.toFixed(1)}</td>
                          <td className="py-3 px-4">
                            <span className="font-display font-bold text-bright text-sm">
                              {r.total_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={variant}>{label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-ghost font-mono whitespace-nowrap">
                            {r.created_at ? formatDate(r.created_at) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {deletingId === r.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <button
                                  onClick={(e) => handleDelete(r.id, e)}
                                  className="p-1 text-ghost hover:text-rose transition-colors rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-ghost" />
                                : <ChevronDown className="w-3.5 h-3.5 text-ghost" />
                              }
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExpanded && (
                          <tr key={`${r.id}-expanded`} className="bg-surface/40">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Score bars */}
                                <div className="space-y-2">
                                  <p className="text-xs font-mono text-ghost uppercase tracking-wider mb-3">Section Scores</p>
                                  <ProgressBar label="Skills" value={r.skills_score} color="auto" />
                                  <ProgressBar label="Experience" value={r.experience_score} color="auto" />
                                  <ProgressBar label="Education" value={r.education_score} color="auto" />
                                </div>

                                {/* Match summary */}
                                {r.match_summary && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs font-mono text-ghost uppercase tracking-wider mb-3">Summary</p>
                                    <p className="text-sm text-text leading-relaxed bg-surface border border-border rounded-lg p-3">
                                      {r.match_summary}
                                    </p>

                                    {/* JD snippet */}
                                    {r.jd_text && (
                                      <div className="mt-3 bg-muted rounded-lg p-3 border border-border">
                                        <p className="text-xs text-ghost font-mono mb-1">Job Description</p>
                                        <p className="text-xs text-dim font-mono leading-relaxed line-clamp-3">
                                          {truncateJD(r.jd_text)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Strengths & Improvements */}
                              {(r.strengths?.length > 0 || r.improvements?.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                  {r.strengths?.length > 0 && (
                                    <div className="bg-emerald-dim border border-emerald/20 rounded-lg p-3">
                                      <p className="text-xs text-emerald font-mono font-medium uppercase tracking-wider mb-2">
                                        ✓ Strengths
                                      </p>
                                      <ul className="space-y-1">
                                        {r.strengths.map((s, i) => (
                                          <li key={i} className="text-xs text-text flex gap-2">
                                            <span className="text-emerald flex-shrink-0">›</span>
                                            <span>{s}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {r.improvements?.length > 0 && (
                                    <div className="bg-amber-dim border border-amber/20 rounded-lg p-3">
                                      <p className="text-xs text-amber font-mono font-medium uppercase tracking-wider mb-2">
                                        ↑ Improvements
                                      </p>
                                      <ul className="space-y-1">
                                        {r.improvements.map((s, i) => (
                                          <li key={i} className="text-xs text-text flex gap-2">
                                            <span className="text-amber flex-shrink-0">›</span>
                                            <span>{s}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-xs text-ghost font-mono">
            Showing {filtered.length} of {results.length} analyses
          </p>
        </>
      )}
    </div>
  )
}
