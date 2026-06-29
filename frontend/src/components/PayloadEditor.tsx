import { useState } from 'react'
import { KVEditor } from './KVEditor'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

interface Props {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
}

type Mode = 'fields' | 'json'

const PLACEHOLDER = `{
  "email": "{{random_email}}",
  "password": "secret",
  "device": { "id": "{{random_uuid}}" }
}`

/**
 * Payload editor with two views:
 *  - Fields: key/value (KVEditor) — quick for flat bodies
 *  - JSON: paste / edit raw JSON — handles nested objects & arrays
 * The two stay in sync; JSON is parsed live and only pushed up when valid.
 */
export function PayloadEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('fields')
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const toJson = () => {
    setJsonText(JSON.stringify(value ?? {}, null, 2))
    setError(null)
    setMode('json')
  }

  const onJsonChange = (text: string) => {
    setJsonText(text)
    if (!text.trim()) {
      setError(null)
      onChange({})
      return
    }
    try {
      const parsed = JSON.parse(text)
      onChange(parsed)
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON')
    }
  }

  const format = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch {
      /* leave as-is; error already shown */
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
          <button
            type="button"
            onClick={() => setMode('fields')}
            className={`px-2.5 py-0.5 text-xs rounded ${mode === 'fields' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={toJson}
            className={`px-2.5 py-0.5 text-xs rounded ${mode === 'json' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
          >
            JSON
          </button>
        </div>
        {mode === 'json' && (
          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={format} disabled={!!error}>
            Format
          </Button>
        )}
        {mode === 'json' && error && <span className="text-[11px] text-red-500 ml-auto truncate">{error}</span>}
      </div>

      {mode === 'fields' ? (
        <KVEditor data={value || {}} onChange={onChange} />
      ) : (
        <Textarea
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className={`font-mono text-xs min-h-[180px] ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
      )}
    </div>
  )
}
