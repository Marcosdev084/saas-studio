"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, DollarSign, Target, Repeat, Megaphone,
  Gift, Send, Calendar, Star, Award, Play, Pause, Trash2, X as XIcon,
  Search, Check, Pencil
} from "lucide-react"
import { Modal, Field, SelectField, TextAreaField, ModalActions } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface ClienteRisco {
  id: string; nome: string; telefone?: string | null; riscoChurn: string; scoreChurn: number
  ultimaVisita: string | null; diasDesdeUltimaVisita: number | null
  ticketMedio: number; ultimoServico: string; profissional: string
}
interface Campanha {
  id: string; nome: string; status: string; canal: string
  dataEnvio: string | null; totalEnviados: number; totalAbertos: number; totalConvertidos: number
  destinatarios: number
}
interface ClienteLite { id: string; nome: string; telefone: string | null; riscoChurn: string }
interface NivelForm { nivel: string; pontosMinimos: string; beneficio: string; desconto: string }
interface NivelFid { nivel: string; pontosMinimos: number; beneficio: string; desconto: number; clientes: number }
interface RetencaoData {
  stats: { totalEmRisco: number; avgRisk: number; receitaEmRisco: number; taxaRetorno: number }
  clientesEmRisco: ClienteRisco[]; campanhas: Campanha[]; fidelidade: NivelFid[]
}

const statusStyle: Record<string, { bg: string; text: string; border: string; label: string }> = {
  RASCUNHO: { bg: "bg-surface-base", text: "text-base-secondary", border: "border-surface-border", label: "Rascunho" },
  ATIVA: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Ativa" },
  PAUSADA: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pausada" },
  CONCLUIDA: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Concluída" },
  CANCELADA: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", label: "Cancelada" },
}
const nivelGrad: Record<string, string> = {
  PRATA: "from-surface-border to-base-muted", OURO: "from-amber-400 to-yellow-500", PLATINA: "from-violet-400 to-purple-500",
}
const riscoStyle: Record<string, { bg: string; label: string }> = {
  CRITICO: { bg: "bg-purple-600", label: "Crítico" },
  ALTO: { bg: "bg-red-500", label: "Alto" },
  MEDIO: { bg: "bg-amber-500", label: "Médio" },
  BAIXO: { bg: "bg-yellow-400", label: "Baixo" },
}

