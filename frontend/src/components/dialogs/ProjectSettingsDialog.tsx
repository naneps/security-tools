import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Trash2 } from 'lucide-react'
import { Project } from '../../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onRename: (name: string) => Promise<void> | void
  onDelete: () => Promise<void> | void
}

export function ProjectSettingsDialog({ open, onOpenChange, project, onRename, onDelete }: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName(project?.name || '')
  }, [open, project])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5"
              onKeyDown={(e) => { if (e.key === 'Enter') onRename(name.trim()) }} />
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <div className="text-xs font-medium text-red-500 mb-1">Danger zone</div>
            <p className="text-[11px] text-muted-foreground mb-2">Deleting a project removes all its environments and endpoints.</p>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete()}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Project
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onRename(name.trim())} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
