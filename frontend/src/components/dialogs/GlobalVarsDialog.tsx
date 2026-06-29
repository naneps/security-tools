import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { KVEditor } from '../KVEditor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: Record<string, string>
  onSave: (vars: Record<string, string>) => Promise<void> | void
}

export function GlobalVarsDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [vars, setVars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) setVars({ ...initial })
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            Global Variables <span className="text-sm text-muted-foreground font-normal">(every project &amp; environment)</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-3">Merged into every environment's variables. Use for shared tokens, API keys, etc.</p>
          <KVEditor data={vars} onChange={setVars} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(vars)}>Save Global</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
