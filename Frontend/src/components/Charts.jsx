import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, CartesianGrid
} from 'recharts'

const COLORS = {
  skills: '#6C63FF',
  experience: '#38BDF8',
  education: '#10B981',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-panel border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-dim font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs font-mono" style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{p.value?.toFixed(1)}</span>
        </p>
      ))}
    </div>
  )
}

export function SectionRadar({ results }) {
  if (!results?.length) return null

  // Show top 5 candidates on radar
  const data = [
    { subject: 'Skills', fullMark: 100 },
    { subject: 'Experience', fullMark: 100 },
    { subject: 'Education', fullMark: 100 },
    { subject: 'Overall', fullMark: 100 },
  ]

  const top = results.slice(0, 3)

  const radarData = data.map((d) => {
    const entry = { subject: d.subject }
    top.forEach((r, i) => {
      const name = r.candidate_name || `Candidate ${i + 1}`
      if (d.subject === 'Skills') entry[name] = r.skills_score
      else if (d.subject === 'Experience') entry[name] = r.experience_score
      else if (d.subject === 'Education') entry[name] = r.education_score
      else entry[name] = r.total_score
    })
    return entry
  })

  const radarColors = ['#6C63FF', '#38BDF8', '#10B981']

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#1E1E2E" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B6B8A', fontSize: 11, fontFamily: 'DM Mono' }} />
        {top.map((r, i) => (
          <Radar
            key={r.resume_id}
            name={r.candidate_name || `Candidate ${i + 1}`}
            dataKey={r.candidate_name || `Candidate ${i + 1}`}
            stroke={radarColors[i]}
            fill={radarColors[i]}
            fillOpacity={0.08}
            strokeWidth={2}
          />
        ))}
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function ScoreBarChart({ results }) {
  if (!results?.length) return null

  const data = results.slice(0, 8).map((r) => ({
    name: r.candidate_name?.split(' ')[0] || r.resume_filename?.split('.')[0]?.slice(0, 10) || `#${r.resume_id}`,
    Skills: parseFloat(r.skills_score.toFixed(1)),
    Experience: parseFloat(r.experience_score.toFixed(1)),
    Education: parseFloat(r.education_score.toFixed(1)),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={2} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6B6B8A', fontSize: 10, fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6B6B8A', fontSize: 10, fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E1E2E' }} />
        <Bar dataKey="Skills" fill="#6C63FF" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Experience" fill="#38BDF8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Education" fill="#10B981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
