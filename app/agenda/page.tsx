"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import { Calendar, ChevronRight, ChevronLeft, Plus, Filter, X, Clock, Settings } from "lucide-react"
import { Modal, SelectField, TextAreaField, ModalActions } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface Prof { id: string; nome: string; cor: string | null }
interface Slot { id: string; hora: string; clienteId: string | null; clienteNome: string; servico: string; status: string; duracao: number }
interface Stats { total: number; confirmados: number; atendendo: number; concluidos: number; vagos: number; receitaPrevista: number }
interface HorarioDia { ativo: boolean; abertura: string; fechamento: string }
interface HorarioProf { ativo: boolean; abertura: string; fechamento: string }
interface AgendaData { profissionais: Prof[]; slotsPorProf: Record<string, Slot[]>; stats: Stats; horarioDia: HorarioDia; horarioPorProf: Record<string, HorarioProf> }
interface ClienteOpt { id: string; nome: string }
interface ServicoOpt { id: string; nome: string; duracaoMinutos: number; preco: number }
interface FormaPag { id: string; nome: string; tipo: string; diasRecebimento: number; ativo: boolean }

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
  concluido: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Concluído", dot: "bg-emerald-500" },
  atendendo: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Atendendo", dot: "bg-amber-500 animate-pulse" },
  confirmado: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Confirmado", dot: "bg-sky-500" },
  pendente: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Pendente", dot: "bg-orange-400" },
  cancelado: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Cancelado", dot: "bg-red-400" },
  no_show: { bg: "bg-surface-base", text: "text-base-secondary", border: "border-surface-border", label: "Não compareceu", dot: "bg-base-muted" },
}

function StatusDot({ status }: { status: string }) {
  const s = statusConfig[status] || statusConfig.pendente
  return <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
}

function StatusBadge({ status }: { status: string }) {
  const s = statusConfig[status] || statusConfig.pendente
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
}

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function toMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function fromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

function gerarSlots(abertura: string, fechamento: string): string[] {
  const inicioMin = toMin(abertura)
  const fimMin = toMin(fechamento)
  const slots: string[] = []
  for (let m = inicioMin; m < fimMin; m += 60) {
    slots.push(fromMin(m))
  }
  return slots
}

