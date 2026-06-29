import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { KVEditor } from '../KVEditor'
import { Project, Environment } from '../../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onSave: (environments: Environment[]) => Promise<void> | void
}

export function EnvironmentsDialog({ open, onOpenChange, project, onSave }: Props) {
  const [envs, setEnvs] = useState<Environment[]>([])
  const [newName, setNewName] = useState('Local')
  const [newBase, setNewBase] = useState('')

  useEffect(() => {
    if (open && project) {
      setEnvs(JSON.parse(JSON.stringify(project.environments || [])))
      setNewName('Local')
      setNewBase('')
    }
  }, [open, project])

  const patch = (idx: number, p: Partial<Environment>) =>
    setEnvs((prev) => prev.map((e, i) => (i === idx ? { ...e, ...p } : e)))

  const addEnv = () => {
    if (!newName.trim()) return
    setEnvs((prev) => [...prev, { id: 'env-' + Date.now(), name: newName.trim(), base_url: newBase.trim(), variables: {} }])
    setNewName('Local')
    setNewBase('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Environments — {project?.name} <span className="text-sm text-muted-foreground font-normal">(local to this project)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
            {envs.length === 0 && (
              <p className="text-sm text-muted-foreground">No environments yet. Add one (Local, Staging, Prod). Each has its own base URL + variables.</p>
            )}
            {envs.map((env, idx) => (
              <div key={env.id || idx} className="border rounded-lg p-3 bg-card space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={env.name || ''} onChange={(e) => patch(idx, { name: e.target.value })} className="h-8 mt-1" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Base URL</Label>
                    <Input value={env.base_url || ''} onChange={(e) => patch(idx, { base_url: e.target.value })} className="h-8 font-mono mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Variables (tokens, cookies… use {'{{key}}'} in endpoints)</Label>
                  <KVEditor data={env.variables || {}} onChange={(vars) => patch(idx, { variables: vars })} />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="destructive" className="h-7 text-xs"
                    onClick={() => setEnvs((prev) => prev.filter((_, i) => i !== idx))}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="text-xs font-semibold mb-2">Add environment</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input placeholder="Local / Staging / Prod" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Base URL</Label>
                <Input placeholder="https://..." value={newBase} onChange={(e) => setNewBase(e.target.value)} className="h-8 font-mono text-sm mt-1" />
              </div>
            </div>
            <Button size="sm" className="mt-3 h-7 text-xs" disabled={!newName.trim()} onClick={addEnv}>Add</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(envs)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
