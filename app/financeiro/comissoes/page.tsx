"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft, DollarSign, Users, ChevronDown, ChevronUp,
  Download, Check, FileText, CircleDollarSign, Wallet, PiggyBank
} from "lucide-react"
import Link from "next/link"
import { Modal, Field, ModalActions } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface ServicoComissao {
  nome: string
  preco: number
}

interface Comissao {
  id: string
  valorBase: number
  percentual: number
  valorComissao: number
  pago: boolean
  pagoEm: string | null
  dataAgendamento: string
  clienteNome: string
  servicos: ServicoComissao[]
  modelo: string
}

interface ProfissionalComissao {
  profissional: {
    id: string
    nome: string
    modeloComissao: string
    comissaoPadrao: number
  }
  comissoes: Comissao[]
  totalComissao: number
  totalPago: number
  totalPendente: number
}

interface ComissoesData {
  profissionais: ProfissionalComissao[]
  totais: {
    totalGeral: number
    totalPago: number
    totalPendente: number
  }
}

const modeloLabels: Record<string, string> = {
  PERCENTUAL_FIXO: "% fixo",
  PERCENTUAL_SERVICO: "% por servico",
  VALOR_FIXO: "Valor fixo",
  LOCACAO_CADEIRA: "Locacao cadeira",
}

const modeloBadgeColor: Record<string, string> = {
  PERCENTUAL_FIXO: "bg-accent-50 text-accent-600",
  PERCENTUAL_SERVICO: "bg-violet-50 text-violet-600",
  VALOR_FIXO: "bg-amber-50 text-amber-600",
  LOCACAO_CADEIRA: "bg-sky-50 text-sky-600",
}

