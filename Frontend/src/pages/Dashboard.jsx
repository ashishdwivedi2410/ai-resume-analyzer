import { useState, useEffect } from 'react'
import { FileText, Zap, Layers, CheckCircle, AlertCircle, Trash2, RefreshCw, Play } from 'lucide-react'
import { Button, Card, Textarea, Spinner, EmptyState, Badge, Skeleton } from '../components/UI'
import DropZone from '../components/DropZone'
import ResultCard from '../components/ResultCard'
import { ScoreBarChart } from '../components/Charts'
import { resumeAPI, analyzeAPI } from '../services/api'
import { useToast } from '../components/Toast'
import { clsx } from 'clsx'

const SAMPLE_JD = `We are looking for a Senior Python Backend Developer to join our team.

Requirements:
- 4+ years of experience with Python and FastAPI or Django
- Strong knowledge of PostgreSQL and Redis
- Experience with Docker, Kubernetes, and AWS
- Familiarity with REST APIs and microservices architecture
- Understanding of authentication (JWT, OAuth2)
- Experience with CI/CD pipelines (GitHub Actions)

Nice to have:
- Knowledge of machine learning or AI integration
- Experience with vector databases
- Contributions to open source projects`

export default function Dashboard({ onGoToRankings }) {
  const [resumes, setResumes] = useState([])
  const [selected, setSelected] = useState([])
  const [jdText, setJdText] = useState('')
  const [results, setResults] = useState([])
  const [uploadingBatch, setUploadingBatch] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingResumes, setLoadingResumes] = useState(true)
  const [step, setStep] = useState(1) // 1=upload, 2=jd, 3=results
  const toast = useToast()

  useEffect(() => { fetchResumes() }, [])

  const fetchResumes = async () => {
    setLoadingResumes(true)
    try {
      const res = await resumeAPI.list()
      setResumes(res.data)
    } catch {
      toast.error('Failed to load resumes')
    } finally {
      setLoadingResumes(false)
    }
  }

  const handleUpload = async (files) => {
    setUploadingBatch(true)
    try {
      let newResumes = []
      if (files.length === 1) {
        const res = await resumeAPI.upload(files[0])
        newResumes = [res.data]
      } else {
        const res = await resumeAPI.uploadBatch(files)
        newResumes = res.data
      }
      setResumes((prev) => [...newResumes, ...prev])
      setSelected((prev) => [...prev, ...newResumes.map((r) => r.id)])
      toast.success(`${newResumes.length} resume${newResumes.length > 1 ? 's' : ''} uploaded`)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploadingBatch(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const deleteResume = async (id, e) => {
    e.stopPropagation()
    try {
      await resumeAPI.delete(id)
      setResumes((p) => p.filter((r) => r.id !== id))
      setSelected((p) => p.filter((x) => x !== id))
      toast.success('Resume deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleAnalyze = async () => {
    if (!selected.length) return toast.warning('Select at least one resume')
    if (!jdText.trim()) return toast.warning('Enter a job description')
    setAnalyzing(true)
    setResults([])
    try {
      if (selected.length === 1) {
        const res = await analyzeAPI.single({ resume_id: selected[0], jd_text: jdText })
        setResults([res.data])
      } else {
        const res = await analyzeAPI.batch({ resume_ids: selected, jd_text: jdText })
        setResults(res.data.analysis_details)
      }
      setStep(3)
      toast.success('Analysis complete!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const sortedResults = [...results].sort((a, b) => b.total_score - a.total_score)

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bright">Analyze Resumes</h1>
          <p className="text-dim text-sm mt-0.5">Upload, compare and score candidates against a job description</p>
        </div>
        {results.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => { setResults([]); setStep(1) }}>
            <RefreshCw className="w-3.5 h-3.5" /> New Analysis
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Upload' },
          { n: 2, label: 'Job Description' },
          { n: 3, label: 'Results' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center">
            <div className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all',
              step === n ? 'bg-accent/15 text-accent border border-accent/25' :
              step > n ? 'text-emerald' : 'text-ghost'
            )}>
              <span className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                step === n ? 'bg-accent text-white' :
                step > n ? 'bg-emerald text-white' : 'bg-muted text-ghost'
              )}>
                {step > n ? '✓' : n}
              </span>
              {label}
            </div>
            {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Upload + Library */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-text text-sm">Resume Library</h2>
              {resumes.length > 0 && (
                <Badge variant="accent">{resumes.length}</Badge>
              )}
            </div>
            <DropZone multiple onFilesReady={handleUpload} uploading={uploadingBatch} />
          </Card>

          {/* Resume list */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-dim uppercase tracking-wider">Select to Analyze</span>
              {resumes.length > 0 && (
                <button
                  className="text-xs text-accent hover:text-accent-hover font-mono transition-colors"
                  onClick={() => selected.length === resumes.length
                    ? setSelected([])
                    : setSelected(resumes.map((r) => r.id))
                  }
                >
                  {selected.length === resumes.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {loadingResumes ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : resumes.length === 0 ? (
              <EmptyState icon={FileText} title="No resumes yet" description="Upload resumes above to get started" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {resumes.map((r) => {
                  const isSelected = selected.includes(r.id)
                  const name = r.parsed_data?.name || r.filename
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleSelect(r.id)}
                      className={clsx(
                        'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-accent/40 bg-accent-dim'
                          : 'border-border hover:border-ghost bg-surface'
                      )}
                    >
                      <div className={clsx(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected ? 'bg-accent border-accent' : 'border-ghost'
                      )}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">{name}</p>
                        <p className="text-xs text-ghost font-mono truncate">{r.filename}</p>
                      </div>
                      <button
                        onClick={(e) => deleteResume(r.id, e)}
                        className="text-ghost hover:text-rose transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right — JD + Results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h2 className="font-display font-semibold text-text text-sm">Job Description</h2>
              </div>
              <button
                onClick={() => setJdText(SAMPLE_JD)}
                className="text-xs text-ghost hover:text-dim font-mono border border-border hover:border-ghost rounded px-2 py-1 transition-all"
              >
                Load sample
              </button>
            </div>
            <Textarea
              placeholder="Paste the full job description here — required skills, experience level, responsibilities..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="h-48 font-mono text-xs leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-ghost font-mono">
                {selected.length} resume{selected.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                onClick={handleAnalyze}
                loading={analyzing}
                disabled={!selected.length || !jdText.trim()}
                size="lg"
              >
                <Zap className="w-4 h-4" />
                {analyzing ? 'Analyzing...' : `Analyze ${selected.length || ''}`}
              </Button>
            </div>
          </Card>

          {/* Results */}
          {analyzing && (
            <Card className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-display font-semibold text-text">Analyzing resumes…</p>
                <p className="text-dim text-sm mt-1">Claude is scoring and generating feedback</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-ghost font-mono">
                <span>↗ Embedding similarity</span>
                <span>·</span>
                <span>↗ LLM scoring</span>
                <span>·</span>
                <span>↗ Feedback</span>
              </div>
            </Card>
          )}

          {!analyzing && results.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Analyzed', value: results.length, unit: 'resumes', color: 'text-accent' },
                  { label: 'Top Score', value: Math.max(...results.map(r => r.total_score)).toFixed(1), unit: '/100', color: 'text-emerald' },
                  { label: 'Avg Score', value: (results.reduce((a, b) => a + b.total_score, 0) / results.length).toFixed(1), unit: '/100', color: 'text-sky' },
                ].map(({ label, value, unit, color }) => (
                  <Card key={label} className="text-center py-3">
                    <p className="text-xs text-dim font-mono mb-1">{label}</p>
                    <p className={clsx('font-display text-2xl font-bold', color)}>{value}</p>
                    <p className="text-xs text-ghost font-mono">{unit}</p>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              {results.length > 1 && (
                <Card>
                  <p className="text-xs font-mono text-dim uppercase tracking-wider mb-3">Score Comparison</p>
                  <ScoreBarChart results={sortedResults} />
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    {[['#6C63FF', 'Skills'], ['#38BDF8', 'Experience'], ['#10B981', 'Education']].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                        <span className="text-xs text-dim font-mono">{l}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Result cards */}
              <div className="space-y-3">
                {sortedResults.map((r, i) => (
                  <ResultCard key={r.id} result={r} rank={results.length > 1 ? i + 1 : null} />
                ))}
              </div>

              {results.length > 1 && (
                <Button variant="outline" className="w-full" onClick={onGoToRankings}>
                  <Play className="w-4 h-4" /> View Full Rankings
                </Button>
              )}
            </>
          )}

          {!analyzing && results.length === 0 && step < 3 && (
            <Card className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-ghost" />
              </div>
              <p className="font-display font-semibold text-text">Ready to analyze</p>
              <p className="text-sm text-dim mt-1 text-center max-w-xs">
                Select resumes from the library, enter a job description, then hit Analyze
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
