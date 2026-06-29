import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

export interface RunStats {
  attempts: number
  success: number
  rate_limited: number
  errors: number
}

export type RunStatus = 'idle' | 'running' | 'finished' | 'stopped'

interface Props {
  logs: string[]
  stats: RunStats
  status: RunStatus
  maxRequests?: number
  runningName?: string
  onStop: () => void
  onClear: () => void
}

const statusBadge: Record<RunStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-muted text-muted-foreground' },
  running: { label: '● Running', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse' },
  finished: { label: 'Finished', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  stopped: { label: 'Stopped', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
}

export default function LiveMonitor({ logs, stats, status, maxRequests, runningName, onStop, onClear }: Props) {
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the newest log line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const successRate = stats.attempts > 0 ? Math.round((stats.success / stats.attempts) * 100) : 0
  const progress = maxRequests && maxRequests > 0 ? Math.min(100, Math.round((stats.attempts / maxRequests) * 100)) : 0
  const badge = statusBadge[status]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm">Live Monitor</CardTitle>
          <Badge className={badge.className}>{badge.label}</Badge>
          {runningName && status === 'running' && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{runningName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <Button variant="destructive" size="sm" onClick={onStop}>
              Stop
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClear} disabled={status === 'running'}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {/* Progress toward max requests */}
        {(status === 'running' || stats.attempts > 0) && maxRequests ? (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{stats.attempts} / {maxRequests}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm">
          <StatCard label="Attempts" value={stats.attempts} />
          <StatCard label="Success" value={stats.success} tone="text-green-600 dark:text-green-400"
            sub={stats.attempts > 0 ? `${successRate}%` : undefined} />
          <StatCard label="Rate Limited" value={stats.rate_limited} tone="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Errors" value={stats.errors} tone="text-red-600 dark:text-red-400" />
        </div>

        <div
          ref={logRef}
          className="log-container h-72 overflow-auto bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono scroll-smooth"
        >
          {logs.length === 0 ? (
            <div className="text-muted-foreground">Run an endpoint to see live output here.</div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className={`py-0.5 ${lineColor(line)}`}>{line}</div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ label, value, tone, sub }: { label: string; value: number; tone?: string; sub?: string }) {
  return (
    <div className={`bg-muted/50 p-3 rounded-lg border border-border ${tone || ''}`}>
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono font-semibold text-lg">{value}</span>
        {sub && <span className="text-[11px] opacity-70">{sub}</span>}
      </div>
    </div>
  )
}

function lineColor(line: string): string {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('failed')) return 'text-red-600 dark:text-red-400'
  if (l.includes('rate') || l.includes('429') || l.includes('too many')) return 'text-yellow-600 dark:text-yellow-400'
  if (l.includes('success') || l.includes('200') || l.includes('finished')) return 'text-green-600 dark:text-green-400'
  return ''
}
