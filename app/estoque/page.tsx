"use client"

import { useState, useEffect } from "react"
import {
  Package, Plus, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal,
  AlertTriangle, DollarSign, Boxes, Pencil, Trash2, History
} from "lucide-react"
import { Modal, Field, SelectField, TextAreaField, ModalActions, ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface Produto {
  id: string; nome: string; descricao: string | null; categoria: string | null; sku: string | null
  unidade: string; unidadeConsumo: string | null; capacidadePorUnidade: number | null
  quantidade: number; estoqueMinimo: number; custoUnitario: number
  precoVenda: number | null; valorEmEstoque: number; baixo: boolean
}
interface Movimentacao {
  id: string; produtoNome: string; unidade: string; tipo: string; quantidade: number
  custoUnitario: number | null; observacao: string | null; criadoEm: string; gerouDespesa: boolean
}
interface Stats { totalProdutos: number; itensEmEstoque: number; valorEstoque: number; baixoEstoque: number }
interface EstoqueData { produtos: Produto[]; movimentacoes: Movimentacao[]; stats: Stats }

const movStyle: Record<string, { bg: string; text: string; label: string; icon: typeof ArrowDownCircle }> = {
  ENTRADA: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Entrada", icon: ArrowDownCircle },
  SAIDA: { bg: "bg-red-50", text: "text-red-600", label: "Saída", icon: ArrowUpCircle },
  AJUSTE: { bg: "bg-sky-50", text: "text-sky-700", label: "Ajuste", icon: SlidersHorizontal },
}
const unidades = ["un", "ml", "L", "g", "kg", "cx", "par", "kit"]
const unidadesConsumo = ["", "ml", "g", "gotas", "doses"]
const emptyProd = { nome: "", categoria: "", sku: "", unidade: "un", estoqueMinimo: "0", custoUnitario: "", precoVenda: "", quantidadeInicial: "0", unidadeConsumo: "", capacidadePorUnidade: "" }

function fmt(v: number) { return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

export default function EstoquePage() {
  const [data, setData] = useState<EstoqueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"produtos" | "movimentacoes">("produtos")
  const { toast } = useToast()

  const [showProd, setShowProd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [prodForm, setProdForm] = useState(emptyProd)
  const [savingProd, setSavingProd] = useState(false)
  const [prodErr, setProdErr] = useState("")

  const [movProduto, setMovProduto] = useState<Produto | null>(null)
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("ENTRADA")
  const [movForm, setMovForm] = useState({ quantidade: "", custoUnitario: "", observacao: "", registrarDespesa: true })
  const [savingMov, setSavingMov] = useState(false)
  const [movErr, setMovErr] = useState("")

  const [confirmDel, setConfirmDel] = useState<Produto | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/estoque").then((r) => r.json()).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const stats = data?.stats ?? { totalProdutos: 0, itensEmEstoque: 0, valorEstoque: 0, baixoEstoque: 0 }

  const openCreate = () => { setEditId(null); setProdForm(emptyProd); setProdErr(""); setShowProd(true) }
  const openEdit = (p: Produto) => {
    setEditId(p.id)
    setProdForm({
      nome: p.nome, categoria: p.categoria ?? "", sku: p.sku ?? "", unidade: p.unidade,
      estoqueMinimo: String(p.estoqueMinimo), custoUnitario: String(p.custoUnitario),
      precoVenda: p.precoVenda != null ? String(p.precoVenda) : "", quantidadeInicial: "0",
      unidadeConsumo: p.unidadeConsumo ?? "", capacidadePorUnidade: p.capacidadePorUnidade != null ? String(p.capacidadePorUnidade) : "",
    })
    setProdErr(""); setShowProd(true)
  }

  const saveProduto = async () => {
    if (!prodForm.nome.trim()) { setProdErr("Nome é obrigatório"); return }
    setSavingProd(true); setProdErr("")
    try {
      const url = editId ? `/api/estoque?id=${editId}` : "/api/estoque"
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodForm),
      })
      if (!res.ok) { const e = await res.json().catch(() => null); setProdErr(e?.error ?? "Erro ao salvar"); setSavingProd(false); return }
      toast(editId ? "Produto atualizado" : "Produto criado com sucesso")
      setShowProd(false); load()
    } catch { setProdErr("Erro ao salvar") }
    setSavingProd(false)
  }

  const openMov = (p: Produto, tipo: "ENTRADA" | "SAIDA" | "AJUSTE") => {
    setMovProduto(p); setMovTipo(tipo)
    setMovForm({ quantidade: "", custoUnitario: tipo === "ENTRADA" ? String(p.custoUnitario || "") : "", observacao: "", registrarDespesa: true })
    setMovErr("")
  }

  const saveMov = async () => {
    if (!movProduto) return
    const qtd = Number(movForm.quantidade)
    if (isNaN(qtd) || (movTipo !== "AJUSTE" && qtd <= 0) || qtd < 0) { setMovErr("Informe uma quantidade válida"); return }
    setSavingMov(true); setMovErr("")
    try {
      const res = await fetch("/api/estoque/movimentacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: movProduto.id,
          tipo: movTipo,
          quantidade: qtd,
          custoUnitario: movTipo === "ENTRADA" && movForm.custoUnitario !== "" ? Number(movForm.custoUnitario) : undefined,
          observacao: movForm.observacao,
          registrarDespesa: movForm.registrarDespesa,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => null); setMovErr(e?.error ?? "Erro ao registrar"); setSavingMov(false); return }
      const d = await res.json()
      const labels = { ENTRADA: "Entrada registrada", SAIDA: "Saída registrada", AJUSTE: "Estoque ajustado" }
      toast(d.gerouDespesa ? `${labels[movTipo]} — despesa lançada no financeiro` : labels[movTipo])
      setMovProduto(null); load()
    } catch { setMovErr("Erro ao registrar") }
    setSavingMov(false)
  }

  const deletar = async () => {
    if (!confirmDel) return
    try {
      const res = await fetch(`/api/estoque?id=${confirmDel.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast("Produto removido")
      setConfirmDel(null); load()
    } catch { toast("Erro ao remover", "error"); setConfirmDel(null) }
  }

  const movLabel = movTipo === "ENTRADA" ? "Entrada de estoque" : movTipo === "SAIDA" ? "Saída de estoque" : "Ajustar quantidade"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Estoque</h1>
          <p className="text-xs text-base-muted">Controle de produtos e insumos</p>
        </div>
        <button onClick={openCreate} className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 px-4 py-2 rounded-lg flex items-center gap-1.5">
          <Plus size={15} /> Novo produto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { icon: Boxes, label: "Produtos", value: String(stats.totalProdutos), color: "text-accent-700", bg: "bg-accent-50" },
          { icon: Package, label: "Itens em estoque", value: String(stats.itensEmEstoque), color: "text-sky-600", bg: "bg-sky-50" },
          { icon: DollarSign, label: "Valor em estoque", value: fmt(stats.valorEstoque), color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: AlertTriangle, label: "Baixo estoque", value: String(stats.baixoEstoque), color: stats.baixoEstoque > 0 ? "text-red-500" : "text-base-secondary", bg: "bg-red-50" },
        ].map((k, i) => (
          <div key={i} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center`}><k.icon size={18} className={k.color} /></div>
              <div><p className={`text-lg font-bold ${k.color}`}>{loading ? "..." : k.value}</p><p className="text-xs text-base-muted">{k.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {[
          { key: "produtos", label: "Produtos", icon: Package },
          { key: "movimentacoes", label: "Movimentações", icon: History },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as "produtos" | "movimentacoes")}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-accent-600 text-accent-600" : "border-transparent text-base-muted hover:text-base-secondary"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card rounded-2xl h-16 animate-pulse" />)}</div>}

      {/* Produtos */}
      {!loading && tab === "produtos" && (
        (data?.produtos ?? []).length > 0 ? (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-surface-border-light text-left text-xs text-base-muted">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium text-center">Quantidade</th>
                    <th className="px-4 py-3 font-medium text-right">Custo un.</th>
                    <th className="px-4 py-3 font-medium text-right">Em estoque</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border-light">
                  {(data?.produtos ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-base-primary">{p.nome}</span>
                          {p.baixo && <span className="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">baixo</span>}
                        </div>
                        {p.sku && <span className="text-[10px] text-base-muted">SKU: {p.sku}</span>}
                      </td>
                      <td className="px-4 py-3 text-base-secondary">{p.categoria ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${p.baixo ? "text-red-500" : "text-base-primary"}`}>{p.quantidade}</span>
                        <span className="text-[10px] text-base-muted"> {p.unidade}</span>
                        {p.unidadeConsumo && p.capacidadePorUnidade && (
                          <div className="text-[10px] text-accent-600">{p.capacidadePorUnidade}{p.unidadeConsumo}/{p.unidade}</div>
                        )}
                        <div className="text-[10px] text-base-muted">mín. {p.estoqueMinimo}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-base-secondary">{fmt(p.custoUnitario)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(p.valorEmEstoque)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openMov(p, "ENTRADA")} title="Entrada" className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-emerald-600"><ArrowDownCircle size={16} /></button>
                          <button onClick={() => openMov(p, "SAIDA")} title="Saída" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500"><ArrowUpCircle size={16} /></button>
                          <button onClick={() => openMov(p, "AJUSTE")} title="Ajustar" className="w-8 h-8 rounded-lg hover:bg-sky-50 flex items-center justify-center text-sky-600"><SlidersHorizontal size={15} /></button>
                          <button onClick={() => openEdit(p)} title="Editar" className="w-8 h-8 rounded-lg hover:bg-surface-base flex items-center justify-center text-base-secondary"><Pencil size={14} /></button>
                          <button onClick={() => setConfirmDel(p)} title="Remover" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl text-center py-14">
            <Package size={32} className="text-base-muted/60 mx-auto mb-3" />
            <p className="text-sm text-base-muted mb-3">Nenhum produto cadastrado</p>
            <button onClick={openCreate} className="text-sm text-accent-600 hover:text-accent-700 font-medium">Cadastrar primeiro produto</button>
          </div>
        )
      )}

      {/* Movimentações */}
      {!loading && tab === "movimentacoes" && (
        (data?.movimentacoes ?? []).length > 0 ? (
          <div className="space-y-2">
            {(data?.movimentacoes ?? []).map((m) => {
              const s = movStyle[m.tipo] ?? movStyle.AJUSTE
              return (
                <div key={m.id} className="glass-card rounded-xl p-3.5 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}><s.icon size={17} className={s.text} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-base-primary truncate">{m.produtoNome}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                      {m.gerouDespesa && <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">despesa</span>}
                    </div>
                    <p className="text-[11px] text-base-muted">
                      {m.tipo === "AJUSTE" ? `ajustado para ${m.quantidade} ${m.unidade}` : `${m.quantidade} ${m.unidade}`}
                      {m.custoUnitario != null && ` · ${fmt(m.custoUnitario)}/un`}
                      {m.observacao && ` · ${m.observacao}`}
                    </p>
                  </div>
                  <span className="text-[11px] text-base-muted shrink-0">{new Date(m.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-card rounded-2xl text-center py-14">
            <History size={32} className="text-base-muted/60 mx-auto mb-3" />
            <p className="text-sm text-base-muted">Nenhuma movimentação registrada ainda</p>
          </div>
        )
      )}

      {/* Modal produto */}
      <Modal open={showProd} onClose={() => setShowProd(false)} title={editId ? "Editar produto" : "Novo produto"}>
        <div className="space-y-4">
          {prodErr && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{prodErr}</div>}
          <Field label="Nome do produto" value={prodForm.nome} onChange={(v) => setProdForm({ ...prodForm, nome: v })} placeholder="Ex: Shampoo profissional 1L" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria" value={prodForm.categoria} onChange={(v) => setProdForm({ ...prodForm, categoria: v })} placeholder="Ex: Cabelo" />
            <Field label="SKU / código" value={prodForm.sku} onChange={(v) => setProdForm({ ...prodForm, sku: v })} placeholder="opcional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Unidade de estoque" value={prodForm.unidade} onChange={(v) => setProdForm({ ...prodForm, unidade: v })} options={unidades.map((u) => ({ value: u, label: u }))} />
            <Field label="Estoque mínimo" type="number" value={prodForm.estoqueMinimo} onChange={(v) => setProdForm({ ...prodForm, estoqueMinimo: v })} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Unidade de consumo" value={prodForm.unidadeConsumo} onChange={(v) => setProdForm({ ...prodForm, unidadeConsumo: v })} options={unidadesConsumo.map((u) => ({ value: u, label: u || "— Nenhuma —" }))} />
            <Field label={`Capacidade por ${prodForm.unidade || "un"}`} type="number" value={prodForm.capacidadePorUnidade} onChange={(v) => setProdForm({ ...prodForm, capacidadePorUnidade: v })} placeholder={prodForm.unidadeConsumo ? `Ex: 500 ${prodForm.unidadeConsumo}` : "—"} />
          </div>
          {prodForm.unidadeConsumo && prodForm.capacidadePorUnidade && (
            <p className="text-[10px] text-base-muted -mt-2">Cada {prodForm.unidade || "un"} contém {prodForm.capacidadePorUnidade} {prodForm.unidadeConsumo}. O consumo nos serviços será em {prodForm.unidadeConsumo}.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo unitário (R$)" type="number" value={prodForm.custoUnitario} onChange={(v) => setProdForm({ ...prodForm, custoUnitario: v })} placeholder="0,00" />
            <Field label="Preço de venda (R$)" type="number" value={prodForm.precoVenda} onChange={(v) => setProdForm({ ...prodForm, precoVenda: v })} placeholder="opcional" />
          </div>
          {!editId && (
            <Field label="Quantidade inicial" type="number" value={prodForm.quantidadeInicial} onChange={(v) => setProdForm({ ...prodForm, quantidadeInicial: v })} placeholder="0" />
          )}
          <ModalActions onCancel={() => setShowProd(false)} onSave={saveProduto} saving={savingProd} saveLabel={editId ? "Salvar alterações" : "Criar produto"} />
        </div>
      </Modal>

      {/* Modal movimentação */}
      <Modal open={!!movProduto} onClose={() => setMovProduto(null)} title={movLabel}>
        {movProduto && (
          <div className="space-y-4">
            {movErr && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{movErr}</div>}
            <div className="p-3 bg-surface-base rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-base-primary">{movProduto.nome}</span>
              <span className="text-xs text-base-muted">Atual: <strong className="text-base-secondary">{movProduto.quantidade} {movProduto.unidade}</strong></span>
            </div>
            <Field
              label={movTipo === "AJUSTE" ? `Nova quantidade (${movProduto.unidade})` : `Quantidade (${movProduto.unidade})`}
              type="number" value={movForm.quantidade}
              onChange={(v) => setMovForm({ ...movForm, quantidade: v })} placeholder="0" required
            />
            {movTipo === "ENTRADA" && (
              <>
                <Field label="Custo unitário (R$)" type="number" value={movForm.custoUnitario} onChange={(v) => setMovForm({ ...movForm, custoUnitario: v })} placeholder="0,00" />
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <button type="button" onClick={() => setMovForm({ ...movForm, registrarDespesa: !movForm.registrarDespesa })}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${movForm.registrarDespesa ? "bg-accent-500" : "bg-surface-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${movForm.registrarDespesa ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm text-base-secondary">Lançar como despesa no financeiro</span>
                </label>
                {movForm.registrarDespesa && movForm.quantidade && movForm.custoUnitario && (
                  <p className="text-[11px] text-base-muted">Despesa: <strong className="text-base-secondary">{fmt((Number(movForm.quantidade) || 0) * (Number(movForm.custoUnitario) || 0))}</strong></p>
                )}
              </>
            )}
            <TextAreaField label="Observação" value={movForm.observacao} onChange={(v) => setMovForm({ ...movForm, observacao: v })} placeholder="opcional" rows={2} />
            <ModalActions onCancel={() => setMovProduto(null)} onSave={saveMov} saving={savingMov} saveLabel="Registrar" />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={deletar}
        title="Remover produto"
        message={`Tem certeza que deseja remover "${confirmDel?.nome}"? O histórico de movimentações é mantido.`}
        confirmLabel="Remover"
      />
    </div>
  )
}
