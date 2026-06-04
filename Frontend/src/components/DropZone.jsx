import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, File } from 'lucide-react'
import { clsx } from 'clsx'
import { Spinner } from './UI'

const ACCEPTED = ['.pdf', '.docx']
const MAX_MB = 10

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  return ext === 'pdf' ? '📄' : '📝'
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function DropZone({ multiple = false, onFilesReady, uploading = false }) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const inputRef = useRef()

  const validate = (fileList) => {
    const valid = []
    const errs = []
    for (const f of fileList) {
      const ext = '.' + f.name.split('.').pop().toLowerCase()
      if (!ACCEPTED.includes(ext)) {
        errs.push(`${f.name}: unsupported format`)
      } else if (f.size > MAX_MB * 1024 * 1024) {
        errs.push(`${f.name}: exceeds ${MAX_MB}MB limit`)
      } else {
        valid.push(f)
      }
    }
    return { valid, errs }
  }

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList)
    const { valid, errs } = validate(incoming)
    setErrors(errs)
    if (!multiple) {
      setFiles(valid.slice(0, 1))
    } else {
      setFiles((prev) => {
        const merged = [...prev]
        for (const f of valid) {
          if (!merged.find((m) => m.name === f.name)) merged.push(f)
        }
        return merged.slice(0, 10)
      })
    }
  }, [multiple])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const removeFile = (name) => {
    setFiles((p) => p.filter((f) => f.name !== name))
  }

  const handleUpload = () => {
    if (files.length > 0) onFilesReady(files)
  }

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          dragging
            ? 'border-accent bg-accent-dim scale-[1.01]'
            : 'border-border hover:border-ghost hover:bg-surface',
          files.length > 0 && 'border-emerald/30 bg-emerald-dim'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-2">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            dragging ? 'bg-accent/20' : files.length > 0 ? 'bg-emerald-dim' : 'bg-muted'
          )}>
            <Upload className={clsx(
              'w-5 h-5',
              dragging ? 'text-accent' : files.length > 0 ? 'text-emerald' : 'text-ghost'
            )} />
          </div>
          <div>
            <p className="text-sm font-display font-medium text-text">
              {dragging ? 'Drop it here' : 'Drop resumes here'}
            </p>
            <p className="text-xs text-dim mt-0.5">
              PDF or DOCX · Max {MAX_MB}MB{multiple ? ' · Up to 10 files' : ''}
            </p>
          </div>
          <span className="text-xs font-mono text-ghost border border-border rounded-md px-2 py-1">
            Browse files
          </span>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-2">
              <span className="text-base">{fileIcon(f.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-text truncate">{f.name}</p>
                <p className="text-xs text-ghost">{fileSize(f.size)}</p>
              </div>
              {!uploading && (
                <button onClick={() => removeFile(f.name)} className="text-ghost hover:text-rose transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {uploading && <Spinner size="sm" />}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e) => (
            <div key={e} className="flex items-center gap-2 text-xs text-rose bg-rose-dim border border-rose/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-display font-semibold py-2.5 rounded-lg transition-all hover:-translate-y-0.5 shadow-lg shadow-accent/20"
        >
          <Upload className="w-4 h-4" />
          Upload {files.length} {files.length === 1 ? 'Resume' : 'Resumes'}
        </button>
      )}
    </div>
  )
}