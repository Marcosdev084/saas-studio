"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { Modal, Field, ModalActions, TextAreaField, MaskedField, ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface Cliente {
  id: string; nome: string; email: string | null; telefone: string | null
  totalVisitas: number; ticketMedio: number; ultimaVisita: string | null
  riscoChurn: string; scoreChurn: number
}

const riskColors: Record<string, string> = {
  CRITICO: "text-red-700 bg-red-100 border-red-300",
  ALTO: "text-red-600 bg-red-50 border-red-200",
  MEDIO: "text-amber-600 bg-amber-50 border-amber-200",
  BAIXO: "text-emerald-600 bg-emerald-50 border-emerald-200",
}

const emptyForm = { nome: "", email: "", telefone: "", dataNascimento: "", observacoes: "" }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ id: string; nome: string } | null>(null)
  const { toast } = useToast()

  const load = () => {
    fetch("/api/clientes").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setClientes(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone ?? "").includes(search)
  )

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); setShowModal(true) }

  const openEdit = (c: Cliente) => {
    setEditingId(c.id)
    setForm({ nome: c.nome, email: c.email ?? "", telefone: c.telefone ?? "", dataNascimento: "", observacoes: "" })
    setError("")
    setShowModal(true)
  }

  const save = async () => {
    if (!form.nome.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true); setError("")
    try {
      if (editingId) {
        const res = await fetch(`/api/clientes/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, email: form.email || null, telefone: form.telefone || null, observacoes: form.observacoes || null }),
        })
        if (!res.ok) { const e = await res.json(); setError(e.error); setSaving(false); return }
        setShowModal(false); toast("Cliente atualizado com sucesso"); load()
      } else {
        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) { const e = await res.json(); setError(e.error); setSaving(false); return }
        setShowModal(false); toast("Cliente criado com sucesso"); load()
      }
    } catch { setError("Erro ao salvar") }
    setSaving(false)
  }

  const deactivate = async (id: string) => {
    try {
      await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: false }),
      })
      toast("Cliente removido com sucesso")
      load()
    } catch { toast("Erro ao remover cliente") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Clientes</h1>
        <button onClick={openCreate} className="text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">Novo cliente</span><span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-muted/60" />
        <input type="text" placeholder="Buscar por nome, e-mail, telefone..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 glass-card rounded-lg text-sm text-base-secondary placeholder:text-base-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 md:p-8 space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-12 bg-surface-base rounded animate-pulse" />)}</div>
        ) : (
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto scroll-fade-y">
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-surface-base">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-4">
                  <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-base-primary truncate">{c.nome}</p>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${riskColors[c.riscoChurn] ?? riskColors.BAIXO}`}>{c.riscoChurn.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-base-muted">
                      {c.telefone && <span>{c.telefone}</span>}
                      <span>{c.totalVisitas} visitas</span>
                      <span>R$ {Number(c.ticketMedio).toFixed(0)}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-accent-600 transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDel({ id: c.id, nome: c.nome })} className="p-2 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500 transition-colors" title="Remover">
                      <Trash2 size={14} />
                    </button>
                    <Link href={`/clientes/${c.id}`} className="p-2 text-base-muted/60">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-base-muted">Nenhum cliente encontrado</div>}
            </div>

            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead className="sticky top-0 z-10 bg-surface-card/85 backdrop-blur-xl">
                <tr className="border-b border-surface-border-light">
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left">Cliente</th>
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-left">Última visita</th>
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center">Visitas</th>
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center">Ticket médio</th>
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-center">Risco</th>
                  <th className="text-xs font-medium text-base-muted uppercase tracking-wider px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-surface-base last:border-0 hover:bg-surface-base group">
                    <td className="px-5 py-4">
                      <Link href={`/clientes/${c.id}`} className="text-sm font-medium text-base-primary hover:text-accent-600 transition-colors">{c.nome}</Link>
                      {c.telefone && <p className="text-xs text-base-muted mt-0.5">{c.telefone}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-base-secondary">{formatDate(c.ultimaVisita)}</td>
                    <td className="px-5 py-4 text-sm text-base-secondary text-center">{c.totalVisitas}</td>
                    <td className="px-5 py-4 text-sm text-base-secondary text-center">R$ {Number(c.ticketMedio).toFixed(0)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full border ${riskColors[c.riscoChurn] ?? riskColors.BAIXO}`}>{c.riscoChurn.toLowerCase()}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-accent-600" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDel({ id: c.id, nome: c.nome })} className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500" title="Remover">
                          <Trash2 size={14} />
                        </button>
                        <Link href={`/clientes/${c.id}`} className="p-1.5 text-base-muted/60 hover:text-accent-600">
                          <ChevronRight size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-base-muted">Nenhum cliente encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-base-muted text-right">{filtered.length} de {clientes.length} clientes</p>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return
          await deactivate(confirmDel.id)
          setConfirmDel(null)
        }}
        title="Remover cliente"
        message={`Tem certeza que deseja remover "${confirmDel?.nome ?? ""}"? O cliente será desativado e não aparecerá mais na lista.`}
        confirmLabel="Remover"
      />

      {/* Modal: Criar/Editar Cliente */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Cliente" : "Novo Cliente"}>
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <Field label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <MaskedField label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} mask="telefone" />
            <Field label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          </div>
          {!editingId && <Field label="Data de nascimento" value={form.dataNascimento} onChange={(v) => setForm({ ...form, dataNascimento: v })} type="date" />}
          <TextAreaField label="Observações" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} placeholder="Alguma observação sobre o cliente..." />
          <ModalActions onCancel={() => setShowModal(false)} onSave={save} saving={saving} saveLabel={editingId ? "Salvar alterações" : "Criar cliente"} />
        </div>
      </Modal>
    </div>
  )
}
