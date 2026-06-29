import { Button } from './ui/button'
import { Input } from './ui/input'
import { Paperclip, X, FileText } from 'lucide-react'
import { toast } from './ui/toast'

interface Props {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
}

interface FileVal {
  __file__: true
  name: string
  type: string
  data: string // base64 (no data: prefix)
}

const MAX_BYTES = 2 * 1024 * 1024 // 2MB

function isFile(v: any): v is FileVal {
  return v && typeof v === 'object' && v.__file__ === true
}

function prettySize(b64: string): string {
  const bytes = Math.floor((b64.length * 3) / 4)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function MultipartEditor({ value, onChange }: Props) {
  const entries = Object.entries(value || {})
  const commit = (next: [string, any][]) => onChange(Object.fromEntries(next))

  const setKey = (i: number, key: string) => {
    const next = [...entries]; next[i] = [key, entries[i][1]]; commit(next)
  }
  const setText = (i: number, text: string) => {
    const next = [...entries]; next[i] = [entries[i][0], text]; commit(next)
  }
  const setVal = (i: number, val: any) => {
    const next = [...entries]; next[i] = [entries[i][0], val]; commit(next)
  }
  const remove = (i: number) => commit(entries.filter((_, idx) => idx !== i))
  const add = () => commit([...entries, ['', '']])

  const pickFile = (i: number, file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(`"${file.name}" is too large (max 2 MB for embedded files)`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result)
      const base64 = res.includes(',') ? res.split(',')[1] : res
      setVal(i, { __file__: true, name: file.name, type: file.type || 'application/octet-stream', data: base64 })
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No fields yet. Add a text field or attach a file.</p>
      )}
      {entries.map(([key, val], i) => {
        const file = isFile(val)
        return (
          <div key={i} className="flex gap-2 items-center">
            <Input value={key} onChange={(e) => setKey(i, e.target.value)} placeholder="Field name" className="h-8 w-1/3" />
            <div className="flex-1">
              {file ? (
                <div className="flex items-center gap-2 h-8 px-2 rounded-md border border-border bg-muted/40 text-xs">
                  <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate flex-1">{(val as FileVal).name}</span>
                  <span className="text-muted-foreground shrink-0">{prettySize((val as FileVal).data)}</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground shrink-0" title="Remove file" onClick={() => setVal(i, '')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Input value={String(val ?? '')} onChange={(e) => setText(i, e.target.value)} placeholder="Text value (or attach a file →)" className="h-8 font-mono flex-1" />
                  <label className="h-8 px-2 inline-flex items-center rounded-md border border-border bg-background hover:bg-accent cursor-pointer" title="Attach file">
                    <Paperclip className="h-3.5 w-3.5" />
                    <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(i, f); e.currentTarget.value = '' }} />
                  </label>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => remove(i)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
      <Button variant="outline" size="sm" onClick={add} className="mt-1">+ Add field</Button>
    </div>
  )
}