function ClienteSearch({ clientes, value, onChange }: { clientes: ClienteOpt[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedNome = clientes.find((c) => c.id === value)?.nome ?? ""

  useEffect(() => {
    if (value && !open) setQuery(selectedNome)
  }, [value, selectedNome, open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = clientes.filter((c) => c.nome.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">
        Cliente <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        value={open ? query : selectedNome || query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange("") }}
        onFocus={() => { setOpen(true); setQuery(selectedNome || "") }}
        placeholder="Pesquisar cliente..."
        className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 glass-card rounded-lg shadow-lg max-h-[210px] overflow-y-auto scroll-fade-y">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c.id); setQuery(c.nome); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent-50 transition-colors ${c.id === value ? "bg-accent-50 text-accent-700 font-medium" : "text-accent-700"}`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 glass-card rounded-lg shadow-lg p-3">
          <p className="text-xs text-base-muted text-center">Nenhum cliente encontrado</p>
        </div>
      )}
    </div>
  )
}

const emptyForm = { clienteId: "", profissionalId: "", servicoIds: [] as string[], data: "", hora: "", observacoes: "" }

export default function AgendaPage() {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProf, setSelectedProf] = useState("all")
  const [dataSelecionada, setDataSelecionada] = useState(toLocalISO(new Date()))

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [servicos, setServicos] = useState<ServicoOpt[]>([])
  const [servicosLoading, setServicosLoading] = useState(false)

  const [modalAgenda, setModalAgenda] = useState<AgendaData | null>(null)

  const [statusSlot, setStatusSlot] = useState<Slot | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [formas, setFormas] = useState<FormaPag[]>([])
  const [concluindo, setConcluindo] = useState(false)
  const [formaSelId, setFormaSelId] = useState("")
  const { toast } = useToast()

  const [showHorarios, setShowHorarios] = useState(false)
  const [horarioProf, setHorarioProf] = useState<string>("")
  const [horarioDias, setHorarioDias] = useState<{ diaSemana: number; ativo: boolean; horaAbertura: string; horaFechamento: string }[]>([])
  const [horarioEstab, setHorarioEstab] = useState<{ diaSemana: number; ativo: boolean; horaAbertura: string; horaFechamento: string }[]>([])
  const [horarioLoading, setHorarioLoading] = useState(false)
  const [horarioSaving, setHorarioSaving] = useState(false)

  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

  const abrirHorarios = async (profId: string) => {
    setHorarioProf(profId)
    setHorarioLoading(true)
    setShowHorarios(true)
    try {
      const res = await fetch(`/api/profissionais/${profId}/horarios`)
      const { horarios, configEstab } = await res.json()
      setHorarioEstab(configEstab ?? [])
      const dias = Array.from({ length: 7 }, (_, i) => {
        const prof = horarios.find((h: { diaSemana: number }) => h.diaSemana === i)
        const estab = (configEstab ?? []).find((h: { diaSemana: number }) => h.diaSemana === i)
        if (prof) return { diaSemana: i, ativo: prof.ativo, horaAbertura: prof.horaAbertura, horaFechamento: prof.horaFechamento }
        if (estab) return { diaSemana: i, ativo: estab.ativo, horaAbertura: estab.horaAbertura, horaFechamento: estab.horaFechamento }
        return { diaSemana: i, ativo: false, horaAbertura: "08:00", horaFechamento: "18:00" }
      })
      setHorarioDias(dias)
    } catch { /* empty */ }
    setHorarioLoading(false)
  }

  const salvarHorarios = async () => {
    setHorarioSaving(true)
    await fetch(`/api/profissionais/${horarioProf}/horarios`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias: horarioDias }),
    })
    setHorarioSaving(false)
    setShowHorarios(false)
    toast("Horários salvos com sucesso")
    load()
  }

  const resetarHorarios = async () => {
    setHorarioSaving(true)
    await fetch(`/api/profissionais/${horarioProf}/horarios`, { method: "DELETE" })
    setHorarioSaving(false)
    setShowHorarios(false)
    toast("Horários resetados para o padrão")
    load()
  }

  const load = useCallback(() => {
    const params = new URLSearchParams()
    params.set("data", dataSelecionada)
    if (selectedProf !== "all") params.set("profissional", selectedProf)
    fetch(`/api/agenda?${params}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [dataSelecionada, selectedProf])

  useEffect(() => { setLoading(true); load() }, [load])

  useEffect(() => {
    fetch("/api/formas-pagamento").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setFormas(d.filter((f: FormaPag) => f.ativo)) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!showModal || !form.data) return
    const params = new URLSearchParams()
    params.set("data", form.data)
    fetch(`/api/agenda?${params}`).then((r) => r.json()).then((d) => setModalAgenda(d)).catch(() => {})
  }, [showModal, form.data])

  // Carrega os serviços que o profissional selecionado oferece (com o preço dele)
  useEffect(() => {
    if (!showModal) return
    if (!form.profissionalId) { setServicos([]); return }
    setServicosLoading(true)
    fetch(`/api/servicos?profissional=${form.profissionalId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setServicos(d) })
      .catch(() => {})
      .finally(() => setServicosLoading(false))
  }, [showModal, form.profissionalId])

  const profs = data?.profissionais ?? []
  const stats = data?.stats ?? { total: 0, confirmados: 0, atendendo: 0, concluidos: 0, vagos: 0, receitaPrevista: 0 }
  const horarioDia = data?.horarioDia ?? { ativo: false, abertura: "08:00", fechamento: "18:00" }
  const hours = horarioDia.ativo ? gerarSlots(horarioDia.abertura, horarioDia.fechamento) : []

  const dataSel = new Date(dataSelecionada + "T12:00:00")
  const dataFormatada = dataSel.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const hojeISO = toLocalISO(new Date())
  const isHoje = dataSelecionada === hojeISO

  const mudarDia = (delta: number) => {
    const d = new Date(dataSelecionada + "T12:00:00")
    d.setDate(d.getDate() + delta)
    setDataSelecionada(toLocalISO(d))
  }

  const openCreate = (profId?: string, hora?: string) => {
    setForm({ ...emptyForm, profissionalId: profId ?? "", data: dataSelecionada, hora: hora ?? "" })
    setError("")
    setModalAgenda(null)
    setServicos([])
    fetch("/api/clientes").then((r) => r.json()).then((c) => {
      if (Array.isArray(c)) setClientes(c)
    })
    setShowModal(true)
  }

  const toggleServico = (id: string) => {
    setForm((f) => ({ ...f, servicoIds: f.servicoIds.includes(id) ? f.servicoIds.filter((s) => s !== id) : [...f.servicoIds, id], hora: "" }))
  }

  const save = async () => {
    if (!form.clienteId || !form.profissionalId || !form.servicoIds.length || !form.data || !form.hora) {
      setError("Preencha todos os campos obrigatórios"); return
    }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/agenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); setError(e.error); setSaving(false); return }
      setShowModal(false); toast("Agendamento criado com sucesso"); load()
    } catch { setError("Erro ao salvar") }
    setSaving(false)
  }

  const mudarStatus = async (novoStatus: string, formaPagamentoId?: string) => {
    if (!statusSlot) return
    setStatusSaving(true)
    try {
      const res = await fetch("/api/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamentoId: statusSlot.id, status: novoStatus, formaPagamentoId }),
      })
      if (res.ok) { setStatusSlot(null); setConcluindo(false); toast("Status atualizado"); load() }
    } catch {}
    setStatusSaving(false)
  }

  const valorTotal = form.servicoIds.reduce((sum, id) => sum + (servicos.find((sv) => sv.id === id)?.preco ?? 0), 0)
  const duracaoTotal = form.servicoIds.reduce((sum, id) => sum + (servicos.find((sv) => sv.id === id)?.duracaoMinutos ?? 0), 0)

  const modalHorarioDia = modalAgenda?.horarioDia ?? null
  const modalDiaFechado = modalHorarioDia ? !modalHorarioDia.ativo : false

  const horariosDisponiveis = useMemo(() => {
    if (!modalHorarioDia?.ativo || duracaoTotal <= 0 || !form.profissionalId) return []

    const profHorario = modalAgenda?.horarioPorProf?.[form.profissionalId]
    if (profHorario?.ativo === false) return []

    const estabAbMin = toMin(modalHorarioDia.abertura)
    const estabFeMin = toMin(modalHorarioDia.fechamento)
    const profAbMin = profHorario ? toMin(profHorario.abertura) : estabAbMin
    const profFeMin = profHorario ? toMin(profHorario.fechamento) : estabFeMin
    const aberturaMin = Math.max(estabAbMin, profAbMin)
    const fechamentoMin = Math.min(estabFeMin, profFeMin)

    if (aberturaMin >= fechamentoMin) return []

    const slotsProf = (modalAgenda?.slotsPorProf?.[form.profissionalId] ?? [])
      .filter((s) => s.status !== "cancelado" && s.status !== "no_show")

    const ocupados = slotsProf.map((s) => ({
      inicio: toMin(s.hora),
      fim: toMin(s.hora) + s.duracao,
    }))

    const candidatos = new Set<number>()
    for (let m = aberturaMin; m < fechamentoMin; m += 30) {
      candidatos.add(m)
    }
    for (const o of ocupados) {
      if (o.fim >= aberturaMin && o.fim < fechamentoMin) {
        candidatos.add(o.fim)
      }
    }

    const sorted = Array.from(candidatos).sort((a, b) => a - b)

    return sorted
      .filter((m) => {
        if (m + duracaoTotal > fechamentoMin) return false
        return !ocupados.some((o) => m < o.fim && m + duracaoTotal > o.inicio)
      })
      .map((m) => ({
        value: fromMin(m),
        label: `${fromMin(m)} — ${fromMin(m + duracaoTotal)}`,
      }))
  }, [modalHorarioDia, modalAgenda, form.profissionalId, duracaoTotal])

  const statusTransitions: Record<string, string[]> = {
    pendente: ["CONFIRMADO", "CANCELADO", "NO_SHOW"],
    confirmado: ["ATENDENDO", "CANCELADO", "NO_SHOW"],
    atendendo: ["CONCLUIDO", "CANCELADO"],
    concluido: [],
    cancelado: [],
    no_show: [],
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Agenda</h1>
          <p className="text-xs text-base-muted capitalize">{dataFormatada}</p>
        </div>
        <button onClick={() => openCreate()} disabled={!horarioDia.ativo} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
          <Plus size={15} /> Novo agendamento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
        {[
          { label: "Total", value: String(stats.total), color: "text-accent-700" },
          { label: "Confirmados", value: String(stats.confirmados), color: "text-sky-600" },
          { label: "Em atendimento", value: String(stats.atendendo), color: "text-amber-600" },
          { label: "Concluídos", value: String(stats.concluidos), color: "text-emerald-600" },
          { label: "Receita prevista", value: `R$ ${stats.receitaPrevista.toLocaleString("pt-BR")}`, color: "text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="glass-subtle rounded-xl px-4 py-3">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-base-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 glass-card rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => mudarDia(-1)} className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-base-muted" />
            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)}
              className="text-sm font-semibold text-accent-700 border-none bg-transparent focus:outline-none cursor-pointer" />
          </div>
          <button onClick={() => mudarDia(1)} className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted"><ChevronRight size={18} /></button>
          {!isHoje && (
            <button onClick={() => setDataSelecionada(hojeISO)} className="text-xs font-medium text-accent-600 bg-accent-50 px-3 py-1.5 rounded-md ml-1">Hoje</button>
          )}
          {isHoje && (
            <span className="text-xs font-medium text-accent-600 bg-accent-50 px-3 py-1.5 rounded-md ml-1">Hoje</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-base-muted" />
            <select value={selectedProf} onChange={(e) => setSelectedProf(e.target.value)}
              className="text-xs border border-surface-border rounded-md px-2 py-1.5 text-base-secondary focus:outline-none focus:ring-2 focus:ring-accent-400/30">
              <option value="all">Todos os profissionais</option>
              {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dia fechado */}
      {!loading && !horarioDia.ativo && (
        <div className="bg-surface-base border border-surface-border rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-base-secondary">Estabelecimento fechado neste dia</p>
          <p className="text-xs text-base-muted mt-1">Configure os horários de funcionamento em Configurações → Horários</p>
        </div>
      )}

      {/* Grid — estilo Google Agenda */}
      {!loading && horarioDia.ativo && (() => {
        const PX_PER_MIN = 1.6
        const aberturaMin = toMin(horarioDia.abertura)
        const fechamentoMin = toMin(horarioDia.fechamento)
        const totalMin = fechamentoMin - aberturaMin
        const gridHeight = totalMin * PX_PER_MIN

        return (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Header */}
                <div className="flex border-b border-surface-border-light">
                  <div className="w-16 shrink-0 px-3 py-3 text-xs font-medium text-base-muted">Horário</div>
                  {profs.map((p) => {
                    const profHorario = data?.horarioPorProf?.[p.id]
                    const profInativo = profHorario?.ativo === false
                    return (
                      <div key={p.id} className={`flex-1 px-2 py-3 flex items-center justify-center gap-2 border-l border-surface-border-light ${profInativo ? "bg-surface-base" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${profInativo ? "opacity-40" : ""}`} style={{ backgroundColor: p.cor ?? "#105a73" }}>{p.nome[0]}</div>
                        <div className="flex flex-col items-start">
                          <span className={`text-xs font-semibold ${profInativo ? "text-base-muted" : "text-accent-700"}`}>{p.nome}</span>
                          {profInativo && <span className="text-[9px] text-red-400">Folga</span>}
                        </div>
                        <button onClick={() => abrirHorarios(p.id)} className="p-1 rounded hover:bg-surface-border-light text-base-muted/60 hover:text-base-secondary" title="Configurar horários">
                          <Settings size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Body — scrollable */}
                <div className="overflow-y-auto scroll-fade-y" style={{ maxHeight: "calc(100vh - 450px)" }}>
                <div className="flex relative" style={{ height: gridHeight }}>
                  {/* Time labels */}
                  <div className="w-16 shrink-0 relative border-r border-surface-border-light">
                    {hours.map((hora) => {
                      const top = (toMin(hora) - aberturaMin) * PX_PER_MIN
                      return (
                        <div key={hora} className="absolute right-0 left-0 px-2" style={{ top }}>
                          <span className="text-[11px] font-mono text-base-muted">{hora}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Professional columns */}
                  {profs.map((p) => {
                    const slots = data?.slotsPorProf[p.id] ?? []
                    const profHorario = data?.horarioPorProf?.[p.id]
                    const profInativo = profHorario?.ativo === false
                    return (
                      <div key={p.id} className={`flex-1 relative border-l border-surface-border-light ${profInativo ? "bg-surface-base/60" : ""}`} onClick={(e) => {
                        if (profInativo) return
                        if (e.target !== e.currentTarget) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const y = e.clientY - rect.top
                        const clickMin = Math.floor(y / PX_PER_MIN) + aberturaMin
                        const snapped = Math.round(clickMin / 15) * 15
                        openCreate(p.id, fromMin(snapped))
                      }}>
                        {/* Hour grid lines */}
                        {hours.map((hora) => {
                          const top = (toMin(hora) - aberturaMin) * PX_PER_MIN
                          return <div key={hora} className="absolute left-0 right-0 border-t border-surface-border-light" style={{ top }} />
                        })}

                        {profInativo && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-surface-border-light text-base-muted text-xs font-medium px-3 py-1.5 rounded-lg border border-surface-border border-dashed">
                              Não atende neste dia
                            </div>
                          </div>
                        )}

                        {/* Appointment cards */}
                        {(() => {
                          const ativos = slots.filter((s) => s.status !== "cancelado" && s.status !== "no_show")
                          const cancelados = slots.filter((s) => s.status === "cancelado" || s.status === "no_show")

                          const canceladoSobreposto = new Set<string>()
                          const getCancelado = (slot: Slot) => {
                            const sMin = toMin(slot.hora)
                            const sFim = sMin + slot.duracao
                            return cancelados.find((c) => {
                              const cMin = toMin(c.hora)
                              const cFim = cMin + c.duracao
                              return sMin < cFim && sFim > cMin
                            })
                          }

                          return (
                            <>
                              {ativos.map((slot) => {
                                const startMin = toMin(slot.hora)
                                const GAP = 3
                                const top = (startMin - aberturaMin) * PX_PER_MIN + GAP
                                const rawH = slot.duracao * PX_PER_MIN - GAP * 2
                                const height = Math.max(rawH, 22)
                                const endHora = fromMin(startMin + slot.duracao)
                                const isFinal = slot.status === "concluido"
                                const cancelled = getCancelado(slot)
                                if (cancelled) canceladoSobreposto.add(cancelled.id)

                                const cancelH = cancelled ? 18 : 0
                                const contentH = height - cancelH
                                const size: "s" | "m" | "l" = contentH < 32 ? "s" : contentH < 56 ? "m" : "l"

                                const clienteEl = slot.clienteId ? (
                                  <Link href={`/clientes/${slot.clienteId}`} onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-base-primary hover:text-accent-600 truncate">{slot.clienteNome}</Link>
                                ) : (
                                  <span className="text-xs font-semibold text-base-primary truncate">{slot.clienteNome}</span>
                                )

                                return (
                                  <div
                                    key={slot.id}
                                    onClick={(e) => { e.stopPropagation(); if (!isFinal) setStatusSlot(slot) }}
                                    className={`absolute left-1 right-1 rounded-md overflow-hidden border-l-[3px] transition-shadow flex flex-col ${isFinal ? "opacity-60" : "cursor-pointer hover:shadow-md hover:z-20"}`}
                                    style={{
                                      top,
                                      height,
                                      borderLeftColor: p.cor ?? "#105a73",
                                      backgroundColor: (p.cor ?? "#105a73") + "18",
                                      zIndex: 10,
                                    }}
                                  >
                                    <div className="flex-1 min-h-0 px-2 overflow-hidden">
                                      {size === "s" && (
                                        <div className="flex items-center gap-1 h-full min-w-0">
                                          <StatusDot status={slot.status} />
                                          <span className="text-[10px] font-semibold text-base-primary truncate">{slot.clienteNome}</span>
                                          <span className="text-[9px] text-base-muted shrink-0 ml-auto">{slot.hora}–{endHora}</span>
                                        </div>
                                      )}
                                      {size === "m" && (
                                        <div className="flex items-center gap-1 h-full min-w-0 flex-wrap">
                                          <StatusDot status={slot.status} />
                                          {clienteEl}
                                          <span className="text-[10px] text-base-muted">·</span>
                                          <span className="text-[10px] text-base-secondary truncate">{slot.hora} – {endHora}</span>
                                          <span className="text-[10px] text-base-muted">·</span>
                                          <span className="text-[10px] text-base-secondary truncate">{slot.servico}</span>
                                        </div>
                                      )}
                                      {size === "l" && (
                                        <div className="py-1">
                                          <div className="flex items-center gap-1">
                                            <StatusDot status={slot.status} />
                                            {clienteEl}
                                          </div>
                                          <p className="text-[10px] text-base-secondary truncate">{slot.hora} – {endHora}</p>
                                          <p className="text-[10px] text-base-secondary truncate">{slot.servico}</p>
                                        </div>
                                      )}
                                    </div>
                                    {cancelled && (
                                      <div className="px-2 py-0.5 bg-red-50/80 border-t border-red-100 flex items-center gap-1 shrink-0">
                                        <span className="text-[9px] text-red-400 line-through truncate">{cancelled.clienteNome}</span>
                                        <span className="text-[9px] text-red-300 shrink-0">· {statusConfig[cancelled.status]?.label}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Cancelled without replacement — standalone */}
                              {cancelados.filter((c) => !canceladoSobreposto.has(c.id)).map((slot) => {
                                const startMin = toMin(slot.hora)
                                const GAP = 3
                                const top = (startMin - aberturaMin) * PX_PER_MIN + GAP
                                const height = Math.max(slot.duracao * PX_PER_MIN - GAP * 2, 22)
                                const endHora = fromMin(startMin + slot.duracao)
                                return (
                                  <div
                                    key={slot.id + "-c"}
                                    className="absolute left-1 right-1 rounded-md px-2 overflow-hidden border border-dashed border-red-200 bg-red-50/40"
                                    style={{ top, height, zIndex: 5, opacity: 0.6 }}
                                  >
                                    <div className="flex items-center gap-1 h-full min-w-0">
                                      <span className="text-[10px] text-red-400 line-through truncate">{slot.clienteNome}</span>
                                      <span className="text-[9px] text-red-300 shrink-0">{slot.hora}–{endHora} · {statusConfig[slot.status]?.label}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {loading && (
        <div className="glass-card rounded-2xl p-8 space-y-4">
          {[1,2,3,4,5].map((i) => <div key={i} className="flex gap-4 animate-pulse"><div className="w-16 h-10 bg-surface-border-light rounded" /><div className="flex-1 h-10 bg-surface-base rounded" /></div>)}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        {Object.entries(statusConfig).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5"><StatusDot status={key} /><span className="text-[10px] text-base-muted">{s.label}</span></div>
        ))}
      </div>

      {!loading && horarioDia.ativo && stats.total === 0 && (
        <div className="bg-accent-50 border border-accent-100 rounded-xl p-4">
          <p className="text-xs text-accent-700">Nenhum agendamento para este dia. Clique no <strong>+</strong> em qualquer horário vago ou no botão acima para criar.</p>
        </div>
      )}

      {/* Modal: Alterar Status */}
      {statusSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setStatusSlot(null); setConcluindo(false) }} />
          <div className="relative glass-card rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-surface-border-light">
              <h2 className="text-base font-bold text-base-primary">{concluindo ? "Concluir atendimento" : "Alterar status"}</h2>
              <button onClick={() => { setStatusSlot(null); setConcluindo(false) }} className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-surface-base rounded-lg">
                <p className="text-sm font-semibold text-base-primary">{statusSlot.clienteNome}</p>
                <p className="text-xs text-base-secondary mt-0.5">{statusSlot.servico}</p>
                <p className="text-xs text-base-muted mt-0.5">{statusSlot.hora}</p>
                <div className="mt-2"><StatusBadge status={statusSlot.status} /></div>
              </div>

              {concluindo ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-base-secondary">Como o cliente pagou?</p>
                  {formas.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {formas.map((f) => (
                        <button key={f.id} onClick={() => setFormaSelId(f.id)}
                          className={`p-2.5 rounded-lg border text-sm text-left transition-colors ${formaSelId === f.id ? "border-accent-400 bg-accent-50 text-accent-700 font-medium" : "border-surface-border text-base-secondary hover:bg-surface-base"}`}>
                          {f.nome}
                          {f.diasRecebimento > 0 && <span className="block text-[10px] text-base-muted">recebe em {f.diasRecebimento}d</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-base-muted">Nenhuma forma configurada — o atendimento será concluído como pago à vista.</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => setConcluindo(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Voltar</button>
                    <button onClick={() => mudarStatus("CONCLUIDO", formaSelId || undefined)} disabled={statusSaving || (formas.length > 0 && !formaSelId)}
                      className="flex-1 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 rounded-lg">
                      {statusSaving ? "Concluindo..." : "Concluir atendimento"}
                    </button>
                  </div>
                </div>
              ) : (statusTransitions[statusSlot.status] ?? []).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-base-secondary">Alterar para:</p>
                  {(statusTransitions[statusSlot.status] ?? []).map((st) => {
                    const cfg = statusConfig[st.toLowerCase()] || statusConfig.pendente
                    return (
                      <button key={st} onClick={() => { if (st === "CONCLUIDO") { setFormaSelId(formas[0]?.id ?? ""); setConcluindo(true) } else { mudarStatus(st) } }} disabled={statusSaving}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm disabled:opacity-50 ${cfg.border} ${cfg.bg}`}>
                        <StatusDot status={st.toLowerCase()} />
                        <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-base-muted text-center py-2">Este agendamento já está em status final.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Agendamento */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Agendamento" wide>
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}

          {modalDiaFechado && form.data && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              O estabelecimento está fechado neste dia. Escolha outra data.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ClienteSearch
              clientes={clientes}
              value={form.clienteId}
              onChange={(v) => setForm({ ...form, clienteId: v })}
            />
            <SelectField label="Profissional" value={form.profissionalId} onChange={(v) => setForm({ ...form, profissionalId: v, hora: "", servicoIds: [] })} required
              options={(modalAgenda?.profissionais ?? data?.profissionais ?? []).filter((p) => {
                const h = modalAgenda?.horarioPorProf?.[p.id]
                return !h || h.ativo !== false
              }).map((p) => ({ value: p.id, label: p.nome }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-base-secondary mb-2 block">Serviços <span className="text-red-400">*</span></label>
            {!form.profissionalId ? (
              <div className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-muted bg-surface-base">
                Selecione um profissional primeiro
              </div>
            ) : servicosLoading ? (
              <div className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-muted bg-surface-base">
                Carregando serviços...
              </div>
            ) : servicos.length === 0 ? (
              <div className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm text-amber-600 bg-amber-50">
                Este profissional não tem serviços vinculados. Configure em Profissionais → Serviços e preços.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {servicos.map((s) => {
                  const selected = form.servicoIds.includes(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleServico(s.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${selected ? "border-accent-400 bg-accent-50" : "border-surface-border hover:border-surface-border"}`}>
                      <p className="text-xs font-medium text-base-primary">{s.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-base-muted">{s.duracaoMinutos}min</span>
                        <span className="text-[10px] text-base-muted">•</span>
                        <span className="text-[10px] font-semibold text-base-secondary">R$ {s.preco}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {form.servicoIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-accent-50 rounded-lg">
              <span className="text-xs text-accent-700">Duração total: <strong>{duracaoTotal}min</strong></span>
              <span className="text-sm font-bold text-accent-700">Total: R$ {valorTotal.toFixed(0)}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-base-secondary mb-1.5 block">Data <span className="text-red-400">*</span></label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value, hora: "" })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
          </div>

          <div>
            <label className="text-xs font-medium text-base-secondary mb-2 block">Horário <span className="text-red-400">*</span></label>
            {!form.profissionalId || !form.servicoIds.length ? (
              <div className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-muted bg-surface-base">
                Selecione profissional e serviço primeiro
              </div>
            ) : modalDiaFechado ? (
              <div className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm text-amber-500 bg-amber-50">
                Estabelecimento fechado neste dia
              </div>
            ) : !modalAgenda ? (
              <div className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-muted bg-surface-base">
                Carregando horários...
              </div>
            ) : horariosDisponiveis.length === 0 ? (
              <div className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-muted bg-surface-base">
                Nenhum horário disponível para este serviço
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto scroll-fade-y border border-surface-border rounded-lg p-2">
                {horariosDisponiveis.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setForm({ ...form, hora: h.value })}
                    className={`py-2.5 px-2 rounded-md text-xs font-medium text-center transition-colors ${
                      form.hora === h.value
                        ? "bg-accent-600 text-white ring-2 ring-accent-400"
                        : "bg-surface-base text-accent-700 hover:bg-accent-50 hover:text-accent-700 cursor-pointer"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            )}
            {form.hora && duracaoTotal > 0 && (
              <p className="text-[10px] text-base-muted mt-1.5">
                Horário: {form.hora} — {fromMin(toMin(form.hora) + duracaoTotal)} ({duracaoTotal}min)
              </p>
            )}
          </div>

          <TextAreaField label="Observações" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} placeholder="Alguma observação para o atendimento..." />

          <ModalActions onCancel={() => setShowModal(false)} onSave={save} saving={saving} saveLabel="Criar agendamento" />
        </div>
      </Modal>

      {/* Modal: Horários do Profissional */}
      <Modal open={showHorarios} onClose={() => setShowHorarios(false)} title={`Horários — ${profs.find((p) => p.id === horarioProf)?.nome ?? "Profissional"}`} wide>
        <div className="space-y-4">
          <p className="text-xs text-base-muted">Configure os dias e horários de atendimento. Dias desmarcados serão exibidos como folga na agenda.</p>

          {horarioLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-10 bg-surface-base rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {horarioDias.map((dia) => {
                const estab = horarioEstab.find((e) => e.diaSemana === dia.diaSemana)
                const estabFechado = !estab || !estab.ativo
                const ativo = estabFechado ? false : dia.ativo
                return (
                  <div key={dia.diaSemana} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${estabFechado ? "border-red-100 bg-red-50/30" : ativo ? "glass-subtle" : "border-surface-border-light bg-surface-base"}`}>
                    <button type="button" disabled={estabFechado}
                      onClick={() => setHorarioDias(horarioDias.map((d) => d.diaSemana === dia.diaSemana ? { ...d, ativo: !d.ativo } : d))}
                      className={`relative w-9 h-[18px] rounded-full transition-colors shrink-0 ${estabFechado ? "bg-surface-border cursor-not-allowed" : ativo ? "bg-accent-500" : "bg-surface-border"}`}>
                      <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform ${ativo ? "translate-x-[18px]" : ""}`} />
                    </button>

                    <span className={`text-sm font-medium w-20 ${estabFechado ? "text-base-muted/60" : ativo ? "text-accent-700" : "text-base-muted"}`}>{diasSemana[dia.diaSemana]}</span>

                    {estabFechado ? (
                      <span className="text-xs text-red-400 italic">Estabelecimento fechado</span>
                    ) : ativo ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={dia.horaAbertura}
                          min={estab?.horaAbertura} max={estab?.horaFechamento}
                          onChange={(e) => {
                            let v = e.target.value
                            if (estab && v < estab.horaAbertura) v = estab.horaAbertura
                            if (estab && v >= estab.horaFechamento) v = estab.horaAbertura
                            setHorarioDias(horarioDias.map((d) => d.diaSemana === dia.diaSemana ? { ...d, horaAbertura: v } : d))
                          }}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-xs text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                        <span className="text-xs text-base-muted">até</span>
                        <input type="time" value={dia.horaFechamento}
                          min={estab?.horaAbertura} max={estab?.horaFechamento}
                          onChange={(e) => {
                            let v = e.target.value
                            if (estab && v > estab.horaFechamento) v = estab.horaFechamento
                            if (estab && v <= estab.horaAbertura) v = estab.horaFechamento
                            setHorarioDias(horarioDias.map((d) => d.diaSemana === dia.diaSemana ? { ...d, horaFechamento: v } : d))
                          }}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-xs text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                      </div>
                    ) : (
                      <span className="text-xs text-base-muted/60 italic">Folga</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-surface-border-light">
            <button onClick={resetarHorarios} disabled={horarioSaving}
              className="text-xs text-base-muted hover:text-red-500 transition-colors">
              Resetar para padrão do estabelecimento
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHorarios(false)} className="text-sm text-base-secondary hover:text-accent-700 px-4 py-2">Cancelar</button>
              <button onClick={salvarHorarios} disabled={horarioSaving}
                className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg">
                {horarioSaving ? "Salvando..." : "Salvar horários"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
