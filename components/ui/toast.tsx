"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const noop = () => {}
const ToastContext = createContext<ToastContextValue>({ toast: noop, success: noop, error: noop, warning: noop, info: noop })

export function useToast() {
  return useContext(ToastContext)
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
}

const iconStyles = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-sky-500",
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [exiting, setExiting] = useState<Set<number>>(new Set())

  const dismiss = useCallback((id: number) => {
    setExiting((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setExiting((prev) => { const next = new Set(prev); next.delete(id); return next })
    }, 300)
  }, [])

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((msg: string) => toast(msg, "success"), [toast])
  const error = useCallback((msg: string) => toast(msg, "error"), [toast])
  const warning = useCallback((msg: string) => toast(msg, "warning"), [toast])
  const info = useCallback((msg: string) => toast(msg, "info"), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          const isExiting = exiting.has(t.id)
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm min-w-[280px] max-w-[420px] transition-all duration-300 ${styles[t.type]} ${isExiting ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0 animate-slide-in"}`}
            >
              <Icon size={18} className={iconStyles[t.type]} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="p-0.5 rounded hover:bg-black/5 shrink-0">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
