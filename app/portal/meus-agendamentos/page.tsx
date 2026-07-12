"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Building2, User, Scissors, Loader2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePortalAuth } from "../layout"

interface Agendamento {
  id: string
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valorTotal: number
  observacoes: string | null
  estabelecimento: { nome: string; telefone: string | null }
  profissional: { nome: string; cor: string | null }
  servicos: { servico: { nome: string } }[]
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: "bg-orange-50", text: "text-orange-700", label: "Pendente" },
  CONFIRMADO: { bg: "bg-sky-50", text: "text-sky-700", label: "Confirmado" },
  ATENDENDO: { bg: "bg-amber-50", text: "text-amber-700", label: "Em atendimento" },
  CONCLUIDO: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Concluído" },
  CANCELADO: { bg: "bg-red-50", text: "text-red-700", label: "Cancelado" },
  NO_SHOW: { bg: "bg-surface-border-light", text: "text-base-secondary", label: "Não compareceu" },
}

export default function MeusAgendamentosPage() {
  const { user, loading: authLoading } = usePortalAuth()
  const router = useRouter()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace("/portal/login")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    fetch("/api/portal/agendamentos")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAgendamentos(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-accent-500" /></div>
  }

  const now = new Date()
  const proximos = agendamentos.filter((a) => new Date(a.dataHoraInicio) >= now && a.status !== "CANCELADO" && a.status !== "NO_SHOW" && a.status !== "CONCLUIDO")
  const passados = agendamentos.filter((a) => !proximos.includes(a))

  const AgendamentoCard = ({ a }: { a: Agendamento }) => {
    const inicio = new Date(a.dataHoraInicio)
    const fim = new Date(a.dataHoraFim)
    const st = statusConfig[a.status] ?? statusConfig.PENDENTE
    const isPast = new Date(a.dataHoraInicio) < now

    return (
      <div className={`glass-card rounded-2xl p-4 transition-all ${isPast ? "opacity-60" : "hover:shadow-sm"}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: a.profissional.cor ?? "#105a73" }}>
              {a.profissional.nome[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-base-primary">{a.profissional.nome}</p>
              <p className="text-[11px] text-base-muted">{a.estabelecimento.nome}</p>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text} shrink-0`}>{st.label}</span>
        </div>

        <div className="space-y-1.5 text-[12px] text-base-secondary">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-base-muted" />
            <span className="capitalize">{inicio.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-base-muted" />
            <span>{inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Scissors size={12} className="text-base-muted" />
            <span className="truncate">{a.servicos.map((s) => s.servico.nome).join(", ")}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border-light">
          <span className="text-xs text-base-muted">Total</span>
          <span className="text-sm font-bold text-accent-600">R$ {Number(a.valorTotal).toFixed(0)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Meus agendamentos</h1>
          <p className="text-xs text-base-muted mt-0.5">Olá, {user.nome.split(" ")[0]}!</p>
        </div>
        <Link href="/portal"
          className="text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-3 sm:px-4 py-2 rounded-2xl transition-colors flex items-center gap-1.5 shrink-0">
          <Calendar size={14} /> <span className="hidden sm:inline">Novo agendamento</span><span className="sm:hidden">Agendar</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 glass-card rounded-2xl animate-pulse" />)}</div>
      ) : agendamentos.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={40} className="text-base-muted/60 mx-auto mb-3" />
          <p className="text-sm text-base-secondary mb-1">Nenhum agendamento ainda</p>
          <p className="text-xs text-base-muted mb-4">Faça seu primeiro agendamento agora!</p>
          <Link href="/portal"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700">
            Agendar agora <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {proximos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-accent-700 mb-3">Próximos</h2>
              <div className="space-y-3">
                {proximos.map((a) => <AgendamentoCard key={a.id} a={a} />)}
              </div>
            </div>
          )}

          {passados.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-base-secondary mb-3">Histórico</h2>
              <div className="space-y-3">
                {passados.map((a) => <AgendamentoCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
