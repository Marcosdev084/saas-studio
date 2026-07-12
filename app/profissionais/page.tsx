"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft, Phone, Mail, Calendar, Plus, Star, Edit,
  DollarSign, Users, Activity, UserCheck, AlertTriangle, X, BarChart3,
  Trash2, Save, Clock, Settings, Scissors
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts"
import { Modal, Field, SelectField, MaskedField, ModalActions, ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface ProfResumo {
  id: string; nome: string; email: string | null; telefone: string | null
  especialidade: string | null; cor: string | null; comissaoPadrao: number
  totalAtendimentos: number; receitaTotal: number; avaliacaoMedia: number
  comissaoValor: number; ocupacao: number
}
interface Totais { receita: number; atendimentos: number; comissoes: number; ocupacaoMedia: number }
interface ProfDetalhe {
  id: string; nome: string; email: string | null; telefone: string | null
  especialidade: string | null; cor: string | null; criadoEm: string
  stats: { atendimentos: number; receita: number; ocupacao: number; ticketMedio: number; avaliacaoMedia: number; comissaoPadrao: number; comissaoValor: number; clientesUnicos: number; cancelamentos: number; noShows: number }
  servicos: { nome: string; preco: number }[]
}

interface HorarioDia {
  diaSemana: number; ativo: boolean; horaAbertura: string; horaFechamento: string
}

interface ServicoLink {
  servicoId: string; nome: string; categoria: string | null
  precoBase: number; duracaoBase: number
  vinculado: boolean; precoCustomizado: number | null; duracaoCustomizada: number | null
}

const cores = ["#105a73", "#27c5f1", "#1a9ec5", "#759ba6", "#0d4a5f", "#011e26"]
const emptyForm = { nome: "", email: "", telefone: "", especialidade: "", cor: "#105a73", comissaoPadrao: "40" }
const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const especialidades = [
  "Cabeleireiro(a)", "Barbeiro", "Manicure", "Esteticista", "Maquiador(a)",
  "Depilador(a)", "Massagista", "Podólogo(a)", "Dentista", "Auxiliar", "Recepcionista", "Gerente",
]

function ProfDetail({ profId, onBack, onDeleted }: { profId: string; onBack: () => void; onDeleted: () => void }) {
  const [prof, setProf] = useState<ProfDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ nome: "", email: "", telefone: "", especialidade: "", cor: "#105a73", comissaoPadrao: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"perfil" | "horarios" | "servicos">("perfil")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { toast } = useToast()

  const [horarios, setHorarios] = useState<HorarioDia[]>([])
  const [configEstab, setConfigEstab] = useState<HorarioDia[]>([])
  const [loadingH, setLoadingH] = useState(false)
  const [savingH, setSavingH] = useState(false)

  const [servicosLink, setServicosLink] = useState<ServicoLink[]>([])
  const [loadingS, setLoadingS] = useState(false)
  const [savingS, setSavingS] = useState(false)

  const loadProf = () => {
    fetch(`/api/profissionais/${profId}`).then((r) => r.json()).then((d) => {
      setProf(d)
      setEditForm({
        nome: d.nome, email: d.email ?? "", telefone: d.telefone ?? "",
        especialidade: d.especialidade ?? "", cor: d.cor ?? "#105a73",
        comissaoPadrao: String(d.stats.comissaoPadrao),
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const loadHorarios = () => {
    setLoadingH(true)
    fetch(`/api/profissionais/${profId}/horarios`).then((r) => r.json()).then((d) => {
      const estab: HorarioDia[] = d.configEstab ?? []
      setConfigEstab(estab)
      const profH: HorarioDia[] = d.horarios ?? []
      const dias = Array.from({ length: 7 }, (_, i) => {
        const ph = profH.find((h) => h.diaSemana === i)
        const eh = estab.find((h) => h.diaSemana === i)
        if (ph) return { diaSemana: i, ativo: ph.ativo, horaAbertura: ph.horaAbertura, horaFechamento: ph.horaFechamento }
        if (eh) return { diaSemana: i, ativo: eh.ativo, horaAbertura: eh.horaAbertura, horaFechamento: eh.horaFechamento }
        return { diaSemana: i, ativo: false, horaAbertura: "08:00", horaFechamento: "18:00" }
      })
      setHorarios(dias)
      setLoadingH(false)
    }).catch(() => setLoadingH(false))
  }

  const loadServicos = () => {
    setLoadingS(true)
    fetch(`/api/profissionais/${profId}/servicos`).then((r) => r.json()).then((d) => {
      setServicosLink(d.servicos ?? [])
      setLoadingS(false)
    }).catch(() => setLoadingS(false))
  }

  useEffect(() => { loadProf() }, [profId])
  useEffect(() => { if (tab === "horarios") loadHorarios() }, [tab])
  useEffect(() => { if (tab === "servicos") loadServicos() }, [tab])

  const salvarEdicao = async () => {
    if (!editForm.nome.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/profissionais/${profId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { const e = await res.json(); setError(e.error); setSaving(false); return }
      setEditMode(false)
      toast("Profissional atualizado com sucesso")
      loadProf()
    } catch { setError("Erro ao salvar") }
    setSaving(false)
  }

  const excluir = async () => {
    await fetch(`/api/profissionais/${profId}`, { method: "DELETE" })
    toast("Profissional excluído")
    onDeleted()
  }

  const salvarHorarios = async () => {
    setSavingH(true)
    await fetch(`/api/profissionais/${profId}/horarios`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias: horarios }),
    })
    setSavingH(false)
    toast("Horários salvos com sucesso")
  }

  const resetarHorarios = async () => {
    await fetch(`/api/profissionais/${profId}/horarios`, { method: "DELETE" })
    toast("Horários resetados para o padrão")
    loadHorarios()
  }

  const setLink = (servicoId: string, patch: Partial<ServicoLink>) => {
    setServicosLink((prev) => prev.map((s) => s.servicoId === servicoId ? { ...s, ...patch } : s))
  }

  const salvarServicos = async () => {
    setSavingS(true)
    await fetch(`/api/profissionais/${profId}/servicos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicos: servicosLink.map((s) => ({
          servicoId: s.servicoId,
          vinculado: s.vinculado,
          precoCustomizado: s.precoCustomizado,
          duracaoCustomizada: s.duracaoCustomizada,
        })),
      }),
    })
    setSavingS(false)
    toast("Serviços atualizados com sucesso")
    loadProf()
  }

  if (loading) return <div className="space-y-6"><div className="h-4 bg-surface-border-light rounded w-32 animate-pulse" /><div className="glass-card rounded-2xl p-6 h-40 animate-pulse" /></div>
  if (!prof) return null

  const sinceDate = new Date(prof.criadoEm).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-base-secondary hover:text-accent-600 transition-colors"><ChevronLeft size={16} /> Voltar para lista</button>
        <div className="flex items-center gap-2">
          {!editMode && (
            <>
              <button onClick={() => { setEditMode(true); setTab("perfil") }}
                className="text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Edit size={14} /> Editar
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Trash2 size={14} /> Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {editMode && (
        <div className="flex items-center gap-1 border-b border-surface-border">
          <button onClick={() => setTab("perfil")}
            className={`text-sm font-medium px-4 py-2.5 border-b-2 transition-colors ${tab === "perfil" ? "border-accent-400 text-accent-600" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
            Dados pessoais
          </button>
          <button onClick={() => setTab("servicos")}
            className={`text-sm font-medium px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${tab === "servicos" ? "border-accent-400 text-accent-600" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
            <Scissors size={14} /> Serviços e preços
          </button>
          <button onClick={() => setTab("horarios")}
            className={`text-sm font-medium px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${tab === "horarios" ? "border-accent-400 text-accent-600" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
            <Clock size={14} /> Horários de atendimento
          </button>
        </div>
      )}

      {editMode && tab === "perfil" ? (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-base-primary mb-4">Editar profissional</h3>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 mb-4">{error}</div>}
          <div className="space-y-4">
            <Field label="Nome" value={editForm.nome} onChange={(v) => setEditForm({ ...editForm, nome: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" />
              <MaskedField label="Telefone" value={editForm.telefone} onChange={(v) => setEditForm({ ...editForm, telefone: v })} mask="telefone" />
            </div>
            <SelectField label="Especialidade" value={editForm.especialidade} onChange={(v) => setEditForm({ ...editForm, especialidade: v })}
              options={especialidades.map((e) => ({ value: e, label: e }))} required />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-base-secondary mb-1.5 block">Cor de identificação</label>
                <div className="flex items-center gap-2">
                  {cores.map((c) => (
                    <button key={c} onClick={() => setEditForm({ ...editForm, cor: c })}
                      className={`w-8 h-8 rounded-lg border-2 transition-colors ${editForm.cor === c ? "border-accent-800 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Field label="Comissão (%)" value={editForm.comissaoPadrao} onChange={(v) => setEditForm({ ...editForm, comissaoPadrao: v })} type="number" placeholder="40" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border-light">
              <button onClick={() => setEditMode(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
              <button onClick={salvarEdicao} disabled={saving}
                className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg flex items-center gap-1.5">
                <Save size={14} /> {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      ) : editMode && tab === "horarios" ? (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-base-primary">Horários de atendimento</h3>
              <p className="text-xs text-base-muted mt-0.5">Configure os dias e horários de trabalho deste profissional</p>
            </div>
            <button onClick={resetarHorarios}
              className="text-xs text-base-secondary hover:text-accent-600 border border-surface-border px-3 py-1.5 rounded-lg">
              Resetar para padrão
            </button>
          </div>
          {loadingH ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-12 bg-surface-base rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {diasSemana.map((dia, idx) => {
                const h = horarios.find((x) => x.diaSemana === idx)
                const estab = configEstab.find((x) => x.diaSemana === idx)
                const estabFechado = !estab || !estab.ativo
                const ativo = estabFechado ? false : (h?.ativo ?? false)
                return (
                  <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg border ${estabFechado ? "border-red-100 bg-red-50/30" : ativo ? "glass-subtle" : "border-surface-border-light bg-surface-base"}`}>
                    <button type="button"
                      disabled={estabFechado}
                      onClick={() => setHorarios((prev) => prev.map((x) => x.diaSemana === idx ? { ...x, ativo: !x.ativo } : x))}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${estabFechado ? "bg-surface-border cursor-not-allowed" : ativo ? "bg-accent-500" : "bg-surface-border"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ativo ? "translate-x-5" : ""}`} />
                    </button>
                    <span className={`text-sm font-medium w-24 ${estabFechado ? "text-base-muted" : ativo ? "text-base-primary" : "text-base-muted"}`}>{dia}</span>
                    {estabFechado ? (
                      <span className="text-xs text-red-400 italic">Estabelecimento fechado</span>
                    ) : ativo ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={h?.horaAbertura ?? "08:00"}
                          min={estab?.horaAbertura} max={estab?.horaFechamento}
                          onChange={(e) => {
                            let v = e.target.value
                            if (estab && v < estab.horaAbertura) v = estab.horaAbertura
                            if (estab && v >= estab.horaFechamento) v = estab.horaAbertura
                            setHorarios((prev) => prev.map((x) => x.diaSemana === idx ? { ...x, horaAbertura: v } : x))
                          }}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                        <span className="text-xs text-base-muted">às</span>
                        <input type="time" value={h?.horaFechamento ?? "18:00"}
                          min={estab?.horaAbertura} max={estab?.horaFechamento}
                          onChange={(e) => {
                            let v = e.target.value
                            if (estab && v > estab.horaFechamento) v = estab.horaFechamento
                            if (estab && v <= estab.horaAbertura) v = estab.horaFechamento
                            setHorarios((prev) => prev.map((x) => x.diaSemana === idx ? { ...x, horaFechamento: v } : x))
                          }}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                      </div>
                    ) : (
                      <span className="text-xs text-base-muted italic">Folga</span>
                    )}
                    {estab && !estabFechado && (
                      <span className="text-[10px] text-base-muted ml-auto">Estab: {estab.horaAbertura}–{estab.horaFechamento}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-surface-border-light">
            <button onClick={() => setEditMode(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
            <button onClick={salvarHorarios} disabled={savingH}
              className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg flex items-center gap-1.5">
              <Save size={14} /> {savingH ? "Salvando..." : "Salvar horários"}
            </button>
          </div>
        </div>
      ) : editMode && tab === "servicos" ? (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-base-primary">Serviços e preços</h3>
            <p className="text-xs text-base-muted mt-0.5">Escolha quais serviços este profissional realiza. O preço e a duração são específicos deste profissional — deixe em branco para usar o padrão do serviço.</p>
          </div>
          {loadingS ? (
            <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-surface-base rounded animate-pulse" />)}</div>
          ) : servicosLink.length === 0 ? (
            <p className="text-xs text-base-muted italic py-4 text-center">Nenhum serviço cadastrado no estabelecimento. Cadastre em Configurações → Serviços.</p>
          ) : (
            <div className="space-y-2">
              {servicosLink.map((s) => (
                <div key={s.servicoId} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-colors ${s.vinculado ? "glass-subtle" : "border-surface-border-light bg-surface-base"}`}>
                  <button type="button"
                    onClick={() => setLink(s.servicoId, { vinculado: !s.vinculado })}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${s.vinculado ? "bg-accent-500" : "bg-surface-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.vinculado ? "translate-x-5" : ""}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${s.vinculado ? "text-base-primary" : "text-base-muted"}`}>{s.nome}</p>
                    {s.categoria && <p className="text-[10px] text-base-muted">{s.categoria}</p>}
                  </div>
                  {s.vinculado ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col">
                        <label className="text-[10px] text-base-muted mb-0.5">Preço (R$)</label>
                        <input type="number" min="0" step="1"
                          value={s.precoCustomizado ?? ""}
                          placeholder={String(s.precoBase)}
                          onChange={(e) => setLink(s.servicoId, { precoCustomizado: e.target.value === "" ? null : Number(e.target.value) })}
                          className="w-24 px-2 py-1.5 border border-surface-border rounded-lg text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] text-base-muted mb-0.5">Duração (min)</label>
                        <input type="number" min="0" step="5"
                          value={s.duracaoCustomizada ?? ""}
                          placeholder={String(s.duracaoBase)}
                          onChange={(e) => setLink(s.servicoId, { duracaoCustomizada: e.target.value === "" ? null : Number(e.target.value) })}
                          className="w-24 px-2 py-1.5 border border-surface-border rounded-lg text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-base-muted italic shrink-0">Não oferece · padrão R$ {s.precoBase} / {s.duracaoBase}min</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-surface-border-light">
            <button onClick={() => setEditMode(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
            <button onClick={salvarServicos} disabled={savingS || loadingS}
              className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg flex items-center gap-1.5">
              <Save size={14} /> {savingS ? "Salvando..." : "Salvar serviços"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: prof.cor ?? "#105a73" }}>
                  {prof.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-base-primary">{prof.nome}</h1>
                  <p className="text-sm text-base-secondary">{prof.especialidade ?? "Profissional"}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {prof.telefone && <span className="flex items-center gap-1 text-xs text-base-muted"><Phone size={12} /> {prof.telefone}</span>}
                    {prof.email && <span className="flex items-center gap-1 text-xs text-base-muted"><Mail size={12} /> {prof.email}</span>}
                    <span className="flex items-center gap-1 text-xs text-base-muted"><Calendar size={12} /> Desde {sinceDate}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-surface-border-light">
              {[
                { label: "Receita (mês)", value: `R$ ${prof.stats.receita.toLocaleString("pt-BR")}`, accent: "text-emerald-600" },
                { label: "Atendimentos", value: String(prof.stats.atendimentos), accent: "text-sky-600" },
                { label: "Ocupação", value: `${prof.stats.ocupacao}%`, accent: "text-accent-600" },
                { label: "Avaliação", value: `${prof.stats.avaliacaoMedia.toFixed(1)} ★`, accent: "text-amber-500" },
              ].map((s, i) => (
                <div key={i} className="text-center sm:text-left"><p className={`text-lg md:text-xl font-bold ${s.accent}`}>{s.value}</p><p className="text-[10px] md:text-xs text-base-muted mt-0.5">{s.label}</p></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-base-primary mb-4">Comissionamento</h3>
              <div className="flex items-center justify-between p-4 bg-surface-base rounded-lg">
                <div><p className="text-xs text-base-muted">Receita bruta</p><p className="text-lg font-bold text-base-primary">R$ {prof.stats.receita.toLocaleString("pt-BR")}</p></div>
                <div className="text-center"><p className="text-xs text-base-muted">Comissão</p><p className="text-lg font-bold text-accent-600">{prof.stats.comissaoPadrao}%</p></div>
                <div className="text-right"><p className="text-xs text-base-muted">A pagar</p><p className="text-lg font-bold text-emerald-600">R$ {prof.stats.comissaoValor.toLocaleString("pt-BR")}</p></div>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-base-primary mb-4">Serviços vinculados</h3>
              <div className="space-y-2">
                {prof.servicos.length > 0 ? prof.servicos.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface-base">
                    <span className="text-base-primary">{s.nome}</span>
                    <span className="font-semibold text-base-primary">R$ {s.preco.toFixed(0)}</span>
                  </div>
                )) : <p className="text-xs text-base-muted italic">Nenhum serviço vinculado</p>}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5 lg:col-span-2">
              <h3 className="text-sm font-bold text-base-primary mb-4">Indicadores adicionais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: "Ticket médio", value: `R$ ${prof.stats.ticketMedio}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
                  { label: "Clientes únicos", value: String(prof.stats.clientesUnicos), icon: Users, color: "bg-sky-50 text-sky-600" },
                  { label: "Cancelamentos", value: String(prof.stats.cancelamentos), icon: X, color: "bg-red-50 text-red-500" },
                  { label: "No-shows", value: String(prof.stats.noShows), icon: AlertTriangle, color: "bg-amber-50 text-amber-500" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border-light">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon size={16} /></div>
                    <div><p className="text-sm font-bold text-base-primary">{s.value}</p><p className="text-xs text-base-muted">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={excluir}
        title="Excluir profissional"
        message={`Tem certeza que deseja excluir "${prof.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<ProfResumo[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProf, setSelectedProf] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const load = () => {
    fetch("/api/profissionais").then((r) => r.json()).then((d) => {
      setProfissionais(d.profissionais ?? []); setTotais(d.totais ?? null); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm); setError(""); setShowModal(true) }

  const save = async () => {
    if (!form.nome.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/profissionais", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); setError(e.error); setSaving(false); return }
      setShowModal(false); toast("Profissional criado com sucesso"); load()
    } catch { setError("Erro ao salvar") }
    setSaving(false)
  }

  if (selectedProf) return <ProfDetail profId={selectedProf} onBack={() => { setSelectedProf(null); load() }} onDeleted={() => { setSelectedProf(null); load() }} />

  const radarData = profissionais.length > 1 ? [
    { metric: "Receita", ...Object.fromEntries(profissionais.map((p) => [p.nome, Math.round((p.receitaTotal / Math.max(...profissionais.map((x) => x.receitaTotal), 1)) * 100)])) },
    { metric: "Ocupação", ...Object.fromEntries(profissionais.map((p) => [p.nome, p.ocupacao])) },
    { metric: "Avaliação", ...Object.fromEntries(profissionais.map((p) => [p.nome, Math.round(p.avaliacaoMedia * 20)])) },
    { metric: "Atendimentos", ...Object.fromEntries(profissionais.map((p) => [p.nome, Math.round((p.totalAtendimentos / Math.max(...profissionais.map((x) => x.totalAtendimentos), 1)) * 100)])) },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-[22px] font-bold text-base-primary tracking-tight">Profissionais</h1><p className="text-xs text-base-muted">{profissionais.length} profissionais ativos</p></div>
        <div className="flex items-center gap-2">
          {profissionais.length > 1 && (
            <button onClick={() => setCompareMode(!compareMode)}
              className={`text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 border ${compareMode ? "bg-accent-50 text-accent-700 border-accent-100" : "text-base-secondary border-surface-border hover:bg-surface-base"}`}>
              <BarChart3 size={15} /> Comparar
            </button>
          )}
          <button onClick={openCreate} className="text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"><Plus size={15} /> <span className="hidden sm:inline">Adicionar profissional</span><span className="sm:hidden">Adicionar</span></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map((i) => <div key={i} className="glass-subtle rounded-xl px-4 py-3 h-16 animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Receita total (mês)", value: `R$ ${totais?.receita.toLocaleString("pt-BR")}`, color: "text-emerald-600" },
            { label: "Total atendimentos", value: String(totais?.atendimentos), color: "text-sky-600" },
            { label: "Comissões a pagar", value: `R$ ${totais?.comissoes.toLocaleString("pt-BR")}`, color: "text-violet-600" },
            { label: "Ocupação média", value: `${totais?.ocupacaoMedia}%`, color: "text-accent-600" },
          ].map((s, i) => (
            <div key={i} className="glass-subtle rounded-xl px-4 py-3"><p className={`text-lg font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-base-muted">{s.label}</p></div>
          ))}
        </div>
      )}

      {compareMode && radarData.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-base-primary mb-4">Comparativo de desempenho</h3>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} /><PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {profissionais.map((p, i) => <Radar key={p.id} name={p.nome} dataKey={p.nome} stroke={p.cor ?? cores[i]} fill={p.cor ?? cores[i]} fillOpacity={0.12} strokeWidth={2} />)}
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2">
            {profissionais.map((p, i) => <div key={p.id} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.cor ?? cores[i] }} /><span className="text-xs text-base-secondary">{p.nome}</span></div>)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{[1,2,3].map((i) => <div key={i} className="glass-card rounded-2xl p-5 h-56 animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {profissionais.map((p, i) => (
            <div key={p.id} className="glass-card rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProf(p.id)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.cor ?? cores[i] }}>
                  {p.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-base-primary">{p.nome}</p><p className="text-xs text-base-muted">{p.especialidade ?? "Profissional"}</p></div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-md"><Star size={12} /><span className="text-xs font-bold">{p.avaliacaoMedia.toFixed(1)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface-base rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-base-primary">{p.totalAtendimentos}</p><p className="text-[10px] text-base-muted">Atendimentos</p></div>
                <div className="bg-surface-base rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-emerald-600">R$ {(p.receitaTotal / 1000).toFixed(1)}k</p><p className="text-[10px] text-base-muted">Receita</p></div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span className="text-base-secondary">Ocupação</span><span className="font-semibold text-base-primary">{p.ocupacao}%</span></div>
                <div className="w-full bg-surface-border-light rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${p.ocupacao}%`, backgroundColor: p.cor ?? cores[i] }} /></div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-surface-border-light">
                <span className="text-xs text-base-muted">Comissão ({p.comissaoPadrao}%)</span>
                <span className="text-sm font-bold text-accent-600">R$ {p.comissaoValor.toLocaleString("pt-BR")}</span>
              </div>
              <div className="text-center mt-3"><span className="text-[10px] text-accent-600 font-medium">Ver perfil completo →</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Profissional */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adicionar Profissional">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <Field label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <MaskedField label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} mask="telefone" />
          </div>
          <SelectField label="Especialidade" value={form.especialidade} onChange={(v) => setForm({ ...form, especialidade: v })} options={
            especialidades.map((e) => ({ value: e, label: e }))
          } required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Cor de identificação</label>
              <div className="flex items-center gap-2">
                {cores.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, cor: c })}
                    className={`w-8 h-8 rounded-lg border-2 transition-colors ${form.cor === c ? "border-accent-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Field label="Comissão (%)" value={form.comissaoPadrao} onChange={(v) => setForm({ ...form, comissaoPadrao: v })} type="number" placeholder="40" />
          </div>
          <ModalActions onCancel={() => setShowModal(false)} onSave={save} saving={saving} saveLabel="Criar profissional" />
        </div>
      </Modal>
    </div>
  )
}
