"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Phone, Mail, Calendar, Clock, MessageCircle,
  AlertTriangle, UserCheck, Scissors, Star, Heart, X, Trash2, Pencil, Check
} from "lucide-react"
import { useToast } from "@/components/ui/toast"

interface Preferencia {
  id: string
  descricao: string
}

interface AgendamentoServico {
  servico: { nome: string }
  preco: number
  duracaoMinutos: number
}

interface Agendamento {
  id: string
  dataHoraInicio: string
  valorTotal: number
  status: string
  observacoes: string | null
  profissional: { nome: string }
  servicos: AgendamentoServico[]
}

interface Fidelidade {
  pontos: number
  nivel: string
}

interface ProximoNivel {
  nivel: string
  pontosMinimos: number
  descricaoBeneficio: string
}

interface ClienteData {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  criadoEm: string
  totalVisitas: number
  ticketMedio: number
  totalGasto: number
  ultimaVisita: string | null
  diasDesdeUltimaVisita: number | null
  riscoChurn: string
  scoreChurn: number
  preferencias: Preferencia[]
  fidelidade: Fidelidade | null
  agendamentos: Agendamento[]
  favProfissional: string
  proximoNivel: ProximoNivel | null
}

const churnColors: Record<string, { bg: string; text: string; border: string }> = {
  CRITICO: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  ALTO: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  MEDIO: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  BAIXO: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
}

const nivelColors: Record<string, string> = {
  PRATA: "from-surface-border to-base-muted",
  OURO: "from-amber-400 to-yellow-500",
  PLATINA: "from-violet-400 to-purple-500",
}

