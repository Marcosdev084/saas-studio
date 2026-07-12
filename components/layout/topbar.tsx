"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@auth0/nextjs-auth0/client"
import Image from "next/image"
import { Search, Bell, Menu, LogOut, X, Calendar, User, Scissors, Settings, ChevronDown } from "lucide-react"

interface SearchResult {
  type: "cliente" | "servico"
  id: string
  nome: string
  extra?: string
}

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  descricao: string
  lida: boolean
  criadoEm: string
}

export function Topbar({ onMobileOpen }: { onMobileOpen: () => void }) {
  const { user } = useUser()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [notifsLoaded, setNotifsLoaded] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [mobileSearch, setMobileSearch] = useState(false)

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowResults(false); return }
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setShowResults(true)
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const loadNotifs = async () => {
    try {
      const res = await fetch("/api/notificacoes")
      const data = await res.json()
      if (Array.isArray(data)) setNotifs(data)
      setNotifsLoaded(true)
    } catch { /* empty */ }
  }

  const toggleNotifs = () => {
    if (!showNotifs && !notifsLoaded) loadNotifs()
    setShowNotifs(!showNotifs)
  }

  const markAsRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
    try { await fetch(`/api/notificacoes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }) } catch { /* empty */ }
  }

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })))
    try { await fetch(`/api/notificacoes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }) } catch { /* empty */ }
  }

  const unreadCount = notifs.filter((n) => !n.lida).length

  const goToResult = (r: SearchResult) => {
    setShowResults(false)
    setQuery("")
    setMobileSearch(false)
    if (r.type === "cliente") router.push(`/clientes/${r.id}`)
    else if (r.type === "servico") router.push("/configuracoes")
  }

  const tipoIcon: Record<string, typeof Calendar> = { agendamento: Calendar, cliente: User, servico: Scissors }

  return (
    <>
      {/* Controles flutuantes — sem barra visível */}
      <div className="flex items-center justify-between px-5 md:px-8 pt-5 md:pt-6 pb-2 shrink-0">
        {/* Esquerda: hambúrguer mobile */}
        <button onClick={onMobileOpen} className="md:hidden w-10 h-10 rounded-full glass-card flex items-center justify-center text-base-muted">
          <Menu size={18} />
        </button>
        <div className="hidden md:block" />

        {/* Direita: busca + notificações + perfil */}
        <div className="flex items-center gap-3">
          {/* Busca */}
          <div ref={searchRef} className="relative hidden sm:block">
            <div className="glass-card flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 w-60 focus-within:w-80 focus-within:shadow-card-hover focus-within:border-accent-400/25 transition-all duration-300 ease-out-expo">
              <Search size={15} className="text-base-muted/60 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm text-base-primary placeholder:text-base-muted/40 focus:outline-none w-full"
              />
            </div>
            {showResults && (
              <div className="absolute top-full right-0 left-0 mt-2 glass-solid rounded-2xl shadow-elevated z-50 overflow-hidden max-h-80 overflow-y-auto scroll-fade-y animate-fade-in">
                {searching && <div className="p-4 text-xs text-base-muted text-center">Buscando...</div>}
                {!searching && results.length === 0 && query.length >= 2 && (
                  <div className="p-5 text-xs text-base-muted text-center">Nenhum resultado para &quot;{query}&quot;</div>
                )}
                {results.map((r) => {
                  const Icon = tipoIcon[r.type] ?? Search
                  return (
                    <button key={`${r.type}-${r.id}`} onClick={() => goToResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent-800/[0.03] text-left border-b border-surface-base last:border-0 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-accent-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-base-primary truncate">{r.nome}</p>
                        {r.extra && <p className="text-[11px] text-base-muted truncate">{r.extra}</p>}
                      </div>
                      <span className="text-[10px] text-base-muted ml-auto shrink-0 capitalize bg-surface-base px-2 py-0.5 rounded-md">{r.type}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mobile search trigger */}
          <button onClick={() => setMobileSearch(true)} className="sm:hidden w-10 h-10 rounded-full glass-card flex items-center justify-center text-base-muted">
            <Search size={16} />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button onClick={toggleNotifs} className="relative w-10 h-10 rounded-full glass-card flex items-center justify-center text-base-muted hover:text-accent-700">
              <Bell size={17} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-400 text-[8px] font-bold text-white rounded-full flex items-center justify-center ring-2 ring-surface-card/80">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-solid rounded-2xl shadow-elevated z-50 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-accent-800/[0.04]">
                  <h3 className="text-sm font-bold text-base-primary">Notificações</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-accent-400 hover:text-accent-600 font-semibold transition-colors">Marcar todas</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scroll-fade-y">
                  {!notifsLoaded && <div className="p-5 text-xs text-base-muted text-center">Carregando...</div>}
                  {notifsLoaded && notifs.length === 0 && (
                    <div className="p-8 text-center">
                      <Bell size={24} className="text-surface-border mx-auto mb-2" />
                      <p className="text-xs text-base-muted">Nenhuma notificação</p>
                    </div>
                  )}
                  {notifs.map((n) => {
                    const Icon = tipoIcon[n.tipo] ?? Bell
                    const timeAgo = getTimeAgo(n.criadoEm)
                    return (
                      <button key={n.id} onClick={() => markAsRead(n.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent-800/[0.03] text-left border-b border-accent-800/[0.04] last:border-0 transition-colors ${!n.lida ? "bg-accent-50/20" : ""}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${!n.lida ? "bg-accent-50" : "bg-surface-base"}`}>
                          <Icon size={14} className={!n.lida ? "text-accent-600" : "text-base-muted"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!n.lida ? "font-semibold text-base-primary" : "text-base-secondary"}`}>{n.titulo}</p>
                          <p className="text-[11px] text-base-muted mt-0.5 line-clamp-2">{n.descricao}</p>
                          <p className="text-[10px] text-base-muted/60 mt-1">{timeAgo}</p>
                        </div>
                        {!n.lida && <div className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0 mt-2" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button onClick={() => setShowProfile(!showProfile)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-surface-card/70 hover:border-accent-400/50 shadow-card hover:shadow-card-hover">
              {user?.picture ? (
                <Image src={user.picture} alt="" width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{initials}</span>
                </div>
              )}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 glass-solid rounded-2xl shadow-elevated z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-accent-800/[0.04]">
                  <p className="text-sm font-semibold text-base-primary truncate">{user?.name}</p>
                  <p className="text-[11px] text-base-muted truncate">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { setShowProfile(false); router.push("/configuracoes") }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-base-secondary hover:bg-accent-800/[0.04] transition-colors"
                  >
                    <Settings size={15} /> Configurações
                  </button>
                  <a href="/api/auth/logout" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={15} /> Sair
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearch && (
        <div className="fixed inset-0 bg-surface-card/95 backdrop-blur-xl z-50 p-4 sm:hidden animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-muted/60" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                placeholder="Buscar clientes, serviços..."
                className="w-full pl-9 pr-4 py-2.5 bg-accent-800/[0.04] rounded-xl text-sm text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-400/20" />
            </div>
            <button onClick={() => { setMobileSearch(false); setQuery(""); setResults([]) }} className="w-9 h-9 rounded-xl hover:bg-accent-800/5 flex items-center justify-center">
              <X size={18} className="text-base-muted" />
            </button>
          </div>
          <div className="space-y-1">
            {searching && <p className="text-xs text-base-muted text-center py-6">Buscando...</p>}
            {!searching && results.length === 0 && query.length >= 2 && <p className="text-xs text-base-muted text-center py-6">Nenhum resultado</p>}
            {results.map((r) => {
              const Icon = tipoIcon[r.type] ?? Search
              return (
                <button key={`${r.type}-${r.id}`} onClick={() => goToResult(r)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent-800/[0.03] rounded-xl text-left">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-accent-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-base-primary truncate">{r.nome}</p>
                    {r.extra && <p className="text-[11px] text-base-muted truncate">{r.extra}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}
