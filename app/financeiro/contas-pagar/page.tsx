"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft, Plus, Pencil, Trash2, Check, X, Search,
  AlertTriangle, Clock, CheckCircle2, Ban, Building2,
  DollarSign, CalendarClock, Receipt
} from "lucide-react"
import Link from "next/link"
import { Modal, Field, SelectField, TextAreaField, ModalActions, ConfirmDialog, MaskedField } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface Fornecedor {
  id: string
  nome: string
  cnpjCpf: string | null
  telefone: string | null
  email: string | null
  observacoes: string | null
}

interface Conta {
  id: string
  descricao: string
  valor: number
  categoria: string | null
  dataVencimento: string
  dataPagamento: string | null
  status: "PENDENTE" | "VENCIDO" | "PAGO" | "CANCELADO"
  observacoes: string | null
  recorrente: boolean
  fornecedor: { id: string; nome: string } | null
}

interface Resumo {
  totalPendente: number
  countPendente: number
  totalVencido: number
  countVencido: number
  totalPagoMes: number
  countPagoMes: number
  totalProximos7dias: number
  countProximos7dias: number
}

const categorias = [
  "Aluguel", "Materiais", "Produtos", "Equipamentos", "Manutencao",
  "Marketing", "Energia", "Agua", "Internet", "Salarios", "Impostos", "Outros",
]

const categoriasLabel: Record<string, string> = {
  Manutencao: "Manutencao",
  Agua: "Agua",
  Salarios: "Salarios",
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: "bg-amber-50", text: "text-amber-600", label: "Pendente" },
  VENCIDO: { bg: "bg-red-50", text: "text-red-600", label: "Vencido" },
  PAGO: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Pago" },
  CANCELADO: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelado" },
}

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const emptyForm = {
  descricao: "", valor: "", categoria: "", fornecedorId: "",
  dataVencimento: toLocalISO(new Date()), observacoes: "", recorrente: false,
}

const emptyFornecedor = { nome: "", cnpjCpf: "", telefone: "", email: "" }

