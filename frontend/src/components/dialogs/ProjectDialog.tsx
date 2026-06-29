import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, baseUrl: string) => Promise<void> | void
}

export function ProjectDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState('')
  const [base, setBase] = useState('')

  useEffect(() => {
    if (open) { setName(''); setBase('') }
  }, [open])

  const submit = async () => {
    if (!name.trim()) return
    await onCreate(name.trim(), base.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My API" className="mt-1.5"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Base URL (optional)</Label>
            <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://api.example.com" className="font-mono mt-1.5" />
          </div>
          <p className="text-[10px] text-muted-foreground">You can add environments and variables after creating.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
