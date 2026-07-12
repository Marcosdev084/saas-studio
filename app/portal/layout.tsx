"use client"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Scissors, LogOut, Calendar, User } from "lucide-react"

interface PortalUser { contaClienteId: string; nome: string; email: string }

const PortalAuthContext = createContext<{
  user: PortalUser | null
  loading: boolean
  refresh: () => void
  logout: () => void
}>({ user: null, loading: true, refresh: () => {}, logout: () => {} })

export function usePortalAuth() {
  return useContext(PortalAuthContext)
}

function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = () => {
    fetch("/api/portal/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUser({ contaClienteId: d.contaClienteId, nome: d.nome, email: d.email })
        else setUser(null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const logout = async () => {
    await fetch("/api/portal/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    })
    setUser(null)
    router.push("/portal/login")
  }

  return (
    <PortalAuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </PortalAuthContext.Provider>
  )
}

function PortalHeader() {
  const { user, logout } = usePortalAuth()
  const pathname = usePathname()

  return (
    <header className="bg-surface-card/70 backdrop-blur-2xl border-b border-surface-border/40 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/portal" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center">
            <Scissors size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold text-base-primary">SaaS Studio</span>
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            <Link href="/portal"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors ${pathname === "/portal" ? "bg-accent-50 text-accent-700" : "text-base-secondary hover:bg-surface-base"}`}>
              <Calendar size={14} /> Agendar
            </Link>
            <Link href="/portal/meus-agendamentos"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors ${pathname === "/portal/meus-agendamentos" ? "bg-accent-50 text-accent-700" : "text-base-secondary hover:bg-surface-base"}`}>
              <User size={14} /> <span className="hidden sm:inline">Meus agendamentos</span><span className="sm:hidden">Agenda</span>
            </Link>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-base-muted hover:bg-surface-base hover:text-red-500 transition-colors ml-1">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthProvider>
      <div className="min-h-screen app-ambient">
        <PortalHeader />
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </PortalAuthProvider>
  )
}
