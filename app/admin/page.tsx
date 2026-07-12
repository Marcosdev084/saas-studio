"use client"

import { useState, useEffect } from "react"
import { useUser } from "@auth0/nextjs-auth0/client"
import {
  Building2, Users, Plus, Edit, Trash2, X, Check, Search,
  Shield, ChevronRight, LogOut, Scissors, Eye, ArrowLeft,
  CreditCard, RefreshCw
} from "lucide-react"

// ── Types ───────────────────────────────────────────────────────

interface Estabelecimento {
  id: string; nome: string; cnpj: string | null; email: string; telefone: string | null
  cidade: string | null; estado: string | null; tipoNegocio: string; ativo: boolean
  criadoEm: string; plano: string; statusPlano: string; valorMensal: number
  totalProfissionais: number; totalClientes: number; totalUsuarios: number
}

interface Usuario {
  id: string; nome: string; email: string; telefone: string | null; permissao: string
  ativo: boolean; criadoEm: string; estabelecimento: string; estabelecimentoId: string
  auth0Vinculado: boolean
}

// ── Helpers ─────────────────────────────────────────────────────

const planoColors: Record<string, string> = {
  STARTER: "bg-surface-border-light text-base-primary border-surface-border",
  PRO: "bg-accent-50 text-accent-700 border-accent-100",
  STUDIO: "bg-violet-50 text-violet-700 border-violet-200",
  CLINICA: "bg-amber-50 text-amber-700 border-amber-200",
}

const planoPrecos: Record<string, number> = { STARTER: 97, PRO: 197, STUDIO: 397, CLINICA: 597 }

const tipoLabels: Record<string, string> = {
  SALAO_BELEZA: "Salão de Beleza", BARBEARIA: "Barbearia",
  CLINICA_ESTETICA: "Clínica Estética", CLINICA_ODONTO: "Clínica Odonto",
  ESPACO_BELEZA: "Espaço de Beleza", OUTRO: "Outro",
}

// ── Modal Component ─────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative glass-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-border-light">
          <h2 className="text-base font-bold text-base-primary">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">{label} {required && <span className="text-red-400">*</span>}</label>
      <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-primary focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400" />
    </div>
  )
}

