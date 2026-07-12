"use client"

import { useState, useEffect } from "react"
import { Bot, AlertTriangle, Zap, TrendingUp, Check, X, Eye, EyeOff, RefreshCw, Sparkles } from "lucide-react"
import { useToast } from "@/components/ui/toast"

interface Sugestao {
  id: string; tipo: string; prioridade: string; titulo: string
  descricao: string; acaoSugerida: string; status: string; criadoEm: string
  executadoEm?: string | null
}

const tipoIcone: Record<string, typeof AlertTriangle> = { RETENCAO: AlertTriangle, OPORTUNIDADE: Zap, INSIGHT: TrendingUp, ALERTA: AlertTriangle }
const tipoCor: Record<string, string> = { RETENCAO: "text-red-500", OPORTUNIDADE: "text-amber-500", INSIGHT: "text-accent-500", ALERTA: "text-red-500" }
const tipoBorda: Record<string, string> = { RETENCAO: "border-l-red-400", OPORTUNIDADE: "border-l-amber-400", INSIGHT: "border-l-accent-400", ALERTA: "border-l-red-400" }
const tipoBg: Record<string, string> = { RETENCAO: "bg-red-50", OPORTUNIDADE: "bg-amber-50", INSIGHT: "bg-accent-50", ALERTA: "bg-red-50" }
const tipoLabel: Record<string, string> = { RETENCAO: "Retenção", OPORTUNIDADE: "Oportunidade", INSIGHT: "Insight", ALERTA: "Alerta" }
const prioridadeBadge: Record<string, { bg: string; text: string }> = {
  ALTA: { bg: "bg-red-50", text: "text-red-600" },
  MEDIA: { bg: "bg-amber-50", text: "text-amber-600" },
  BAIXA: { bg: "bg-surface-base", text: "text-base-secondary" },
}

