import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Play, Copy, Trash2, Pencil } from 'lucide-react'
import { Endpoint } from '../types'
import { RunStatus } from './LiveMonitor'

const methodColor: Record<string, string> = {
  GET: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  POST: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  PUT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  DELETE: 'bg-red-500/15 text-red-600 dark:text-red-400',
  PATCH: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
}

interface Props {
  tests: Endpoint[]
  selectedId: string | null
  runningTestId: string | null
  runStatus: RunStatus
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string, name: string) => void
  onRunRow: (id: string) => void
}

export function EndpointTable({
  tests, selectedId, runningTestId, runStatus, onSelect, onNew, onEdit, onDuplicate, onDelete, onRunRow,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
        <CardTitle className="text-sm">Endpoints <span className="text-muted-foreground font-normal">({tests.length})</span></CardTitle>
        <Button size="sm" className="h-7" onClick={onNew}>New Endpoint</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="[&_td]:py-2 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-4"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20">Method</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right pr-4 w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No endpoints. Click "New Endpoint" to start.
                </TableCell>
              </TableRow>
            )}
            {tests.map((test) => {
              const selected = test.id === selectedId
              const running = runningTestId === test.id && runStatus === 'running'
              return (
                <TableRow
                  key={test.id}
                  onClick={() => onSelect(test.id)}
                  className={`cursor-pointer ${selected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                >
                  <TableCell className="pl-4">
                    <span
                      className={`block h-3.5 w-3.5 rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {test.name}
                      {running && <span className="text-[10px] text-emerald-500 animate-pulse">running</span>}
                      {test.run_config && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                          override
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`font-mono text-xs ${methodColor[test.method] || 'bg-secondary text-secondary-foreground'}`}>
                      {test.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[260px]">{test.url}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1">
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white" onClick={() => onRunRow(test.id)}>
                        <Play className="h-3.5 w-3.5" /> Run
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => onEdit(test.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicate" onClick={() => onDuplicate(test.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" title="Delete" onClick={() => onDelete(test.id, test.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