const profColors = [
  "#105a73", "#7c3aed", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#2563eb", "#c026d3", "#475569", "#ea580c",
]

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function ComissoesPage() {
  const [data, setData] = useState<ComissoesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(getCurrentMonth())
  const [filtro, setFiltro] = useState<"all" | "pendente" | "pago">("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [paying, setPaying] = useState(false)
  const { toast } = useToast()

  // Fechamento modal
  const [showFechamento, setShowFechamento] = useState(false)
  const [fechamentoProf, setFechamentoProf] = useState("")
  const [fechamentoInicio, setFechamentoInicio] = useState("")
  const [fechamentoFim, setFechamentoFim] = useState("")
  const [fechamentoDescontos, setFechamentoDescontos] = useState("")
  const [fechamentoObs, setFechamentoObs] = useState("")
  const [savingFechamento, setSavingFechamento] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/comissoes?mes=${mes}&status=${filtro}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [mes, filtro])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSelectAll = (comissoes: Comissao[]) => {
    const pending = comissoes.filter((c) => !c.pago)
    const allSelected = pending.every((c) => selected[c.id])
    const next = { ...selected }
    for (const c of pending) {
      next[c.id] = !allSelected
    }
    setSelected(next)
  }

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)

  const pagarSelecionadas = async () => {
    if (selectedIds.length === 0) return
    setPaying(true)
    try {
      const res = await fetch("/api/comissoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (res.ok) {
        toast("Comissoes marcadas como pagas")
        setSelected({})
        load()
      } else {
        const e = await res.json()
        toast(e.error ?? "Erro ao pagar comissoes")
      }
    } catch {
      toast("Erro ao pagar comissoes")
    }
    setPaying(false)
  }

  const abrirFechamento = (profId: string) => {
    setFechamentoProf(profId)
    setFechamentoInicio(`${mes}-01`)
    const [y, m] = mes.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    setFechamentoFim(`${mes}-${String(lastDay).padStart(2, "0")}`)
    setFechamentoDescontos("")
    setFechamentoObs("")
    setShowFechamento(true)
  }

  const salvarFechamento = async () => {
    setSavingFechamento(true)
    try {
      const body: Record<string, unknown> = {
        profissionalId: fechamentoProf,
        periodoInicio: fechamentoInicio,
        periodoFim: fechamentoFim,
      }
      if (fechamentoDescontos) {
        const val = parseFloat(fechamentoDescontos.replace(",", "."))
        if (!isNaN(val) && val > 0) body.descontos = val
      }
      if (fechamentoObs.trim()) body.observacoes = fechamentoObs.trim()

      const res = await fetch("/api/comissoes/fechamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast("Periodo fechado com sucesso")
        setShowFechamento(false)
        load()
      } else {
        const e = await res.json()
        toast(e.error ?? "Erro ao fechar periodo")
      }
    } catch {
      toast("Erro ao fechar periodo")
    }
    setSavingFechamento(false)
  }

  const exportarCSV = async () => {
    try {
      const res = await fetch(`/api/relatorios?tipo=comissoes&mes=${mes}&formato=csv`)
      if (!res.ok) { toast("Erro ao exportar"); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `comissoes-${mes}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast("Relatorio exportado com sucesso")
    } catch {
      toast("Erro ao exportar")
    }
  }

  const profCount = data?.profissionais?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Comissoes</h1>
            <p className="text-xs text-base-muted">Gestao de comissoes por profissional</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="text-xs border border-surface-border rounded-lg px-3 py-2 bg-surface-card text-base-primary"
          />
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            {([
              { key: "all" as const, label: "Todas" },
              { key: "pendente" as const, label: "Pendentes" },
              { key: "pago" as const, label: "Pagas" },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`text-xs px-3 py-2 font-medium transition-colors ${
                  filtro === f.key
                    ? "bg-accent-600 text-white"
                    : "text-base-secondary hover:bg-surface-base"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportarCSV}
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Download size={15} /> <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-5 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-surface-border-light mb-2" />
              <div className="h-6 bg-surface-border-light rounded w-24 mb-1" />
              <div className="h-4 bg-surface-border-light rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: CircleDollarSign, label: "Total comissoes", value: `R$ ${(data?.totais.totalGeral ?? 0).toLocaleString("pt-BR")}`, color: "text-accent-600", bg: "bg-accent-50" },
            { icon: Wallet, label: "Pendente", value: `R$ ${(data?.totais.totalPendente ?? 0).toLocaleString("pt-BR")}`, color: "text-amber-600", bg: "bg-amber-50" },
            { icon: PiggyBank, label: "Pago", value: `R$ ${(data?.totais.totalPago ?? 0).toLocaleString("pt-BR")}`, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Users, label: "Profissionais", value: String(profCount), color: "text-violet-600", bg: "bg-violet-50" },
          ].map((k, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-5 hover:shadow-card-hover transition-shadow">
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-2 md:mb-3 ${k.bg}`}>
                <k.icon size={18} className={k.color} />
              </div>
              <p className={`text-xl md:text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-sm text-base-secondary mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Batch pay button */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check size={16} className="text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">{selectedIds.length} comiss{selectedIds.length === 1 ? "ao" : "oes"} selecionada{selectedIds.length === 1 ? "" : "s"}</span>
          <button
            onClick={pagarSelecionadas}
            disabled={paying}
            className="ml-auto text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {paying ? "Pagando..." : "Pagar selecionadas"}
          </button>
        </div>
      )}

      {/* Professionals list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-surface-border-light" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-border-light rounded w-32" />
                  <div className="h-3 bg-surface-border-light rounded w-48" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[1, 2].map((j) => <div key={j} className="h-10 bg-surface-base rounded animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (data?.profissionais ?? []).length > 0 ? (
        <div className="space-y-4">
          {(data?.profissionais ?? []).map((p, idx) => {
            const isExpanded = expanded[p.profissional.id] ?? true
            const pendingComissoes = p.comissoes.filter((c) => !c.pago)
            const allPendingSelected = pendingComissoes.length > 0 && pendingComissoes.every((c) => selected[c.id])
            const color = profColors[idx % profColors.length]

            return (
              <div key={p.profissional.id} className="glass-card rounded-2xl p-4 md:p-5">
                {/* Professional header */}
                <div className="flex items-center gap-3 md:gap-4">
                  <div
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {getInitials(p.profissional.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-base-primary">{p.profissional.nome}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${modeloBadgeColor[p.profissional.modeloComissao] ?? "bg-surface-border-light text-base-muted"}`}>
                        {modeloLabels[p.profissional.modeloComissao] ?? p.profissional.modeloComissao}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-base-muted">
                      <span>Total: <span className="font-semibold text-accent-600">R$ {p.totalComissao.toLocaleString("pt-BR")}</span></span>
                      <span>Pago: <span className="font-semibold text-emerald-600">R$ {p.totalPago.toLocaleString("pt-BR")}</span></span>
                      <span>Pendente: <span className="font-semibold text-amber-600">R$ {p.totalPendente.toLocaleString("pt-BR")}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => abrirFechamento(p.profissional.id)}
                      className="text-[11px] font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-2.5 py-1.5 rounded-lg hidden md:flex items-center gap-1"
                    >
                      <FileText size={12} /> Fechar periodo
                    </button>
                    <button
                      onClick={() => toggleExpand(p.profissional.id)}
                      className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mobile: fechar periodo button */}
                <div className="md:hidden mt-2">
                  <button
                    onClick={() => abrirFechamento(p.profissional.id)}
                    className="text-[11px] font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-2.5 py-1.5 rounded-lg flex items-center gap-1 w-full justify-center"
                  >
                    <FileText size={12} /> Fechar periodo
                  </button>
                </div>

                {/* Commissions table */}
                {isExpanded && p.comissoes.length > 0 && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-base-muted border-b border-surface-border-light">
                            <th className="pb-2 font-medium w-8">
                              {pendingComissoes.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={allPendingSelected}
                                  onChange={() => toggleSelectAll(p.comissoes)}
                                  className="rounded border-surface-border"
                                />
                              )}
                            </th>
                            <th className="pb-2 font-medium">Data</th>
                            <th className="pb-2 font-medium">Cliente</th>
                            <th className="pb-2 font-medium">Servicos</th>
                            <th className="pb-2 font-medium text-right">Valor base</th>
                            <th className="pb-2 font-medium text-right">%</th>
                            <th className="pb-2 font-medium text-right">Comissao</th>
                            <th className="pb-2 font-medium text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-base">
                          {p.comissoes.map((c) => (
                            <tr key={c.id} className="group">
                              <td className="py-2.5">
                                {!c.pago && (
                                  <input
                                    type="checkbox"
                                    checked={!!selected[c.id]}
                                    onChange={() => toggleSelect(c.id)}
                                    className="rounded border-surface-border"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 text-base-secondary">
                                {new Date(c.dataAgendamento).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-2.5 font-medium text-base-primary">{c.clienteNome}</td>
                              <td className="py-2.5 text-base-secondary">
                                <div className="flex flex-wrap gap-1">
                                  {c.servicos.map((s, si) => (
                                    <span key={si} className="text-[10px] bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">
                                      {s.nome}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 text-right text-base-secondary">
                                R$ {c.valorBase.toLocaleString("pt-BR")}
                              </td>
                              <td className="py-2.5 text-right text-base-secondary">
                                {c.percentual}%
                              </td>
                              <td className="py-2.5 text-right font-semibold text-accent-700">
                                R$ {c.valorComissao.toLocaleString("pt-BR")}
                              </td>
                              <td className="py-2.5 text-center">
                                {c.pago ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    Pago
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                    Pendente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden mt-3 space-y-2">
                      {p.comissoes.map((c) => (
                        <div key={c.id} className="glass-subtle rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {!c.pago && (
                                <input
                                  type="checkbox"
                                  checked={!!selected[c.id]}
                                  onChange={() => toggleSelect(c.id)}
                                  className="rounded border-surface-border shrink-0"
                                />
                              )}
                              <span className="text-sm font-medium text-base-primary truncate">{c.clienteNome}</span>
                            </div>
                            {c.pago ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                                Pago
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">
                                Pendente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-base-muted mb-2">
                            <span>{new Date(c.dataAgendamento).toLocaleDateString("pt-BR")}</span>
                            {c.servicos.map((s, si) => (
                              <span key={si} className="bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">
                                {s.nome}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-base-muted">
                              Base: R$ {c.valorBase.toLocaleString("pt-BR")} x {c.percentual}%
                            </span>
                            <span className="font-semibold text-accent-700">
                              R$ {c.valorComissao.toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {isExpanded && p.comissoes.length === 0 && (
                  <div className="mt-4 text-center py-6 text-base-muted/60">
                    <DollarSign size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma comissao neste periodo</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-base-muted/60">
          <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma comissao encontrada para este periodo</p>
          <p className="text-[10px] mt-1">Comissoes sao geradas automaticamente a partir dos agendamentos finalizados</p>
        </div>
      )}

      {/* Modal: Fechamento de periodo */}
      <Modal open={showFechamento} title="Fechar periodo de comissoes" onClose={() => setShowFechamento(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Inicio do periodo</label>
              <input
                type="date"
                value={fechamentoInicio}
                onChange={(e) => setFechamentoInicio(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Fim do periodo</label>
              <input
                type="date"
                value={fechamentoFim}
                onChange={(e) => setFechamentoFim(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50"
              />
            </div>
          </div>

          <Field
            label="Descontos (R$) - opcional"
            value={fechamentoDescontos}
            onChange={(v) => setFechamentoDescontos(v)}
            placeholder="0,00"
          />

          <Field
            label="Observacoes (opcional)"
            value={fechamentoObs}
            onChange={(v) => setFechamentoObs(v)}
            placeholder="Ex.: Adiantamento descontado, vale-transporte..."
          />

          <ModalActions
            onCancel={() => setShowFechamento(false)}
            onSave={salvarFechamento}
            saving={savingFechamento}
            saveLabel="Fechar periodo"
          />
        </div>
      </Modal>
    </div>
  )
}
