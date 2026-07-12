"use client"

import { useState, useEffect } from "react"
import {
  Building2, Scissors, Clock, BellRing, CreditCard, Shield, Globe,
  Plus, MoreVertical, Check, Palette, Sun, Moon, Link2, Copy, ExternalLink, Share2,
  Pencil, Trash2
} from "lucide-react"
import { Modal, Field, SelectField, MaskedField, ModalActions, ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { useTheme, palettes } from "@/components/ui/theme-provider"

interface Servico { id: string; nome: string; categoria: string | null; duracaoMinutos: number; preco: number }
interface Horario { dia: string; diaSemana: number; ativo: boolean; abertura: string; fechamento: string }
interface Membro { id: string; nome: string; email: string; role: string; tipo: string }
interface Assinatura { plano: string; status: string; valorMensal: number; dataRenovacao: string | null }
interface Estabelecimento {
  id: string; nome: string; cnpj: string | null; telefone: string | null
  email: string; endereco: string | null; cidade: string | null; estado: string | null; tipoNegocio: string
}
interface ConfigData { estabelecimento: Estabelecimento; assinatura: Assinatura | null; servicos: Servico[]; horarios: Horario[]; equipe: Membro[] }

const sections = [
  { key: "negocio", label: "Meu Negócio", icon: Building2 },
  { key: "aparencia", label: "Aparência", icon: Palette },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "horarios", label: "Horários", icon: Clock },
  { key: "notificacoes", label: "Notificações", icon: BellRing },
  { key: "assinatura", label: "Plano e Assinatura", icon: CreditCard },
  { key: "equipe", label: "Equipe e Permissões", icon: Shield },
  { key: "integracoes", label: "Integrações", icon: Globe },
  { key: "portal", label: "Portal do Cliente", icon: Link2 },
]