export default function ContasPagarPage() {
  const [contas, setContas] = useState<Conta[]>([])
  const [resumo, setResumo] = useState<Resumo>({ totalPendente: 0, countPendente: 0, totalVencido: 0, countVencido: 0, totalPagoMes: 0, countPagoMes: 0, totalProximos7dias: 0, countProximos7dias: 0 })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("all")
  const [mesSel, setMesSel] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const { toast } = useToast()

  // Modal nova/editar conta
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // Fornecedores
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [showFornecedores, setShowFornecedores] = useState(false)
  const [fornForm, setFornForm] = useState(emptyFornecedor)
  const [savingForn, setSavingForn] = useState(false)
  const [editFornId, setEditFornId] = useState<string | null>(null)
  const [editFornData, setEditFornData] = useState(emptyFornecedor)

  // Confirm dialog
  const [confirmDel, setConfirmDel] = useState<{ id: string; nome: string } | null>(null)
  const [confirmDelForn, setConfirmDelForn] = useState<{ id: string; nome: string } | null>(null)

  const loadContas = () => {
    setLoading(true)
    fetch(`/api/financeiro/contas-pagar?status=${filtro}&mes=${mesSel}`)
      .then((r) => r.json())
      .then((d) => {
        setContas(d.contas ?? [])
        setResumo(d.resumo ?? resumo)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const loadFornecedores = () => {
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setFornecedores(d) })
      .catch(() => {})
  }

  useEffect(() => { loadContas() }, [filtro, mesSel])
  useEffect(() => { loadFornecedores() }, [])

  // Criar / Editar conta
  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setFormError("")
    setShowForm(true)
  }

  const openEdit = (c: Conta) => {
    setEditId(c.id)
    setForm({
      descricao: c.descricao,
      valor: String(Number(c.valor)),
      categoria: c.categoria ?? "",
      fornecedorId: c.fornecedor?.id ?? "",
      dataVencimento: c.dataVencimento ? c.dataVencimento.split("T")[0] : toLocalISO(new Date()),
      observacoes: c.observacoes ?? "",
      recorrente: c.recorrente,
    })
    setFormError("")
    setShowForm(true)
  }

  const salvarConta = async () => {
    if (!form.descricao.trim()) { setFormError("Descricao e obrigatoria"); return }
    const valor = parseFloat(form.valor.replace(",", "."))
    if (isNaN(valor) || valor <= 0) { setFormError("Valor invalido"); return }
    if (!form.dataVencimento) { setFormError("Data de vencimento e obrigatoria"); return }

    setSaving(true)
    setFormError("")

    try {
      if (editId) {
        const res = await fetch("/api/financeiro/contas-pagar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            descricao: form.descricao,
            valor,
            categoria: form.categoria || undefined,
            fornecedorId: form.fornecedorId || undefined,
            dataVencimento: form.dataVencimento,
            observacoes: form.observacoes || undefined,
          }),
        })
        if (!res.ok) { const e = await res.json().catch(() => null); setFormError(e?.error ?? "Erro ao salvar"); setSaving(false); return }
        toast("Conta atualizada")
      } else {
        const res = await fetch("/api/financeiro/contas-pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descricao: form.descricao,
            valor,
            categoria: form.categoria || undefined,
            fornecedorId: form.fornecedorId || undefined,
            dataVencimento: form.dataVencimento,
            observacoes: form.observacoes || undefined,
            recorrente: form.recorrente,
          }),
        })
        if (!res.ok) { const e = await res.json().catch(() => null); setFormError(e?.error ?? "Erro ao salvar"); setSaving(false); return }
        toast("Conta criada com sucesso")
      }
      setShowForm(false)
      setForm(emptyForm)
      loadContas()
    } catch { setFormError("Erro ao salvar") }
    setSaving(false)
  }

  const pagarConta = async (id: string) => {
    await fetch("/api/financeiro/contas-pagar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PAGO" }),
    })
    toast("Pagamento confirmado")
    loadContas()
  }

  const deletarConta = async (id: string) => {
    await fetch(`/api/financeiro/contas-pagar?id=${id}`, { method: "DELETE" })
    toast("Conta excluida")
    loadContas()
  }

  // Fornecedores CRUD
  const abrirFornecedores = () => {
    loadFornecedores()
    setFornForm(emptyFornecedor)
    setEditFornId(null)
    setShowFornecedores(true)
  }

  const salvarFornecedor = async () => {
    if (!fornForm.nome.trim()) return
    setSavingForn(true)
    try {
      await fetch("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: fornForm.nome,
          cnpjCpf: fornForm.cnpjCpf || undefined,
          telefone: fornForm.telefone || undefined,
          email: fornForm.email || undefined,
        }),
      })
      toast("Fornecedor adicionado")
      setFornForm(emptyFornecedor)
      loadFornecedores()
    } catch { toast("Erro ao salvar fornecedor") }
    setSavingForn(false)
  }

  const iniciarEdicaoForn = (f: Fornecedor) => {
    setEditFornId(f.id)
    setEditFornData({ nome: f.nome, cnpjCpf: f.cnpjCpf ?? "", telefone: f.telefone ?? "", email: f.email ?? "" })
  }

  const salvarEdicaoForn = async () => {
    if (!editFornId || !editFornData.nome.trim()) return
    await fetch(`/api/fornecedores?id=${editFornId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: editFornData.nome,
        cnpjCpf: editFornData.cnpjCpf || undefined,
        telefone: editFornData.telefone || undefined,
        email: editFornData.email || undefined,
      }),
    })
    toast("Fornecedor atualizado")
    setEditFornId(null)
    loadFornecedores()
  }

  const deletarFornecedor = async (id: string) => {
    await fetch(`/api/fornecedores?id=${id}`, { method: "DELETE" })
    toast("Fornecedor removido")
    setConfirmDelForn(null)
    loadFornecedores()
  }

  const filtros = [
    { key: "all", label: "Todas" },
    { key: "PENDENTE", label: "Pendentes" },
    { key: "VENCIDO", label: "Vencidas" },
    { key: "PAGO", label: "Pagas" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Contas a pagar</h1>
            <p className="text-xs text-base-muted">Gerencie suas contas e pagamentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mesSel}
            onChange={(e) => setMesSel(e.target.value)}
            className="text-xs border border-surface-border rounded-lg px-3 py-2 bg-surface-card text-base-primary"
          />
          <button onClick={abrirFornecedores}
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Building2 size={15} /> <span className="hidden sm:inline">Fornecedores</span>
          </button>
          <button onClick={openCreate}
            className="text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
            <Plus size={15} /> <span className="hidden sm:inline">Nova conta</span><span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {filtros.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filtro === f.key
                ? "bg-accent-600 text-white"
                : "bg-surface-base text-base-secondary hover:bg-surface-border-light"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-surface-border-light mb-3" />
              <div className="h-6 bg-surface-border-light rounded w-24 mb-1" />
              <div className="h-4 bg-surface-border-light rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: Clock, label: "Pendente", value: fmt(resumo.totalPendente), sub: `${resumo.countPendente} conta${resumo.countPendente !== 1 ? "s" : ""}`, color: "text-amber-600", bg: "bg-amber-50" },
            { icon: AlertTriangle, label: "Vencido", value: fmt(resumo.totalVencido), sub: `${resumo.countVencido} conta${resumo.countVencido !== 1 ? "s" : ""}`, color: "text-red-500", bg: "bg-red-50" },
            { icon: CheckCircle2, label: "Pago no mes", value: fmt(resumo.totalPagoMes), sub: `${resumo.countPagoMes} conta${resumo.countPagoMes !== 1 ? "s" : ""}`, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: CalendarClock, label: "Proximos 7 dias", value: fmt(resumo.totalProximos7dias), sub: `${resumo.countProximos7dias} conta${resumo.countProximos7dias !== 1 ? "s" : ""}`, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((k, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-5 hover:shadow-card-hover transition-shadow">
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-2 md:mb-3 ${k.bg}`}>
                <k.icon size={18} className={k.color} />
              </div>
              <p className={`text-lg md:text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-base-secondary mt-0.5">{k.label}</p>
              <p className="text-[10px] text-base-muted">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de contas */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-accent-600" />
          Contas a pagar
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-surface-base rounded animate-pulse" />)}
          </div>
        ) : contas.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-base-muted border-b border-surface-border-light">
                    <th className="pb-2 font-medium">Vencimento</th>
                    <th className="pb-2 font-medium">Descricao</th>
                    <th className="pb-2 font-medium">Fornecedor</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-base">
                  {contas.map((c) => {
                    const st = statusConfig[c.status] ?? statusConfig.PENDENTE
                    return (
                      <tr key={c.id} className="group">
                        <td className="py-3 text-xs text-base-secondary">
                          {new Date(c.dataVencimento).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3">
                          <span className="font-medium text-accent-700">{c.descricao}</span>
                          {c.recorrente && (
                            <span className="ml-1.5 text-[9px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">Recorrente</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-base-secondary">{c.fornecedor?.nome ?? "--"}</td>
                        <td className="py-3">
                          {c.categoria ? (
                            <span className="text-[10px] bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">{c.categoria}</span>
                          ) : (
                            <span className="text-base-muted/60">--</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-semibold text-red-500">{fmt(Number(c.valor))}</td>
                        <td className="py-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(c.status === "PENDENTE" || c.status === "VENCIDO") && (
                              <button onClick={() => pagarConta(c.id)}
                                className="text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg"
                                title="Marcar como pago">
                                Pagar
                              </button>
                            )}
                            <button onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-base-secondary"
                              title="Editar">
                              <Pencil size={13} />
                            </button>
                            {(c.status === "PENDENTE" || c.status === "VENCIDO") && (
                              <button onClick={() => setConfirmDel({ id: c.id, nome: c.descricao })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500"
                                title="Excluir">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {contas.map((c) => {
                const st = statusConfig[c.status] ?? statusConfig.PENDENTE
                return (
                  <div key={c.id} className="p-3 rounded-2xl border border-surface-border-light">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-accent-700 truncate">{c.descricao}</p>
                        <p className="text-[10px] text-base-muted mt-0.5">
                          Venc. {new Date(c.dataVencimento).toLocaleDateString("pt-BR")}
                          {c.fornecedor && ` - ${c.fornecedor.nome}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] mb-3">
                      {c.categoria && (
                        <span className="bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">{c.categoria}</span>
                      )}
                      {c.recorrente && (
                        <span className="font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">Recorrente</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-500">{fmt(Number(c.valor))}</span>
                      <div className="flex items-center gap-1">
                        {(c.status === "PENDENTE" || c.status === "VENCIDO") && (
                          <button onClick={() => pagarConta(c.id)}
                            className="text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg">
                            Pagar
                          </button>
                        )}
                        <button onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-base-secondary">
                          <Pencil size={13} />
                        </button>
                        {(c.status === "PENDENTE" || c.status === "VENCIDO") && (
                          <button onClick={() => setConfirmDel({ id: c.id, nome: c.descricao })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-base-muted/60">
            <Receipt size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma conta encontrada</p>
            <p className="text-[10px] mt-1">Clique em "Nova conta" para registrar uma conta a pagar</p>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return
          await deletarConta(confirmDel.id)
          setConfirmDel(null)
        }}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir "${confirmDel?.nome ?? ""}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      {/* Modal nova/editar conta */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? "Editar conta" : "Nova conta a pagar"}>
        <div className="space-y-4">
          {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{formError}</div>}

          <Field label="Descricao" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} required placeholder="Ex: Aluguel do salao" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)" value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} required placeholder="1.500,00" />
            <SelectField label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })}
              options={categorias.map((c) => ({ value: c, label: c }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Fornecedor" value={form.fornecedorId} onChange={(v) => setForm({ ...form, fornecedorId: v })}
              options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} />
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">
                Data de vencimento <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50"
              />
            </div>
          </div>

          <TextAreaField label="Observacoes" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} placeholder="Anotacoes sobre esta conta..." rows={2} />

          {!editId && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface-base">
              <button type="button" onClick={() => setForm({ ...form, recorrente: !form.recorrente })}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${form.recorrente ? "bg-violet-500" : "bg-surface-border"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.recorrente ? "translate-x-5" : ""}`} />
              </button>
              <div>
                <p className="text-xs font-medium text-accent-700">Conta recorrente</p>
                <p className="text-[10px] text-base-muted">Gera automaticamente a cada mes</p>
              </div>
            </div>
          )}

          <ModalActions onCancel={() => setShowForm(false)} onSave={salvarConta} saving={saving}
            saveLabel={editId ? "Salvar alteracoes" : "Criar conta"} />
        </div>
      </Modal>

      {/* Modal fornecedores */}
      <Modal open={showFornecedores} onClose={() => setShowFornecedores(false)} title="Fornecedores" wide>
        <div className="space-y-4">
          <p className="text-xs text-base-muted">Cadastre e gerencie seus fornecedores. Eles podem ser vinculados as contas a pagar.</p>

          {/* Lista de fornecedores */}
          {fornecedores.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fornecedores.map((f) => (
                <div key={f.id} className="p-3 rounded-xl border border-surface-border-light">
                  {editFornId === f.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editFornData.nome} onChange={(e) => setEditFornData({ ...editFornData, nome: e.target.value })}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                          placeholder="Nome" />
                        <input value={editFornData.cnpjCpf} onChange={(e) => setEditFornData({ ...editFornData, cnpjCpf: e.target.value })}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                          placeholder="CNPJ/CPF" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editFornData.telefone} onChange={(e) => setEditFornData({ ...editFornData, telefone: e.target.value })}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                          placeholder="Telefone" />
                        <input value={editFornData.email} onChange={(e) => setEditFornData({ ...editFornData, email: e.target.value })}
                          className="px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                          placeholder="Email" />
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={salvarEdicaoForn}
                          className="p-1.5 rounded-lg bg-accent-50 text-accent-600 hover:bg-accent-100">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditFornId(null)}
                          className="p-1.5 rounded-lg bg-surface-base text-base-muted hover:bg-surface-border-light">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-accent-700">{f.nome}</p>
                        <p className="text-[10px] text-base-muted">
                          {[f.cnpjCpf, f.telefone, f.email].filter(Boolean).join(" - ") || "Sem dados adicionais"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => iniciarEdicaoForn(f)}
                          className="p-1.5 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-base-secondary">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setConfirmDelForn({ id: f.id, nome: f.nome })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-base-muted/60">
              <Building2 size={24} className="mx-auto mb-1 opacity-30" />
              <p className="text-xs">Nenhum fornecedor cadastrado</p>
            </div>
          )}

          {/* Formulario novo fornecedor */}
          <div className="border-t border-surface-border-light pt-4">
            <p className="text-xs font-medium text-base-primary mb-3">Adicionar fornecedor</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Nome" value={fornForm.nome} onChange={(v) => setFornForm({ ...fornForm, nome: v })} required placeholder="Nome do fornecedor" />
              <Field label="CNPJ/CPF" value={fornForm.cnpjCpf} onChange={(v) => setFornForm({ ...fornForm, cnpjCpf: v })} placeholder="00.000.000/0000-00" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Telefone" value={fornForm.telefone} onChange={(v) => setFornForm({ ...fornForm, telefone: v })} placeholder="(00) 00000-0000" />
              <Field label="Email" value={fornForm.email} onChange={(v) => setFornForm({ ...fornForm, email: v })} placeholder="email@fornecedor.com" />
            </div>
            <div className="flex justify-end">
              <button onClick={salvarFornecedor} disabled={savingForn || !fornForm.nome.trim()}
                className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-1.5">
                <Plus size={14} /> {savingForn ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm delete fornecedor */}
      <ConfirmDialog
        open={!!confirmDelForn}
        onClose={() => setConfirmDelForn(null)}
        onConfirm={() => { if (confirmDelForn) deletarFornecedor(confirmDelForn.id) }}
        title="Remover fornecedor"
        message={`Tem certeza que deseja remover "${confirmDelForn?.nome ?? ""}"?`}
        confirmLabel="Remover"
      />
    </div>
  )
}
