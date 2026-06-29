import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toasts: Toast[] = []
let listeners: Array<() => void> = []
let counter = 0

function emit() {
  listeners.forEach((l) => l())
}

/** Show a transient toast notification. Auto-dismisses after ~3.5s. */
export function toast(message: string, type: ToastType = "info") {
  const id = ++counter
  toasts = [...toasts, { id, message, type }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 3500)
}

toast.success = (m: string) => toast(m, "success")
toast.error = (m: string) => toast(m, "error")
toast.info = (m: string) => toast(m, "info")

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
  info: "border-border bg-card text-foreground",
}

export function Toaster() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.push(l)
    return () => {
      listeners = listeners.filter((x) => x !== l)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur animate-in slide-in-from-bottom-2 fade-in",
            styles[t.type]
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
