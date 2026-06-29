import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { KVEditor } from '../KVEditor'
import { Plus, Trash2 } from 'lucide-react'
import { Project, Environment } from '../../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  activeEnvId?: string
  onSave: (environments: Environment[]) => Promise<void> | void
}

export function EnvironmentsDialog({ open, onOpenChange, project, activeEnvId, onSave }: Props) {
  const [envs, setEnvs] = useState<Environment[]>([])
  const [sel, setSel] = useState(0)

  useEffect(() => {
    if (open && project) {
      const copy: Environment[] = JSON.parse(JSON.stringify(project.environments || []))
      setEnvs(copy)
      // start on the active env if present
      const idx = copy.findIndex((e) => e.id === activeEnvId)
      setSel(idx >= 0 ? idx : 0)
    }
  }, [open, project, activeEnvId])

  const current = envs[sel]

  const patch = (p: Partial<Environment>) =>
    setEnvs((prev) => prev.map((e, i) => (i === sel ? { ...e, ...p } : e)))

  const addEnv = () => {
    const env: Environment = { id: 'env-' + Date.now(), name: 'New Environment', base_url: '', variables: {} }
    setEnvs((prev) => {
      const next = [...prev, env]
      setSel(next.length - 1)
      return next
    })
  }

  const deleteEnv = (idx: number) => {
    setEnvs((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      setSel((s) => Math.max(0, Math.min(s, next.length - 1)))
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Environments — {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 py-1 min-h-[320px]">
          {/* Master: environment list */}
          <div className="w-44 shrink-0 flex flex-col border-r border-border pr-3">
            <div className="flex-1 overflow-auto space-y-0.5">
              {envs.length === 0 && (
                <p className="text-xs text-muted-foreground px-1 py-2">No environments yet.</p>
              )}
              {envs.map((env, idx) => (
                <button
                  key={env.id || idx}
                  onClick={() => setSel(idx)}
                  className={`w-full text-left px-2.5 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    idx === sel ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <span className="truncate flex-1">{env.name || 'Untitled'}</span>
                  {env.id === activeEnvId && (
                    <span className={`text-[9px] px-1 rounded ${idx === sel ? 'bg-primary-foreground/20' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                      active
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5" onClick={addEnv}>
              <Plus className="h-3.5 w-3.5" /> Add environment
            </Button>
          </div>

          {/* Detail: selected environment */}
          <div className="flex-1 min-w-0">
            {!current ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Add an environment to get started.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={current.name || ''} onChange={(e) => patch({ name: e.target.value })} className="h-8 mt-1" />
                  </div>
                  {current.id === activeEnvId && (
                    <Badge className="mt-5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">active</Badge>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Base URL</Label>
                  <Input value={current.base_url || ''} onChange={(e) => patch({ base_url: e.target.value })} className="h-8 mt-1 font-mono" placeholder="https://api.example.com" />
                </div>

                <div>
                  <Label className="text-xs">Variables <span className="text-muted-foreground font-normal">— tokens, cookies… use {'{{key}}'} in endpoints</span></Label>
                  <div className="mt-1">
                    <KVEditor data={current.variables || {}} onChange={(vars) => patch({ variables: vars })} />
                  </div>
                </div>

                <div className="pt-1">
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5" onClick={() => deleteEnv(sel)}>
                    <Trash2 className="h-3 w-3" /> Delete environment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="mr-auto text-[11px] text-muted-foreground self-center">
            Switch the active environment from the sidebar dropdown.
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(envs)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