export default function ConfiguracoesPage() {
  const [data, setData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("negocio")
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ confirmacao: true, lembrete: true, noshow: true, marketing: false, relatorios: true })
  const [modalServico, setModalServico] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState("")
  const [novoServico, setNovoServico] = useState({ nome: "", categoria: "", duracaoMinutos: "60", preco: "" })
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [savingHorarios, setSavingHorarios] = useState(false)
  const [negocio, setNegocio] = useState({ nome: "", cnpj: "", telefone: "", email: "", endereco: "", cidade: "", estado: "", cep: "" })
  const [savingNegocio, setSavingNegocio] = useState(false)
  const [editServico, setEditServico] = useState<Servico | null>(null)
  const [menuServicoId, setMenuServicoId] = useState<string | null>(null)
  const [confirmDelServico, setConfirmDelServico] = useState<{ id: string; nome: string } | null>(null)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const { toast } = useToast()
  const theme = useTheme()

  useEffect(() => {
    fetch("/api/configuracoes").then((r) => r.json()).then((d) => {
      setData(d)
      setHorarios(d.horarios ?? [])
      if (d.estabelecimento) {
        const e = d.estabelecimento
        setNegocio({ nome: e.nome ?? "", cnpj: e.cnpj ?? "", telefone: e.telefone ?? "", email: e.email ?? "", endereco: e.endereco ?? "", cidade: e.cidade ?? "", estado: e.estado ?? "", cep: e.cep ?? "" })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const saveNegocio = async () => {
    setSavingNegocio(true)
    try {
      const res = await fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estabelecimento: negocio }) })
      if (res.ok) toast("Dados salvos com sucesso")
      else toast("Erro ao salvar", "error")
    } catch { toast("Erro ao salvar", "error") }
    setSavingNegocio(false)
  }

  const deleteServico = async (id: string) => {
    try {
      const res = await fetch(`/api/servicos?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setData((prev) => prev ? { ...prev, servicos: prev.servicos.filter((s) => s.id !== id) } : prev)
        toast("Serviço removido")
      } else toast("Erro ao remover", "error")
    } catch { toast("Erro ao remover", "error") }
    setConfirmDelServico(null)
  }

  const updateServico = async () => {
    if (!editServico) return
    setSaving(true)
    try {
      const res = await fetch(`/api/servicos?id=${editServico.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editServico.nome, categoria: editServico.categoria, duracaoMinutos: editServico.duracaoMinutos, preco: editServico.preco }),
      })
      if (res.ok) {
        setData((prev) => prev ? { ...prev, servicos: prev.servicos.map((s) => s.id === editServico.id ? editServico : s) } : prev)
        setEditServico(null)
        toast("Serviço atualizado")
      } else toast("Erro ao atualizar", "error")
    } catch { toast("Erro ao atualizar", "error") }
    setSaving(false)
  }

  const est = data?.estabelecimento
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`w-11 h-6 rounded-full transition-colors ${on ? "bg-accent-500" : "bg-surface-border"} relative`}>
      <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Configurações</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-1.5 md:p-2 flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {sections.map((s) => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 lg:shrink lg:w-full ${activeSection === s.key ? "bg-accent-50 text-accent-700 font-semibold" : "text-base-secondary hover:bg-surface-base"}`}>
                <s.icon size={16} className={activeSection === s.key ? "text-accent-600" : ""} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {loading && <div className="glass-card rounded-2xl p-6 h-64 animate-pulse" />}

          {!loading && activeSection === "negocio" && est && (
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-base-primary">Dados do Negócio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-base-secondary mb-1.5 block">Nome</label>
                  <input type="text" value={negocio.nome} onChange={(e) => setNegocio({ ...negocio, nome: e.target.value })} className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
                </div>
                <MaskedField label="CNPJ" value={negocio.cnpj} onChange={(v) => setNegocio({ ...negocio, cnpj: v })} mask="cnpj" />
                <MaskedField label="Telefone" value={negocio.telefone} onChange={(v) => setNegocio({ ...negocio, telefone: v })} mask="telefone" />
                <div>
                  <label className="text-xs font-medium text-base-secondary mb-1.5 block">E-mail</label>
                  <input type="email" value={negocio.email} onChange={(e) => setNegocio({ ...negocio, email: e.target.value })} className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-base-secondary mb-1.5 block">Endereço</label>
                  <input type="text" value={negocio.endereco} onChange={(e) => setNegocio({ ...negocio, endereco: e.target.value })} className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-medium text-base-secondary mb-1.5 block">Cidade</label>
                    <input type="text" value={negocio.cidade} onChange={(e) => setNegocio({ ...negocio, cidade: e.target.value })} className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-base-secondary mb-1.5 block">UF</label>
                    <input type="text" value={negocio.estado} onChange={(e) => setNegocio({ ...negocio, estado: e.target.value.toUpperCase() })} maxLength={2} className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50 uppercase" />
                  </div>
                  <MaskedField label="CEP" value={negocio.cep} onChange={(v) => setNegocio({ ...negocio, cep: v })} mask="cep" />
                </div>
              </div>
              <button disabled={savingNegocio} onClick={saveNegocio} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors">
                {savingNegocio ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          )}

          {!loading && activeSection === "aparencia" && (
            <div className="glass-card rounded-2xl p-6 space-y-8">
              <div>
                <h2 className="text-base font-bold text-base-primary">Aparência</h2>
                <p className="text-xs text-base-muted mt-1">Personalize as cores e o modo de exibição da interface</p>
              </div>

              {/* Modo */}
              <div>
                <h3 className="text-sm font-semibold text-accent-700 mb-3">Modo de exibição</h3>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button onClick={() => theme.setMode("claro")}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme.mode === "claro" ? "border-accent-400 bg-accent-50" : "border-surface-border hover:border-surface-border"}`}>
                    <div className="w-full h-20 rounded-lg glass-card relative overflow-hidden">
                      <div className="h-3 bg-surface-border-light border-b border-surface-border" />
                      <div className="flex h-[calc(100%-12px)]">
                        <div className="w-5 bg-surface-card/40 backdrop-blur-2xl border-r border-surface-border/40" />
                        <div className="flex-1 bg-surface-base p-1">
                          <div className="h-2 w-8 bg-surface-border rounded mb-1" />
                          <div className="h-2 w-12 bg-surface-border-light rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sun size={14} className={theme.mode === "claro" ? "text-accent-600" : "text-base-muted"} />
                      <span className={`text-xs font-medium ${theme.mode === "claro" ? "text-accent-700" : "text-base-secondary"}`}>Claro</span>
                    </div>
                  </button>
                  <button onClick={() => theme.setMode("escuro")}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme.mode === "escuro" ? "border-accent-400 bg-accent-50" : "border-surface-border hover:border-surface-border"}`}>
                    <div className="w-full h-20 rounded-lg bg-accent-800 border border-accent-700 relative overflow-hidden">
                      <div className="h-3 bg-accent-800 border-b border-accent-700" />
                      <div className="flex h-[calc(100%-12px)]">
                        <div className="w-5 bg-accent-800 border-r border-accent-700" />
                        <div className="flex-1 bg-accent-800 p-1">
                          <div className="h-2 w-8 bg-accent-700 rounded mb-1" />
                          <div className="h-2 w-12 bg-accent-800 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Moon size={14} className={theme.mode === "escuro" ? "text-accent-600" : "text-base-muted"} />
                      <span className={`text-xs font-medium ${theme.mode === "escuro" ? "text-accent-700" : "text-base-secondary"}`}>Escuro</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Paleta */}
              <div>
                <h3 className="text-sm font-semibold text-accent-700 mb-3">Paleta de cores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {palettes.map((p) => (
                    <button key={p.key} onClick={() => theme.setPalette(p.key)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${theme.palette === p.key ? "border-accent-400 bg-accent-50" : "border-surface-border hover:border-surface-border"}`}>
                      <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: `linear-gradient(135deg, ${p.preview}, ${p.preview}dd)` }} />
                      <div>
                        <p className={`text-sm font-semibold ${theme.palette === p.key ? "text-accent-700" : "text-accent-700"}`}>{p.label}</p>
                        <div className="flex gap-1 mt-1.5">
                          {[p.preview, `${p.preview}bb`, `${p.preview}77`, `${p.preview}33`].map((c, i) => (
                            <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      {theme.palette === p.key && (
                        <div className="ml-auto w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-semibold text-accent-700 mb-3">Pré-visualização</h3>
                <div className="border border-surface-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center">
                      <Scissors size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-base-primary">Nome do Estabelecimento</p>
                      <p className="text-xs text-base-muted">Exemplo de como ficará a interface</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2 rounded-lg transition-colors">Botão primário</button>
                    <button className="text-xs font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 px-4 py-2 rounded-lg transition-colors">Botão secundário</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-50 text-accent-700 border border-accent-100">Badge ativo</span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-100 text-accent-700">Destaque</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeSection === "servicos" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-base-primary">Serviços cadastrados</h2>
                <button onClick={() => { setNovoServico({ nome: "", categoria: "", duracaoMinutos: "60", preco: "" }); setErro(""); setModalServico(true) }} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2 rounded-lg flex items-center gap-1.5"><Plus size={15} /> Novo serviço</button>
              </div>
              {(data?.servicos ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-border-light hover:border-surface-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center"><Scissors size={14} className="text-accent-600" /></div>
                    <div>
                      <p className="text-sm font-medium text-base-primary">{s.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-base-muted flex items-center gap-0.5"><Clock size={10} /> {s.duracaoMinutos}min</span>
                        {s.categoria && <><span className="text-[10px] text-base-muted/60">•</span><span className="text-xs text-base-muted">{s.categoria}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-accent-700">R$ {s.preco.toFixed(0)}</span>
                    <div className="relative">
                      <button onClick={() => setMenuServicoId(menuServicoId === s.id ? null : s.id)} className="text-base-muted/60 hover:text-base-secondary"><MoreVertical size={16} /></button>
                      {menuServicoId === s.id && (
                        <div className="absolute right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-10 py-1 w-36">
                          <button onClick={() => { setEditServico(s); setMenuServicoId(null) }} className="w-full text-left px-3 py-2 text-sm text-base-secondary hover:bg-surface-base flex items-center gap-2"><Pencil size={13} /> Editar</button>
                          <button onClick={() => { setConfirmDelServico({ id: s.id, nome: s.nome }); setMenuServicoId(null) }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={13} /> Remover</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && activeSection === "horarios" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-base-primary">Horário de funcionamento</h2>
              {horarios.map((d, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 rounded-lg border ${d.ativo ? "border-surface-border-light" : "border-surface-border-light opacity-50"}`}>
                  <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-32">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${d.ativo ? "bg-emerald-500" : "bg-base-muted/60"}`} />
                      <span className="text-sm font-medium text-accent-700">{d.dia}</span>
                    </div>
                    <div className="sm:hidden">
                      <Toggle on={d.ativo} onClick={() => { const h = [...horarios]; h[i] = { ...h[i], ativo: !h[i].ativo, abertura: h[i].abertura === "—" ? "08:00" : h[i].abertura, fechamento: h[i].fechamento === "—" ? "18:00" : h[i].fechamento }; setHorarios(h) }} />
                    </div>
                  </div>
                  {d.ativo ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={d.abertura} onChange={(e) => { const h = [...horarios]; h[i] = { ...h[i], abertura: e.target.value }; setHorarios(h) }}
                        className="w-24 px-2 py-1.5 border border-surface-border rounded-md text-xs text-center text-base-secondary focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                      <span className="text-xs text-base-muted">às</span>
                      <input type="time" value={d.fechamento} onChange={(e) => { const h = [...horarios]; h[i] = { ...h[i], fechamento: e.target.value }; setHorarios(h) }}
                        className="w-24 px-2 py-1.5 border border-surface-border rounded-md text-xs text-center text-base-secondary focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                    </div>
                  ) : <span className="text-xs text-base-muted">Fechado</span>}
                  <div className="hidden sm:block">
                    <Toggle on={d.ativo} onClick={() => { const h = [...horarios]; h[i] = { ...h[i], ativo: !h[i].ativo, abertura: h[i].abertura === "—" ? "08:00" : h[i].abertura, fechamento: h[i].fechamento === "—" ? "18:00" : h[i].fechamento }; setHorarios(h) }} />
                  </div>
                </div>
              ))}
              <button disabled={savingHorarios} onClick={async () => {
                setSavingHorarios(true)
                try {
                  const res = await fetch("/api/configuracoes", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ horarios: horarios.map((h) => ({ diaSemana: h.diaSemana, ativo: h.ativo, abertura: h.abertura, fechamento: h.fechamento })) }),
                  })
                  if (res.ok) toast("Horários salvos com sucesso")
                  else toast("Erro ao salvar horários", "error")
                } catch { toast("Erro ao salvar horários", "error") }
                setSavingHorarios(false)
              }} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors mt-2">
                {savingHorarios ? "Salvando..." : "Salvar horários"}
              </button>
            </div>
          )}

          {!loading && activeSection === "notificacoes" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-base-primary">Preferências de notificação</h2>
              {[
                { key: "confirmacao", label: "Confirmação de agendamento", desc: "Enviada ao cliente quando agendar" },
                { key: "lembrete", label: "Lembrete 24h antes", desc: "Reduz no-shows em até 30%" },
                { key: "noshow", label: "Alerta de no-show", desc: "Notifica o profissional quando cliente não comparece" },
                { key: "marketing", label: "Campanhas de marketing", desc: "Ofertas automáticas baseadas em comportamento" },
                { key: "relatorios", label: "Relatório semanal", desc: "Resumo de desempenho enviado por e-mail" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between p-4 rounded-lg border border-surface-border-light">
                  <div><p className="text-sm font-medium text-accent-700">{n.label}</p><p className="text-xs text-base-muted mt-0.5">{n.desc}</p></div>
                  <Toggle on={notifs[n.key]} onClick={() => setNotifs({ ...notifs, [n.key]: !notifs[n.key] })} />
                </div>
              ))}
              <button disabled={savingNotifs} onClick={async () => {
                setSavingNotifs(true)
                try {
                  localStorage.setItem("notif-prefs", JSON.stringify(notifs))
                  toast("Preferências salvas com sucesso")
                } catch { toast("Erro ao salvar", "error") }
                setSavingNotifs(false)
              }} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors mt-2">
                {savingNotifs ? "Salvando..." : "Salvar preferências"}
              </button>
            </div>
          )}

          {!loading && activeSection === "assinatura" && data?.assinatura && (
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-base-primary">Plano atual</h2>
              <div className="p-5 bg-gradient-to-r from-accent-50 to-accent-100/30 border border-accent-100 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-base-primary">Plano {data.assinatura.plano}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-100 text-accent-700">{data.assinatura.status}</span>
                    </div>
                    {data.assinatura.dataRenovacao && (
                      <p className="text-xs text-accent-500 mt-2">Próxima cobrança: {new Date(data.assinatura.dataRenovacao).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-base-primary">R$ {data.assinatura.valorMensal}</p>
                    <p className="text-xs text-accent-500">/mês</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-base-secondary mb-3">Quer mais recursos?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: "Studio", price: "R$ 397", desc: "Até 8 profissionais • IA proativa • Retenção avançada" },
                    { name: "Clínica", price: "R$ 597", desc: "Ilimitado • Multi-unidade • Anamnese • Integrações premium" },
                  ].map((p, i) => (
                    <div key={i} className="border border-surface-border rounded-xl p-4">
                      <p className="text-sm font-bold text-base-primary">{p.name}</p>
                      <p className="text-xl font-bold text-base-primary mt-1">{p.price}<span className="text-xs font-normal text-base-muted">/mês</span></p>
                      <p className="text-xs text-base-muted mt-2">{p.desc}</p>
                      <button onClick={() => toast("Entre em contato com o suporte para alterar seu plano")} className="w-full mt-3 text-sm font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 py-2 rounded-lg">Fazer upgrade</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && activeSection === "equipe" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-base-primary">Equipe e permissões</h2>
                <button onClick={() => toast("Convite por e-mail será disponibilizado em breve")} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2 rounded-lg flex items-center gap-1.5"><Plus size={15} /> Convidar</button>
              </div>
              {(data?.equipe ?? []).map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border-light">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-base-secondary to-accent-800 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{u.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-accent-700">{u.nome}</p>
                      <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border shrink-0 ${u.role === "Administrador" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-surface-base text-base-secondary border-surface-border"}`}>{u.role}</span>
                    </div>
                    <p className="text-xs text-base-muted truncate">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && activeSection === "integracoes" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-base-primary">Integrações disponíveis</h2>
              {[
                { name: "WhatsApp (Evolution API)", desc: "Notificações automáticas e campanhas", status: "conectado", color: "bg-green-500" },
                { name: "Google Calendar", desc: "Sincronize com a agenda do profissional", status: "disponivel", color: "bg-blue-500" },
                { name: "Conta Azul", desc: "Gestão financeira e contábil integrada", status: "disponivel", color: "bg-indigo-500" },
                { name: "Instagram", desc: "Link de agendamento direto no perfil", status: "em breve", color: "bg-pink-500" },
              ].map((int, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-surface-border-light">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${int.color} flex items-center justify-center`}><Globe size={16} className="text-white" /></div>
                    <div><p className="text-sm font-medium text-accent-700">{int.name}</p><p className="text-xs text-base-muted">{int.desc}</p></div>
                  </div>
                  {int.status === "conectado" && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><Check size={10} /> Conectado</span>}
                  {int.status === "disponivel" && <button onClick={() => toast("Integração em desenvolvimento. Em breve estará disponível!")} className="text-xs font-medium text-accent-600 border border-accent-100 hover:bg-accent-50 px-3 py-1.5 rounded-lg">Conectar</button>}
                  {int.status === "em breve" && <span className="text-xs text-base-muted italic">Em breve</span>}
                </div>
              ))}
            </div>
          )}

          {!loading && activeSection === "portal" && (() => {
            const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/login` : "/portal/login"
            return (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-base-primary">Portal do Cliente</h2>
                    <p className="text-xs text-base-muted mt-1">Compartilhe o link do portal para que seus clientes possam agendar online</p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-accent-50 to-accent-100/30 border border-accent-100 rounded-xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-accent-600 shrink-0" />
                      <span className="text-sm font-semibold text-base-primary">Link de agendamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-surface-card/60 border border-accent-100 rounded-lg px-3 py-2.5">
                        <p className="text-sm text-base-secondary truncate">{portalUrl}</p>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(portalUrl); toast("Link copiado!") }}
                        className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2.5 rounded-lg transition-colors">
                        <Copy size={14} /> <span className="hidden sm:inline">Copiar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-accent-700 mb-3">Compartilhar via</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const msg = encodeURIComponent(`Olá! Agende seu horário pelo nosso portal: ${portalUrl}`)
                          window.open(`https://wa.me/?text=${msg}`, "_blank")
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl border border-surface-border hover:border-green-300 hover:bg-green-50 transition-all text-left">
                        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                          <Share2 size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-accent-700">WhatsApp</p>
                          <p className="text-xs text-base-muted">Envie para seus clientes</p>
                        </div>
                      </button>
                      <button
                        onClick={() => window.open(portalUrl, "_blank")}
                        className="flex items-center gap-3 p-4 rounded-xl border border-surface-border hover:border-accent-400/50 hover:bg-accent-50 transition-all text-left">
                        <div className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center shrink-0">
                          <ExternalLink size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-accent-700">Abrir portal</p>
                          <p className="text-xs text-base-muted">Visualize como o cliente vê</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-accent-700">Como funciona</h3>
                  <div className="space-y-3">
                    {[
                      { step: "1", title: "Compartilhe o link", desc: "Envie o link do portal via WhatsApp, redes sociais ou e-mail" },
                      { step: "2", title: "Cliente cria uma conta", desc: "O cliente se cadastra com nome, e-mail e senha" },
                      { step: "3", title: "Agendamento online", desc: "O cliente escolhe profissional, serviços, data e horário" },
                      { step: "4", title: "Aparece na sua agenda", desc: "O agendamento é criado automaticamente na sua agenda" },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-accent-700">{item.step}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-accent-700">{item.title}</p>
                          <p className="text-xs text-base-muted mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      <Modal open={modalServico} onClose={() => setModalServico(false)} title="Novo serviço">
        <div className="space-y-4">
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</div>}
          <Field label="Nome do serviço" value={novoServico.nome} onChange={(v) => setNovoServico({ ...novoServico, nome: v })} placeholder="Ex: Corte masculino" required />
          <SelectField label="Categoria" value={novoServico.categoria} onChange={(v) => setNovoServico({ ...novoServico, categoria: v })} options={[
            { value: "Cabelo", label: "Cabelo" },
            { value: "Barba", label: "Barba" },
            { value: "Coloração", label: "Coloração" },
            { value: "Tratamento", label: "Tratamento" },
            { value: "Estética", label: "Estética" },
            { value: "Unhas", label: "Unhas" },
            { value: "Maquiagem", label: "Maquiagem" },
            { value: "Depilação", label: "Depilação" },
            { value: "Combo", label: "Combo" },
            { value: "Outro", label: "Outro" },
          ]} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duração (minutos)" value={novoServico.duracaoMinutos} onChange={(v) => setNovoServico({ ...novoServico, duracaoMinutos: v })} type="number" placeholder="60" required />
            <Field label="Preço (R$)" value={novoServico.preco} onChange={(v) => setNovoServico({ ...novoServico, preco: v })} type="number" placeholder="0,00" required />
          </div>
          <ModalActions onCancel={() => setModalServico(false)} saving={saving} saveLabel="Criar serviço" onSave={async () => {
            if (!novoServico.nome.trim() || !novoServico.preco) { setErro("Preencha nome e preço"); return }
            setSaving(true); setErro("")
            try {
              const res = await fetch("/api/servicos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoServico),
              })
              if (!res.ok) { const d = await res.json(); setErro(d.error || "Erro ao criar serviço"); setSaving(false); return }
              const criado = await res.json()
              setData((prev) => prev ? { ...prev, servicos: [...prev.servicos, { id: criado.id, nome: criado.nome, categoria: criado.categoria, duracaoMinutos: criado.duracaoMinutos, preco: criado.preco }] } : prev)
              setModalServico(false)
              toast("Serviço criado com sucesso")
            } catch { setErro("Erro de conexão") }
            setSaving(false)
          }} />
        </div>
      </Modal>

      {editServico && (
        <Modal open={!!editServico} onClose={() => setEditServico(null)} title="Editar serviço">
          <div className="space-y-4">
            <Field label="Nome do serviço" value={editServico.nome} onChange={(v) => setEditServico({ ...editServico, nome: v })} required />
            <SelectField label="Categoria" value={editServico.categoria ?? ""} onChange={(v) => setEditServico({ ...editServico, categoria: v })} options={[
              { value: "Cabelo", label: "Cabelo" }, { value: "Barba", label: "Barba" }, { value: "Coloração", label: "Coloração" },
              { value: "Tratamento", label: "Tratamento" }, { value: "Estética", label: "Estética" }, { value: "Unhas", label: "Unhas" },
              { value: "Maquiagem", label: "Maquiagem" }, { value: "Depilação", label: "Depilação" }, { value: "Combo", label: "Combo" }, { value: "Outro", label: "Outro" },
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duração (min)" value={String(editServico.duracaoMinutos)} onChange={(v) => setEditServico({ ...editServico, duracaoMinutos: Number(v) })} type="number" required />
              <Field label="Preço (R$)" value={String(editServico.preco)} onChange={(v) => setEditServico({ ...editServico, preco: Number(v) })} type="number" required />
            </div>
            <ModalActions onCancel={() => setEditServico(null)} saving={saving} saveLabel="Salvar" onSave={updateServico} />
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelServico}
        title="Remover serviço"
        message={`Deseja realmente remover "${confirmDelServico?.nome}"? Esta ação não pode ser desfeita.`}
        onClose={() => setConfirmDelServico(null)}
        onConfirm={() => confirmDelServico && deleteServico(confirmDelServico.id)}
      />
    </div>
  )
}