export default function RetencaoPage() {
  const router = useRouter()
  const toast = useToast()
  const [data, setData] = useState<RetencaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState("risco")

  const [modalCampanha, setModalCampanha] = useState(false)
  const [campForm, setCampForm] = useState({ nome: "", canal: "WHATSAPP", mensagem: "" })
  const [saving, setSaving] = useState(false)

  const [campClientes, setCampClientes] = useState<string[]>([])
  const [clientesList, setClientesList] = useState<ClienteLite[]>([])
  const [clienteSearch, setClienteSearch] = useState("")

  const [editFid, setEditFid] = useState(false)
  const [fidForm, setFidForm] = useState<NivelForm[]>([])
  const [savingFid, setSavingFid] = useState(false)

  const [confirmDel, setConfirmDel] = useState<Campanha | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    fetch("/api/retencao")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const stats = data?.stats ?? { totalEmRisco: 0, avgRisk: 0, receitaEmRisco: 0, taxaRetorno: 0 }

  const abrirNovaCampanha = (preSelecionar?: string[]) => {
    setCampForm({ nome: "", canal: "WHATSAPP", mensagem: "" })
    setCampClientes(preSelecionar ?? [])
    setClienteSearch("")
    setModalCampanha(true)
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setClientesList(d.map((c: any) => ({ id: c.id, nome: c.nome, telefone: c.telefone, riscoChurn: c.riscoChurn })))
      })
      .catch(() => {})
  }

  const toggleCampCliente = (id: string) => {
    setCampClientes((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])
  }

  const criarCampanha = async () => {
    if (!campForm.nome.trim() || !campForm.mensagem.trim()) {
      toast.warning("Preencha nome e mensagem da campanha")
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/retencao/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campForm, clienteIds: campClientes }),
      })
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.error ?? "Erro ao criar") }
      toast.success(`Campanha criada${campClientes.length ? ` para ${campClientes.length} cliente(s)` : ""}`)
      setModalCampanha(false)
      setCampForm({ nome: "", canal: "WHATSAPP", mensagem: "" })
      setCampClientes([])
      load()
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar campanha")
    } finally { setSaving(false) }
  }

  const iniciarEdicaoFidelidade = () => {
    const niveisBase = ["PRATA", "OURO", "PLATINA"]
    setFidForm(niveisBase.map((nivel) => {
      const existente = data?.fidelidade.find((f) => f.nivel === nivel)
      return {
        nivel,
        pontosMinimos: String(existente?.pontosMinimos ?? (nivel === "PRATA" ? 0 : nivel === "OURO" ? 200 : 500)),
        beneficio: existente?.beneficio ?? "",
        desconto: existente?.desconto ? String(existente.desconto) : "",
      }
    }))
    setEditFid(true)
  }

  const salvarFidelidade = async () => {
    setSavingFid(true)
    try {
      const r = await fetch("/api/retencao/fidelidade", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niveis: fidForm.map((f) => ({
            nivel: f.nivel,
            pontosMinimos: Number(f.pontosMinimos) || 0,
            beneficio: f.beneficio,
            desconto: f.desconto === "" ? null : Number(f.desconto),
          })),
        }),
      })
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.error ?? "Erro ao salvar") }
      toast.success("Níveis de fidelidade atualizados")
      setEditFid(false)
      load()
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar níveis")
    } finally { setSavingFid(false) }
  }

  const mudarStatusCampanha = async (id: string, status: string) => {
    try {
      const r = await fetch("/api/retencao/campanhas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!r.ok) throw new Error()
      const labels: Record<string, string> = { ATIVA: "ativada", PAUSADA: "pausada", CONCLUIDA: "concluída", CANCELADA: "cancelada" }
      toast.success(`Campanha ${labels[status] ?? "atualizada"}`)
      load()
    } catch {
      toast.error("Erro ao atualizar campanha")
    }
  }

  const deletarCampanha = async () => {
    if (!confirmDel) return
    try {
      const r = await fetch(`/api/retencao/campanhas?id=${confirmDel.id}`, { method: "DELETE" })
      if (!r.ok) throw new Error()
      toast.success("Campanha excluída")
      setConfirmDel(null)
      load()
    } catch {
      toast.error("Erro ao excluir campanha")
      setConfirmDel(null)
    }
  }

  const enviarOferta = (cliente: ClienteRisco) => {
    const tel = cliente.telefone?.replace(/\D/g, "")
    if (!tel) {
      toast.warning("Cliente sem telefone cadastrado")
      return
    }
    const msg = encodeURIComponent(
      `Olá ${cliente.nome.split(" ")[0]}! Sentimos sua falta! 🤗 Que tal agendar um horário com a gente? Estamos com condições especiais para você.`
    )
    window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Central de Retenção</h1>
          <p className="text-xs text-base-muted">Monitoramento de churn e campanhas de reconquista</p>
        </div>
        <button onClick={() => abrirNovaCampanha()} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2 rounded-lg flex items-center gap-1.5">
          <Megaphone size={15} /> Nova campanha
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { icon: AlertTriangle, label: "Clientes em risco", value: String(stats.totalEmRisco), color: "text-red-500", bg: "bg-red-50" },
          { icon: Target, label: "Score médio", value: `${stats.avgRisk}%`, color: "text-amber-600", bg: "bg-amber-50" },
          { icon: DollarSign, label: "Receita em risco/mês", value: `R$ ${stats.receitaEmRisco.toLocaleString("pt-BR")}`, color: "text-red-500", bg: "bg-red-50" },
          { icon: Repeat, label: "Taxa de retorno", value: `${stats.taxaRetorno}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((k, i) => (
          <div key={i} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center`}><k.icon size={18} className={k.color} /></div>
              <div><p className={`text-xl font-bold ${k.color}`}>{loading ? "..." : k.value}</p><p className="text-xs text-base-muted">{k.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-surface-border overflow-x-auto">
        {[
          { key: "risco", label: "Clientes em risco", icon: AlertTriangle },
          { key: "campanhas", label: "Campanhas", icon: Megaphone },
          { key: "fidelidade", label: "Fidelidade", icon: Gift },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-accent-600 text-accent-600" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card rounded-2xl p-4 h-24 animate-pulse" />)}</div>}
      {error && !loading && (
        <div className="text-center py-12">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-base-secondary mb-3">Erro ao carregar dados de retenção</p>
          <button onClick={load} className="text-sm text-accent-600 hover:text-accent-700 font-medium">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && tab === "risco" && (
        <div className="space-y-3">
          {(data?.clientesEmRisco ?? []).length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-base-muted">{data?.clientesEmRisco.length} cliente(s) precisando de atenção</p>
              <button onClick={() => abrirNovaCampanha((data?.clientesEmRisco ?? []).map((c) => c.id))}
                className="text-xs font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Megaphone size={13} /> Criar campanha para os em risco
              </button>
            </div>
          )}
          <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto scroll-fade-y -mx-1 px-1">
          {(data?.clientesEmRisco ?? []).map((c) => {
            const risco = riscoStyle[c.riscoChurn] ?? riscoStyle.MEDIO
            return (
              <div key={c.id} className="glass-card rounded-2xl p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${risco.bg}`}>
                      {c.scoreChurn}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-base-primary">{c.nome}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-white ${risco.bg}`}>{risco.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-base-muted">Ausente: <span className="font-semibold text-red-500">{c.diasDesdeUltimaVisita ?? "?"} dias</span></span>
                        <span className="text-xs text-base-muted">Serviço: <span className="text-base-secondary">{c.ultimoServico}</span></span>
                        <span className="text-xs text-base-muted">Com: <span className="text-base-secondary">{c.profissional}</span></span>
                        <span className="text-xs text-base-muted">Ticket: <span className="font-semibold text-base-secondary">R$ {c.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => enviarOferta(c)} className="text-[11px] sm:text-xs font-medium text-white bg-accent-600 hover:bg-accent-700 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1"><Send size={12} /> <span className="hidden sm:inline">Enviar oferta</span><span className="sm:hidden">Oferta</span></button>
                    <button onClick={() => router.push(`/agenda`)} className="text-[11px] sm:text-xs font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1"><Calendar size={12} /> Agendar</button>
                  </div>
                </div>
                <div className="mt-3"><div className="w-full bg-surface-border-light rounded-full h-1.5"><div className={`h-1.5 rounded-full ${risco.bg}`} style={{ width: `${Math.min(c.scoreChurn, 100)}%` }} /></div></div>
              </div>
            )
          })}
          </div>
          {(data?.clientesEmRisco ?? []).length === 0 && <div className="text-center py-8 text-sm text-base-muted">Nenhum cliente em risco no momento</div>}
        </div>
      )}

      {!loading && !error && tab === "campanhas" && (
        <div className="space-y-4">
          {(data?.campanhas ?? []).length > 0 ? data?.campanhas.map((c) => {
            const s = statusStyle[c.status] ?? statusStyle.RASCUNHO
            return (
              <div key={c.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-base-primary">{c.nome}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-base-muted">Canal: {c.canal}</span>
                      {c.dataEnvio && <span className="text-xs text-base-muted">Enviada: {new Date(c.dataEnvio).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-center"><p className="text-base md:text-lg font-bold text-base-secondary">{c.destinatarios}</p><p className="text-[10px] text-base-muted">Destinatários</p></div>
                      <div className="text-center"><p className="text-base md:text-lg font-bold text-sky-600">{c.totalEnviados}</p><p className="text-[10px] text-base-muted">Enviados</p></div>
                      <div className="text-center"><p className="text-base md:text-lg font-bold text-emerald-600">{c.totalConvertidos}</p><p className="text-[10px] text-base-muted">Conversões</p></div>
                      <div className="text-center"><p className="text-base md:text-lg font-bold text-accent-700">{c.totalEnviados > 0 ? Math.round((c.totalConvertidos / c.totalEnviados) * 100) : 0}%</p><p className="text-[10px] text-base-muted">Taxa</p></div>
                    </div>
                    <div className="flex items-center gap-1 md:border-l md:border-surface-border-light md:pl-4">
                      {(c.status === "RASCUNHO" || c.status === "PAUSADA") && (
                        <button onClick={() => mudarStatusCampanha(c.id, "ATIVA")} title="Ativar" className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Play size={14} />
                        </button>
                      )}
                      {c.status === "ATIVA" && (
                        <button onClick={() => mudarStatusCampanha(c.id, "PAUSADA")} title="Pausar" className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-amber-600">
                          <Pause size={14} />
                        </button>
                      )}
                      {!["CONCLUIDA", "CANCELADA"].includes(c.status) && (
                        <button onClick={() => mudarStatusCampanha(c.id, "CANCELADA")} title="Cancelar" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500">
                          <XIcon size={14} />
                        </button>
                      )}
                      <button onClick={() => setConfirmDel(c)} title="Excluir" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-12">
              <Megaphone size={32} className="text-base-muted/60 mx-auto mb-3" />
              <p className="text-sm text-base-muted mb-3">Nenhuma campanha criada ainda</p>
              <button onClick={() => abrirNovaCampanha()} className="text-sm text-accent-600 hover:text-accent-700 font-medium">Criar primeira campanha</button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && tab === "fidelidade" && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center"><Award size={24} className="text-white" /></div>
              <div><h3 className="text-lg font-bold text-base-primary">Programa de Fidelidade</h3><p className="text-sm text-base-muted">Clientes acumulam 1 ponto por R$ 1 em atendimentos concluídos</p></div>
            </div>
            {!editFid && (
              <button onClick={iniciarEdicaoFidelidade}
                className="text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5 shrink-0">
                <Pencil size={14} /> Editar níveis
              </button>
            )}
          </div>

          {editFid ? (
            <div className="space-y-4">
              {fidForm.map((f, idx) => (
                <div key={f.nivel} className="border border-surface-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${nivelGrad[f.nivel] ?? nivelGrad.PRATA} flex items-center justify-center`}><Star size={15} className="text-white" /></div>
                    <span className="text-sm font-bold text-base-primary">{f.nivel.charAt(0) + f.nivel.slice(1).toLowerCase()}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Pontos mínimos" type="number" value={f.pontosMinimos}
                      onChange={(v) => setFidForm((prev) => prev.map((x, i) => i === idx ? { ...x, pontosMinimos: v } : x))} />
                    <Field label="Benefício" value={f.beneficio}
                      onChange={(v) => setFidForm((prev) => prev.map((x, i) => i === idx ? { ...x, beneficio: v } : x))} placeholder="Ex: 10% de desconto" />
                    <Field label="Desconto (%)" type="number" value={f.desconto}
                      onChange={(v) => setFidForm((prev) => prev.map((x, i) => i === idx ? { ...x, desconto: v } : x))} placeholder="opcional" />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setEditFid(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
                <button onClick={salvarFidelidade} disabled={savingFid}
                  className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg">
                  {savingFid ? "Salvando..." : "Salvar níveis"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(data?.fidelidade ?? []).map((l, i) => (
                <div key={i} className="border border-surface-border rounded-xl p-5 hover:shadow-card-hover transition-shadow">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${nivelGrad[l.nivel] ?? nivelGrad.PRATA} flex items-center justify-center mb-3`}><Star size={18} className="text-white" /></div>
                  <p className="text-sm font-bold text-base-primary">{l.nivel.charAt(0) + l.nivel.slice(1).toLowerCase()}</p>
                  <p className="text-xs text-base-muted mt-0.5">A partir de {l.pontosMinimos} pontos</p>
                  <p className="text-xs text-accent-600 font-medium mt-2">{l.beneficio}</p>
                  {l.desconto > 0 && <p className="text-xs text-base-secondary mt-1">{l.desconto}% de desconto</p>}
                  <div className="mt-3 pt-3 border-t border-surface-border-light">
                    <p className="text-lg font-bold text-accent-700">{l.clientes}</p>
                    <p className="text-[10px] text-base-muted">clientes neste nível</p>
                  </div>
                </div>
              ))}
              {(data?.fidelidade ?? []).length === 0 && (
                <div className="col-span-3 text-center py-8 text-sm text-base-muted">Nenhum nível de fidelidade configurado. Clique em "Editar níveis" para começar.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal nova campanha */}
      <Modal open={modalCampanha} onClose={() => setModalCampanha(false)} title="Nova Campanha">
        <div className="space-y-4">
          <Field label="Nome da campanha" value={campForm.nome} onChange={(v) => setCampForm({ ...campForm, nome: v })} placeholder="Ex: Volta para nós!" required />
          <SelectField label="Canal" value={campForm.canal} onChange={(v) => setCampForm({ ...campForm, canal: v })} options={[
            { value: "WHATSAPP", label: "WhatsApp" },
            { value: "EMAIL", label: "E-mail" },
            { value: "SMS", label: "SMS" },
          ]} required />
          <TextAreaField label="Mensagem" value={campForm.mensagem} onChange={(v) => setCampForm({ ...campForm, mensagem: v })} placeholder="Olá {nome}! Sentimos sua falta..." rows={4} />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-base-secondary">
                Destinatários {campClientes.length > 0 && <span className="text-accent-600">({campClientes.length} selecionado{campClientes.length > 1 ? "s" : ""})</span>}
              </label>
              {(data?.clientesEmRisco ?? []).length > 0 && (
                <button type="button" onClick={() => setCampClientes((data?.clientesEmRisco ?? []).map((c) => c.id))}
                  className="text-[11px] text-accent-600 hover:text-accent-700 font-medium">Selecionar todos em risco</button>
              )}
            </div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-muted/60" />
              <input value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} placeholder="Buscar cliente..."
                className="w-full pl-8 pr-3 py-2 border border-surface-border rounded-lg text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
            </div>
            <div className="border border-surface-border rounded-lg max-h-[200px] overflow-y-auto scroll-fade-y divide-y divide-surface-border-light">
              {(() => {
                const filtrados = clientesList.filter((c) => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()))
                if (filtrados.length === 0) return <p className="text-xs text-base-muted text-center py-4">Nenhum cliente encontrado</p>
                return filtrados.map((c) => {
                  const sel = campClientes.includes(c.id)
                  const emRisco = ["CRITICO", "ALTO", "MEDIO"].includes(c.riscoChurn)
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCampCliente(c.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-base transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-accent-500 border-accent-500" : "border-surface-border"}`}>
                        {sel && <Check size={11} className="text-white" />}
                      </div>
                      <span className="text-sm text-base-primary flex-1 truncate">{c.nome}</span>
                      {emRisco && <span className="text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">em risco</span>}
                    </button>
                  )
                })
              })()}
            </div>
            <p className="text-[10px] text-base-muted mt-1">Sem destinatários, a campanha fica como rascunho para você definir depois.</p>
          </div>

          <ModalActions onCancel={() => setModalCampanha(false)} onSave={criarCampanha} saving={saving} saveLabel="Criar campanha" />
        </div>
      </Modal>

      {/* Confirm delete campanha */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={deletarCampanha}
        title="Excluir campanha"
        message={`Tem certeza que deseja excluir a campanha "${confirmDel?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}