export default function ClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<ClienteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("historico")
  const [showAddPref, setShowAddPref] = useState(false)
  const [newPref, setNewPref] = useState("")
  const [savingPref, setSavingPref] = useState(false)
  const [editingPrefId, setEditingPrefId] = useState<string | null>(null)
  const [editingPrefText, setEditingPrefText] = useState("")

  const loadData = () => {
    fetch(`/api/clientes/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetch(`/api/clientes/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 bg-surface-border-light rounded w-32 animate-pulse" />
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-border-light" />
            <div className="space-y-2">
              <div className="h-5 bg-surface-border-light rounded w-40" />
              <div className="h-3 bg-surface-border-light rounded w-28" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20">
        <p className="text-base-muted">Cliente não encontrado</p>
        <Link href="/clientes" className="text-sm text-accent-600 mt-2 inline-block">Voltar para lista</Link>
      </div>
    )
  }

  const initials = data.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  const sinceDate = new Date(data.criadoEm).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
  const churnStyle = churnColors[data.riscoChurn] ?? churnColors.BAIXO
  const pontos = data.fidelidade?.pontos ?? 0
  const nivel = data.fidelidade?.nivel ?? "PRATA"
  const pontosProximo = data.proximoNivel?.pontosMinimos ?? pontos
  const progresso = pontosProximo > 0 ? Math.min(100, Math.round((pontos / pontosProximo) * 100)) : 100

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-base-secondary hover:text-accent-600 transition-colors">
        <ArrowLeft size={16} /> Voltar para clientes
      </Link>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-base-primary">{data.nome}</h1>
                <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${churnStyle.bg} ${churnStyle.text} ${churnStyle.border}`}>
                  Risco {data.riscoChurn.toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-base-secondary mt-1">Cliente desde {sinceDate}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {data.telefone && (
                  <span className="flex items-center gap-1.5 text-xs text-base-secondary"><Phone size={13} /> {data.telefone}</span>
                )}
                {data.email && (
                  <span className="flex items-center gap-1.5 text-xs text-base-secondary"><Mail size={13} /> {data.email}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => {
              if (data.telefone) {
                const fone = data.telefone.replace(/\D/g, "")
                const num = fone.length <= 11 ? `55${fone}` : fone
                window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Olá ${data.nome.split(" ")[0]}! Tudo bem?`)}`, "_blank")
              } else if (data.email) {
                window.open(`mailto:${data.email}?subject=Mensagem de ${data.nome}`, "_blank")
              } else {
                toast("Cliente sem telefone ou e-mail cadastrado")
              }
            }} className="text-xs sm:text-sm font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              <MessageCircle size={15} /> <span className="hidden sm:inline">Enviar mensagem</span><span className="sm:hidden">Mensagem</span>
            </button>
            <button onClick={() => router.push("/agenda")} className="text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              <Calendar size={15} /> Agendar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-surface-border-light">
          {[
            { label: "Visitas totais", value: String(data.totalVisitas) },
            { label: "Ticket médio", value: `R$ ${Number(data.ticketMedio).toFixed(0)}` },
            { label: "Total gasto", value: `R$ ${Number(data.totalGasto).toLocaleString("pt-BR")}` },
            { label: "Profissional favorita", value: data.favProfissional },
            { label: "Última visita", value: data.diasDesdeUltimaVisita != null ? `${data.diasDesdeUltimaVisita} dias atrás` : "—" },
          ].map((k, i) => (
            <div key={i} className="text-center md:text-left">
              <p className="text-lg font-bold text-base-primary">{k.value}</p>
              <p className="text-xs text-base-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Churn alert */}
          {(data.riscoChurn === "ALTO" || data.riscoChurn === "CRITICO") && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Atenção: risco de perda desta cliente</p>
                  <p className="text-xs text-red-600 mt-1">
                    {data.nome} está há {data.diasDesdeUltimaVisita} dias sem visitar.
                    Score de churn: {data.scoreChurn}%. Envie uma oferta personalizada.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => {
                      if (data.telefone) {
                        const fone = data.telefone.replace(/\D/g, "")
                        const num = fone.length <= 11 ? `55${fone}` : fone
                        window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Olá ${data.nome.split(" ")[0]}! Sentimos sua falta! 💇 Preparamos uma oferta especial para você. Que tal agendar um horário?`)}`, "_blank")
                      } else { toast("Cliente sem telefone cadastrado") }
                    }} className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition-colors">
                      Enviar oferta personalizada
                    </button>
                    <button onClick={() => {
                      if (data.telefone) {
                        window.open(`tel:${data.telefone.replace(/\D/g, "")}`, "_self")
                      } else { toast("Cliente sem telefone cadastrado") }
                    }} className="text-xs font-medium text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">
                      Agendar ligação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex border-b border-surface-border">
              {[
                { key: "historico", label: "Histórico de visitas" },
                { key: "fidelidade", label: "Fidelidade" },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key ? "border-accent-600 text-accent-600" : "border-transparent text-base-muted hover:text-accent-700"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "historico" && (
              <div className="divide-y divide-surface-base">
                {data.agendamentos.length > 0 ? data.agendamentos.map((a) => (
                  <div key={a.id} className="px-5 py-4 hover:bg-surface-base transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-base-primary">
                            {a.servicos.map((s) => s.servico.nome).join(" + ")}
                          </span>
                          <span className="text-xs text-base-muted">com {a.profissional.nome}</span>
                        </div>
                        {a.observacoes && (
                          <p className="text-xs text-base-secondary mt-1 italic leading-relaxed">&ldquo;{a.observacoes}&rdquo;</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold text-accent-700">R$ {Number(a.valorTotal).toFixed(0)}</p>
                        <p className="text-xs text-base-muted">
                          {new Date(a.dataHoraInicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-sm text-base-muted">
                    Nenhum atendimento registrado ainda
                  </div>
                )}
              </div>
            )}

            {activeTab === "fidelidade" && (
              <div className="p-5">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${nivelColors[nivel] ?? nivelColors.PRATA} flex items-center justify-center`}>
                    <Star size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-base-primary">Nível {nivel.charAt(0) + nivel.slice(1).toLowerCase()}</p>
                    <p className="text-sm text-base-secondary">{pontos} pontos acumulados</p>
                  </div>
                </div>
                {data.proximoNivel && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Próximo nível:</span> {data.proximoNivel.nivel.charAt(0) + data.proximoNivel.nivel.slice(1).toLowerCase()} — {data.proximoNivel.descricaoBeneficio}
                    </p>
                    <div className="w-full bg-amber-100 rounded-full h-2 mt-3">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${progresso}%` }} />
                    </div>
                    <p className="text-xs text-amber-600 mt-1.5">
                      {pontos} de {data.proximoNivel.pontosMinimos} pontos ({progresso}%)
                    </p>
                  </div>
                )}
                {!data.proximoNivel && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800 font-semibold">Nível máximo atingido! 🎉</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Preferences */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Heart size={14} className="text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-base-primary">Memória de atendimento</h3>
            </div>
            {data.preferencias.length > 0 ? (
              <div className="space-y-2">
                {data.preferencias.map((pref) => (
                  <div key={pref.id} className="flex items-start gap-2 p-2.5 bg-purple-50 rounded-lg group">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    {editingPrefId === pref.id ? (
                      <div className="flex-1 flex items-start gap-1.5">
                        <textarea
                          value={editingPrefText}
                          onChange={(e) => setEditingPrefText(e.target.value)}
                          className="flex-1 px-2 py-1 border border-purple-200 rounded text-xs text-accent-700 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (!editingPrefText.trim()) return
                            await fetch(`/api/clientes/${params.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ prefId: pref.id, descricao: editingPrefText }),
                            })
                            setData((d) => d ? { ...d, preferencias: d.preferencias.map((p) => p.id === pref.id ? { ...p, descricao: editingPrefText.trim() } : p) } : d)
                            setEditingPrefId(null)
                          }}
                          className="text-purple-500 hover:text-purple-700 shrink-0 mt-1"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingPrefId(null)}
                          className="text-base-muted hover:text-accent-700 shrink-0 mt-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-purple-900 leading-relaxed flex-1">{pref.descricao}</p>
                        <button
                          onClick={() => { setEditingPrefId(pref.id); setEditingPrefText(pref.descricao) }}
                          className="opacity-0 group-hover:opacity-100 text-purple-300 hover:text-purple-500 transition-all shrink-0 mt-0.5"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/clientes/${params.id}?prefId=${pref.id}`, { method: "DELETE" })
                            setData((d) => d ? { ...d, preferencias: d.preferencias.filter((p) => p.id !== pref.id) } : d)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all shrink-0 mt-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-base-muted italic">Nenhuma preferência registrada</p>
            )}

            {showAddPref ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={newPref}
                  onChange={(e) => setNewPref(e.target.value)}
                  placeholder="Ex: Prefere franja mais curta, na altura da sobrancelha"
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg text-xs text-accent-700 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    disabled={savingPref || !newPref.trim()}
                    onClick={async () => {
                      setSavingPref(true)
                      try {
                        const res = await fetch(`/api/clientes/${params.id}`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ descricao: newPref }),
                        })
                        if (res.ok) {
                          const pref = await res.json()
                          setData((d) => d ? { ...d, preferencias: [pref, ...d.preferencias] } : d)
                          setNewPref("")
                          setShowAddPref(false)
                        }
                      } catch {}
                      setSavingPref(false)
                    }}
                    className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
                  >
                    {savingPref ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => { setShowAddPref(false); setNewPref("") }}
                    className="text-xs text-base-muted hover:text-accent-700 px-2 py-1.5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPref(true)}
                className="w-full text-xs text-purple-600 hover:bg-purple-50 font-medium mt-3 py-2 rounded-md transition-colors"
              >
                + Adicionar anotação
              </button>
            )}
          </div>

          {/* Quick info */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-base-primary mb-4">Resumo</h3>
            <div className="space-y-3">
              {[
                { icon: UserCheck, label: "Profissional favorita", value: data.favProfissional },
                { icon: Scissors, label: "Total de visitas", value: String(data.totalVisitas) },
                { icon: Calendar, label: "Score de churn", value: `${data.scoreChurn}%` },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-base flex items-center justify-center">
                    <item.icon size={14} className="text-base-muted" />
                  </div>
                  <div>
                    <p className="text-xs text-base-muted">{item.label}</p>
                    <p className="text-sm font-medium text-accent-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
