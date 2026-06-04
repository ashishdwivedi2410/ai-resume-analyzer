import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, TrendingUp, User, Briefcase, GraduationCap, Code } from 'lucide-react'
import { ScoreRing, ProgressBar, Badge, Card } from './UI'
import { clsx } from 'clsx'

function ScoreLabel(score) {
  if (score >= 70) return { label: 'Strong Match', variant: 'emerald' }
  if (score >= 45) return { label: 'Moderate Match', variant: 'amber' }
  return { label: 'Weak Match', variant: 'rose' }
}

export default function ResultCard({ result, rank }) {
  const [expanded, setExpanded] = useState(false)
  const { label, variant } = ScoreLabel(result.total_score)

  return (
    <Card className="animate-fade-up">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {rank && (
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-xs font-bold text-dim">#{rank}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-bright text-sm">
                {result.candidate_name || 'Unknown Candidate'}
              </h3>
              <Badge variant={variant}>{label}</Badge>
            </div>
            <p className="text-xs text-dim font-mono mt-0.5 truncate max-w-[240px]">
              {result.resume_filename}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <ScoreRing score={result.total_score} size={68} strokeWidth={6} label="score" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-ghost hover:text-text hover:bg-muted transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Section score bars */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Skills', value: result.skills_score, icon: Code },
          { label: 'Experience', value: result.experience_score, icon: Briefcase },
          { label: 'Education', value: result.education_score, icon: GraduationCap },
        ].map(({ label: l, value, icon: Icon }) => (
          <div key={l} className="bg-surface rounded-lg p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3 h-3 text-ghost" />
              <span className="text-xs text-dim font-mono">{l}</span>
            </div>
            <ProgressBar value={value} color="auto" showValue label="" />
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
          {/* Match summary */}
          {result.match_summary && (
            <div className="bg-surface rounded-lg p-3 border border-border">
              <p className="text-xs text-dim font-mono mb-1.5 uppercase tracking-wider">Summary</p>
              <p className="text-sm text-text leading-relaxed">{result.match_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Strengths */}
            {result.strengths?.length > 0 && (
              <div className="bg-emerald-dim border border-emerald/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald" />
                  <span className="text-xs text-emerald font-mono font-medium uppercase tracking-wider">Strengths</span>
                </div>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-text flex gap-2">
                      <span className="text-emerald mt-0.5 flex-shrink-0">›</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {result.improvements?.length > 0 && (
              <div className="bg-amber-dim border border-amber/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-amber" />
                  <span className="text-xs text-amber font-mono font-medium uppercase tracking-wider">Improvements</span>
                </div>
                <ul className="space-y-1.5">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-xs text-text flex gap-2">
                      <span className="text-amber mt-0.5 flex-shrink-0">›</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section breakdown */}
          {result.scoring_breakdown && (
            <div>
              <p className="text-xs text-dim font-mono mb-2 uppercase tracking-wider">Scoring Breakdown</p>
              <div className="space-y-2">
                {Object.entries(result.scoring_breakdown).map(([section, data]) => (
                  <div key={section} className="bg-surface rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-text capitalize font-medium">{section}</span>
                      <div className="flex items-center gap-2 text-xs font-mono text-dim">
                        <span>emb: {data.embedding_score?.toFixed(0)}</span>
                        <span className="text-ghost">·</span>
                        <span>llm: {data.llm_score?.toFixed(0)}</span>
                        <span className="text-ghost">·</span>
                        <span className="text-text font-medium">final: {data.final_score?.toFixed(0)}</span>
                      </div>
                    </div>
                    {data.reasoning && (
                      <p className="text-xs text-dim italic">{data.reasoning}</p>
                    )}
                    {data.matched_items?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {data.matched_items.slice(0, 6).map((item) => (
                          <span key={item} className="px-1.5 py-0.5 bg-emerald-dim border border-emerald/15 text-emerald text-xs rounded font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                    {data.missing_items?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.missing_items.slice(0, 4).map((item) => (
                          <span key={item} className="px-1.5 py-0.5 bg-rose-dim border border-rose/15 text-rose text-xs rounded font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