function maskTel(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function MaskedField({ label, value, onChange, mask, placeholder }: { label: string; value: string; onChange: (v: string) => void; mask: "telefone" | "cnpj"; placeholder?: string }) {
  const fn = mask === "cnpj" ? maskCnpj : maskTel
  const ph = placeholder ?? (mask === "cnpj" ? "00.000.000/0000-00" : "(00) 00000-0000")
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(fn(e.target.value))} placeholder={ph}
        className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-primary focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400" />
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useUser()
  const [tab, setTab] = useState<"estabelecimentos" | "usuarios">("estabelecimentos")
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Estabelecimento form
  const [form, setForm] = useState({
    nome: "", cnpj: "", email: "", telefone: "", endereco: "", cidade: "", estado: "",
    cep: "", tipoNegocio: "SALAO_BELEZA", plano: "PRO", adminNome: "", adminEmail: "",
  })

  // Usuario form
  const [userForm, setUserForm] = useState({
    estabelecimentoId: "", nome: "", email: "", telefone: "", permissao: "PROFISSIONAL",
  })
  const [showUserModal, setShowUserModal] = useState(false)

  // ── Loaders ──

  const loadEstabelecimentos = () => {
    fetch("/api/admin/estabelecimentos").then((r) => r.json()).then(setEstabelecimentos).finally(() => setLoading(false))
  }
  const loadUsuarios = () => {
    fetch("/api/admin/usuarios").then((r) => r.json()).then(setUsuarios)
  }

  useEffect(() => { loadEstabelecimentos(); loadUsuarios() }, [])

  // ── Estabelecimento CRUD ──

  const openCreateEstab = () => {
    setForm({ nome: "", cnpj: "", email: "", telefone: "", endereco: "", cidade: "", estado: "", cep: "", tipoNegocio: "SALAO_BELEZA", plano: "PRO", adminNome: "", adminEmail: "" })
    setModalMode("create"); setEditId(null); setShowModal(true)
  }

  const openEditEstab = (e: Estabelecimento) => {
    setForm({ nome: e.nome, cnpj: e.cnpj ?? "", email: e.email, telefone: e.telefone ?? "", endereco: "", cidade: e.cidade ?? "", estado: e.estado ?? "", cep: "", tipoNegocio: e.tipoNegocio, plano: e.plano, adminNome: "", adminEmail: "" })
    setModalMode("edit"); setEditId(e.id); setShowModal(true)
  }

  const saveEstab = async () => {
    setSaving(true)
    try {
      if (modalMode === "create") {
        const res = await fetch("/api/admin/estabelecimentos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, valorMensal: planoPrecos[form.plano] }),
        })
        if (!res.ok) { const err = await res.json(); alert(err.error); setSaving(false); return }
      } else {
        await fetch(`/api/admin/estabelecimentos/${editId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, valorMensal: planoPrecos[form.plano] }),
        })
      }
      setShowModal(false); loadEstabelecimentos(); loadUsuarios()
    } catch (e) { alert("Erro ao salvar") }
    setSaving(false)
  }

  const deactivateEstab = async (id: string, nome: string) => {
    if (!confirm(`Desativar o estabelecimento "${nome}"? Ele não será deletado, apenas desativado.`)) return
    await fetch(`/api/admin/estabelecimentos/${id}`, { method: "DELETE" })
    loadEstabelecimentos()
  }

  // ── Usuario CRUD ──

  const openCreateUser = (estabId?: string) => {
    setUserForm({ estabelecimentoId: estabId ?? "", nome: "", email: "", telefone: "", permissao: "PROFISSIONAL" })
    setShowUserModal(true)
  }

  const saveUser = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error); setSaving(false); return }
      setShowUserModal(false); loadUsuarios()
    } catch (e) { alert("Erro ao salvar") }
    setSaving(false)
  }

  const deactivateUser = async (id: string, nome: string) => {
    if (!confirm(`Desativar o usuário "${nome}"?`)) return
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: false }),
    })
    loadUsuarios()
  }

  // ── Filters ──

  const filteredEstabs = estabelecimentos.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  )
  const filteredUsers = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.estabelecimento.toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ──

  return (
    <div className="min-h-screen app-ambient">
      {/* Header */}
      <header className="bg-surface-card/70 backdrop-blur-2xl border-b border-surface-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-800 to-accent-800 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-base-primary">Painel Administrativo</h1>
              <p className="text-[10px] text-base-muted">SaaS Studio — Gestão interna</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
              <ArrowLeft size={14} /> Voltar ao app
            </a>
            <a href="/api/auth/logout" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-base-muted hover:text-red-500">
              <LogOut size={16} />
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Estabelecimentos ativos", value: estabelecimentos.filter((e) => e.ativo).length, icon: Building2, color: "text-accent-600" },
            { label: "Usuários cadastrados", value: usuarios.length, icon: Users, color: "text-sky-600" },
            { label: "MRR estimado", value: `R$ ${estabelecimentos.filter((e) => e.ativo).reduce((a, e) => a + e.valorMensal, 0).toLocaleString("pt-BR")}`, icon: CreditCard, color: "text-emerald-600" },
            { label: "Auth0 pendentes", value: usuarios.filter((u) => !u.auth0Vinculado).length, icon: RefreshCw, color: "text-amber-600" },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-base flex items-center justify-center"><s.icon size={16} className={s.color} /></div>
                <div><p className={`text-lg font-bold ${s.color}`}>{loading ? "..." : s.value}</p><p className="text-[10px] text-base-muted">{s.label}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex border-b border-surface-border">
            {[
              { key: "estabelecimentos" as const, label: "Estabelecimentos", icon: Building2 },
              { key: "usuarios" as const, label: "Usuários", icon: Users },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-accent-800 text-base-primary" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-muted" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-56 pl-8 pr-3 py-2 glass-card rounded-lg text-xs text-base-secondary focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
            </div>
            {tab === "estabelecimentos" ? (
              <button onClick={openCreateEstab} className="text-sm font-medium text-white bg-accent-800 hover:bg-accent-800 px-4 py-2 rounded-lg flex items-center gap-1.5">
                <Plus size={15} /> Novo estabelecimento
              </button>
            ) : (
              <button onClick={() => openCreateUser()} className="text-sm font-medium text-white bg-accent-800 hover:bg-accent-800 px-4 py-2 rounded-lg flex items-center gap-1.5">
                <Plus size={15} /> Novo usuário
              </button>
            )}
          </div>
        </div>

        {/* Estabelecimentos Tab */}
        {tab === "estabelecimentos" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-surface-base rounded animate-pulse" />)}</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border-light">
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left">Estabelecimento</th>
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left hidden md:table-cell">Tipo</th>
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center hidden md:table-cell">Plano</th>
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center hidden md:table-cell">Profs</th>
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center hidden md:table-cell">Clientes</th>
                    <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstabs.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-surface-base">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-base-primary">{e.nome}</p>
                        <p className="text-xs text-base-muted">{e.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-base-secondary hidden md:table-cell">{tipoLabels[e.tipoNegocio] ?? e.tipoNegocio}</td>
                      <td className="px-5 py-4 text-center hidden md:table-cell">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${planoColors[e.plano] ?? planoColors.STARTER}`}>{e.plano}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-base-secondary text-center hidden md:table-cell">{e.totalProfissionais}</td>
                      <td className="px-5 py-4 text-sm text-base-secondary text-center hidden md:table-cell">{e.totalClientes}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${e.ativo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {e.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditEstab(e)} className="w-7 h-7 rounded hover:bg-surface-border-light flex items-center justify-center text-base-muted hover:text-base-secondary"><Edit size={14} /></button>
                          <button onClick={() => deactivateEstab(e.id, e.nome)} className="w-7 h-7 rounded hover:bg-red-50 flex items-center justify-center text-base-muted hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Usuarios Tab */}
        {tab === "usuarios" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border-light">
                  <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left">Usuário</th>
                  <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left hidden md:table-cell">Estabelecimento</th>
                  <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center hidden md:table-cell">Permissão</th>
                  <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center hidden md:table-cell">Auth0</th>
                  <th className="text-[10px] font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-surface-base">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-base-primary">{u.nome}</p>
                      <p className="text-xs text-base-muted">{u.email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-base-secondary hidden md:table-cell">{u.estabelecimento}</td>
                    <td className="px-5 py-4 text-center hidden md:table-cell">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${u.permissao === "ADMIN" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-surface-base text-base-secondary border-surface-border"}`}>
                        {u.permissao}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center hidden md:table-cell">
                      {u.auth0Vinculado ? (
                        <span className="text-[10px] text-emerald-600 flex items-center justify-center gap-0.5"><Check size={10} /> Vinculado</span>
                      ) : (
                        <span className="text-[10px] text-amber-500">Pendente</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.ativo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => deactivateUser(u.id, u.nome)} className="w-7 h-7 rounded hover:bg-red-50 flex items-center justify-center text-base-muted hover:text-red-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo/Editar Estabelecimento */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalMode === "create" ? "Novo Estabelecimento" : "Editar Estabelecimento"}>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-base-muted uppercase tracking-wider">Dados do negócio</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Nome do estabelecimento" value={form.nome} onChange={(v: string) => setForm({ ...form, nome: v })} required /></div>
            <MaskedField label="CNPJ" value={form.cnpj} onChange={(v: string) => setForm({ ...form, cnpj: v })} mask="cnpj" />
            <Field label="E-mail" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} type="email" required />
            <MaskedField label="Telefone" value={form.telefone} onChange={(v: string) => setForm({ ...form, telefone: v })} mask="telefone" />
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Tipo de negócio</label>
              <select value={form.tipoNegocio} onChange={(e) => setForm({ ...form, tipoNegocio: e.target.value })}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-primary focus:outline-none focus:ring-2 focus:ring-accent-400/30">
                <option value="SALAO_BELEZA">Salão de Beleza</option>
                <option value="BARBEARIA">Barbearia</option>
                <option value="CLINICA_ESTETICA">Clínica Estética</option>
                <option value="CLINICA_ODONTO">Clínica Odonto</option>
                <option value="ESPACO_BELEZA">Espaço de Beleza</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <Field label="Cidade" value={form.cidade} onChange={(v: string) => setForm({ ...form, cidade: v })} />
            <Field label="Estado" value={form.estado} onChange={(v: string) => setForm({ ...form, estado: v })} placeholder="RN" />
            <Field label="Endereço" value={form.endereco} onChange={(v: string) => setForm({ ...form, endereco: v })} />
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-base-muted uppercase tracking-wider mb-3">Plano</p>
            <div className="grid grid-cols-4 gap-2">
              {(["STARTER", "PRO", "STUDIO", "CLINICA"] as const).map((p) => (
                <button key={p} onClick={() => setForm({ ...form, plano: p })}
                  className={`p-3 rounded-lg border text-center transition-colors ${form.plano === p ? "border-accent-400 bg-accent-50" : "border-surface-border hover:border-surface-border"}`}>
                  <p className="text-xs font-bold text-base-primary">{p}</p>
                  <p className="text-[10px] text-base-muted mt-0.5">R$ {planoPrecos[p]}/mês</p>
                </button>
              ))}
            </div>
          </div>

          {modalMode === "create" && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-base-muted uppercase tracking-wider mb-3">Administrador da conta</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome do admin" value={form.adminNome} onChange={(v: string) => setForm({ ...form, adminNome: v })} required />
                <Field label="E-mail do admin" value={form.adminEmail} onChange={(v: string) => setForm({ ...form, adminEmail: v })} type="email" required />
              </div>
              <p className="text-[10px] text-base-muted mt-2">Este e-mail será usado para fazer login. Certifique-se de que é o e-mail que o dono usará no Auth0.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border-light">
            <button onClick={() => setShowModal(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
            <button onClick={saveEstab} disabled={saving}
              className="text-sm font-medium text-white bg-accent-800 hover:bg-accent-800 disabled:opacity-50 px-5 py-2.5 rounded-lg flex items-center gap-1.5">
              {saving ? "Salvando..." : modalMode === "create" ? "Criar estabelecimento" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Novo Usuário */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Novo Usuário">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-base-secondary mb-1.5 block">Estabelecimento <span className="text-red-400">*</span></label>
            <select value={userForm.estabelecimentoId} onChange={(e) => setUserForm({ ...userForm, estabelecimentoId: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-primary focus:outline-none focus:ring-2 focus:ring-accent-400/30">
              <option value="">Selecione...</option>
              {estabelecimentos.filter((e) => e.ativo).map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <Field label="Nome" value={userForm.nome} onChange={(v: string) => setUserForm({ ...userForm, nome: v })} required />
          <Field label="E-mail" value={userForm.email} onChange={(v: string) => setUserForm({ ...userForm, email: v })} type="email" required />
          <MaskedField label="Telefone" value={userForm.telefone} onChange={(v: string) => setUserForm({ ...userForm, telefone: v })} mask="telefone" />
          <div>
            <label className="text-xs font-medium text-base-secondary mb-1.5 block">Permissão</label>
            <select value={userForm.permissao} onChange={(e) => setUserForm({ ...userForm, permissao: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-base-primary focus:outline-none focus:ring-2 focus:ring-accent-400/30">
              <option value="ADMIN">Administrador</option>
              <option value="GERENTE">Gerente</option>
              <option value="PROFISSIONAL">Profissional</option>
              <option value="RECEPCIONISTA">Recepcionista</option>
            </select>
          </div>
          <p className="text-[10px] text-base-muted">O e-mail deve ser o mesmo que o usuário usará para criar conta no Auth0.</p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border-light">
            <button onClick={() => setShowUserModal(false)} className="text-sm text-base-secondary hover:text-base-primary px-4 py-2">Cancelar</button>
            <button onClick={saveUser} disabled={saving}
              className="text-sm font-medium text-white bg-accent-800 hover:bg-accent-800 disabled:opacity-50 px-5 py-2.5 rounded-lg">
              {saving ? "Salvando..." : "Criar usuário"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