export default function AssistenteIAPage() {
  const toast = useToast()
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [pendentes, setPendentes] = useState(0)
  const [executadas, setExecutadas] = useState(0)
  const [ignoradas, setIgnoradas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    fetch("/api/ia")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => {
        setSugestoes(d.sugestoes)
        setPendentes(d.pendentes)
        setExecutadas(d.executadas)
        setIgnoradas(d.sugestoes.filter((s: Sugestao) => s.status === "IGNORADA").length)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const markDone = async (id: string) => {
    setActionLoading(id)
    try {
      const r = await fetch("/api/ia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "EXECUTADA" }),
      })
      if (!r.ok) throw new Error()
      toast.success("Sugestão marcada como executada")
      load()
    } catch {
      toast.error("Erro ao atualizar sugestão")
    } finally { setActionLoading(null) }
  }

  const markIgnored = async (id: string) => {
    setActionLoading(id)
    try {
      const r = await fetch("/api/ia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "IGNORADA" }),
      })
      if (!r.ok) throw new Error()
      toast.info("Sugestão ignorada")
      load()
    } catch {
      toast.error("Erro ao atualizar sugestão")
    } finally { setActionLoading(null) }
  }

  const reopen = async (id: string) => {
    setActionLoading(id)
    try {
      const r = await fetch("/api/ia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "PENDENTE" }),
      })
      if (!r.ok) throw new Error()
      toast.info("Sugestão reaberta")
      load()
    } catch {
      toast.error("Erro ao reabrir sugestão")
    } finally { setActionLoading(null) }
  }

  const filtered = sugestoes.filter((s) => {
    if (!showResolved && (s.status === "EXECUTADA" || s.status === "IGNORADA")) return false
    if (filter === "all") return true
    if (filter === "PENDENTE") return s.status === "PENDENTE"
    return s.tipo === filter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Assistente IA</h1>
            <p className="text-xs text-base-muted">Sugestões inteligentes baseadas nos seus dados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs">
            <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-50 text-amber-700 rounded-full font-medium">{loading ? "..." : pendentes} <span className="hidden sm:inline">pendentes</span><span className="sm:hidden">pend.</span></span>
            <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">{loading ? "..." : executadas} <span className="hidden sm:inline">executadas</span><span className="sm:hidden">exec.</span></span>
            <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-surface-base text-base-secondary rounded-full font-medium">{loading ? "..." : ignoradas} <span className="hidden sm:inline">ignoradas</span><span className="sm:hidden">ign.</span></span>
          </div>
          <button onClick={load} disabled={loading} className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted hover:text-base-secondary transition-colors" title="Atualizar">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "Todas" }, { key: "PENDENTE", label: "Pendentes" },
          { key: "RETENCAO", label: "Retenção" }, { key: "OPORTUNIDADE", label: "Oportunidades" }, { key: "INSIGHT", label: "Insights" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${filter === f.key ? "bg-accent-50 text-accent-700 border-accent-100" : "text-base-muted border-surface-border hover:bg-surface-base"}`}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={() => setShowResolved(!showResolved)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${showResolved ? "bg-surface-border-light text-base-secondary border-surface-border" : "text-base-muted border-surface-border hover:bg-surface-base"}`}>
            {showResolved ? <EyeOff size={12} /> : <Eye size={12} />}
            {showResolved ? "Ocultar resolvidas" : "Mostrar resolvidas"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card rounded-2xl p-5 h-28 animate-pulse" />)}</div>}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-base-secondary mb-3">Erro ao carregar sugestões</p>
          <button onClick={load} className="text-sm text-accent-600 hover:text-accent-700 font-medium">Tentar novamente</button>
        </div>
      )}

      {/* Suggestions */}
      {!loading && !error && (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scroll-fade-y -mx-1 px-1">
          {filtered.map((item) => {
            const Icon = tipoIcone[item.tipo] ?? TrendingUp
            const isExecutada = item.status === "EXECUTADA"
            const isIgnorada = item.status === "IGNORADA"
            const isPendente = item.status === "PENDENTE"
            const isActioning = actionLoading === item.id
            const prio = prioridadeBadge[item.prioridade] ?? prioridadeBadge.MEDIA

            return (
              <div key={item.id} className={`glass-card rounded-2xl border-l-4 ${tipoBorda[item.tipo] ?? "border-l-accent-400"} p-3 sm:p-5 transition-all ${isExecutada || isIgnorada ? "opacity-50" : "hover:shadow-sm"}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-9 h-9 rounded-lg ${tipoBg[item.tipo] ?? "bg-accent-50"} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={16} className={tipoCor[item.tipo] ?? "text-accent-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${isExecutada || isIgnorada ? "text-base-secondary line-through" : "text-base-primary"}`}>{item.titulo}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tipoBg[item.tipo]} ${tipoCor[item.tipo]}`}>{tipoLabel[item.tipo] ?? item.tipo}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${prio.bg} ${prio.text}`}>{item.prioridade.charAt(0) + item.prioridade.slice(1).toLowerCase()}</span>
                      {isExecutada && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-0.5"><Check size={10} /> Executada</span>}
                      {isIgnorada && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-border-light text-base-secondary flex items-center gap-0.5"><X size={10} /> Ignorada</span>}
                    </div>
                    <p className="text-xs text-base-secondary mt-1.5 leading-relaxed">{item.descricao}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        {isPendente && (
                          <>
                            <button onClick={() => markDone(item.id)} disabled={isActioning}
                              className="text-xs font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                              {isActioning ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              {item.acaoSugerida}
                            </button>
                            <button onClick={() => markIgnored(item.id)} disabled={isActioning}
                              className="text-xs text-base-muted hover:text-base-secondary disabled:opacity-50 px-2 py-1.5 transition-colors">
                              Ignorar
                            </button>
                          </>
                        )}
                        {(isExecutada || isIgnorada) && (
                          <button onClick={() => reopen(item.id)} disabled={isActioning}
                            className="text-xs text-base-muted hover:text-accent-600 disabled:opacity-50 px-2 py-1.5 transition-colors flex items-center gap-1">
                            <RefreshCw size={11} /> Reabrir
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {isExecutada && item.executadoEm && (
                          <span className="text-[10px] text-emerald-500">Executada em {new Date(item.executadoEm).toLocaleDateString("pt-BR")}</span>
                        )}
                        <span className="text-[10px] text-base-muted">{new Date(item.criadoEm).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Bot size={32} className="text-base-muted mx-auto mb-3" />
              <p className="text-sm text-base-muted">
                {filter === "PENDENTE" ? "Nenhuma sugestão pendente" : filter !== "all" ? "Nenhuma sugestão deste tipo" : sugestoes.length > 0 ? "Todas as sugestões foram resolvidas" : "Nenhuma sugestão disponível no momento"}
              </p>
              {sugestoes.length > 0 && !showResolved && filter === "all" && (
                <button onClick={() => setShowResolved(true)} className="text-sm text-accent-600 hover:text-accent-700 font-medium mt-2">Ver sugestões resolvidas</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
