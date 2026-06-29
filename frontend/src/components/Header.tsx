import { Button } from './ui/button'
import { ThemeToggle } from './ThemeToggle'
import { Settings } from 'lucide-react'
import { Project } from '../types'

interface Props {
  currentProject?: Project
  onProjectSettings: () => void
}

export function Header({ currentProject, onProjectSettings }: Props) {
  return (
    <div className="border-b border-border px-6 py-3 flex items-center justify-between bg-background">
      <div>
        <h2 className="font-semibold text-lg leading-tight">Dashboard</h2>
        <p className="text-xs text-muted-foreground">Load &amp; rate-limit testing</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 font-medium"
          disabled={!currentProject}
          onClick={onProjectSettings}
          title="Project settings"
        >
          {currentProject?.name || 'No Project'}
          <Settings className="h-3.5 w-3.5 opacity-60" />
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}
