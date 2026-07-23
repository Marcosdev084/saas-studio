"use client"

import { useState, useEffect } from "react"
import {
  DollarSign, ArrowDownRight, FileText, Sparkles,
  CircleDollarSign, Wallet, PiggyBank, Receipt, Plus, RefreshCw, Trash2, Power,
  Pencil, Check, X, CreditCard, CalendarClock, Lock, Unlock, Clock
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts"
import { Modal, Field, SelectField, ModalActions, ConfirmDialog } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface ReceitaProf {
  nome: string
  cor: string | null
  receita: number
  comissaoPct: number
  comissao: number
}

interface ReceitaServico {
  nome: string
  valor: number
  cor: string
  pct: number
}

interface Projecao {
  dia: string
  previsto: number
}

interface Evolucao {
  mes: string
  receita: number
  despesa: number
}

interface Despesa {
  id: string
  descricao: string
  categoria: string | null
  valor: number
  dataTransacao: string
}

interface Recorrente {
  id: string
  descricao: string
  valor: number
  categoria: string | null
  diaVencimento: number | null
  pagoEm: string | null
  ativo: boolean
  ultimoRegistro: string | null
  criadoEm: string
}

interface ContaPagarResumo {
  id: string
  descricao: string
  valor: number
  dataVencimento: string
  status: string
  fornecedor: string | null
}

interface ContasPagarData {
  totalPendente: number
  countPendente: number
  totalVencido: number
  countVencido: number
  proximas: ContaPagarResumo[]
}

interface FinanceiroData {
  kpis: {
    receita: number
    despesas: number
    lucro: number
    comissoes: number
    cmv: number
  }
  receitaPorProf: ReceitaProf[]
  receitaPorServico: ReceitaServico[]
  projecao: Projecao[]
  totalProjecao: number
  evolucao: Evolucao[]
  despesasRecentes: Despesa[]
  recorrentes: Recorrente[]
  margemPorServico: MargemServico[]
  contasPagar?: ContasPagarData
}

interface MargemServico {
  nome: string
  preco: number
  custoInsumos: number
  margem: number
  margemPct: number
}

interface Recebivel {
  id: string; descricao: string; cliente: string | null; valor: number; valorLiquido: number
  dataPrevista: string; origem: string; origemLabel: string; vencido: boolean
}
interface FormaPag {
  id?: string; nome: string; tipo: string; taxaPercentual: number; diasRecebimento: number; ativo: boolean
}

const categoriasDespesa = [
  "Aluguel", "Materiais", "Produtos", "Equipamentos", "Manutenção",
  "Marketing", "Energia", "Água", "Internet", "Salários", "Impostos", "Outros",
]

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("mes")
  const { toast } = useToast()

  const [showDespesa, setShowDespesa] = useState(false)
  const [saving, setSaving] = useState(false)
  const [despForm, setDespForm] = useState({ descricao: "", valor: "", categoria: "", data: toLocalISO(new Date()), recorrente: false, diaVencimento: "" })
  const [despError, setDespError] = useState("")

  const [recebiveis, setRecebiveis] = useState<Recebivel[]>([])
  const [recebiveisStats, setRecebiveisStats] = useState({ totalPendente: 0, totalVencido: 0, quantidade: 0 })
  const [showFormas, setShowFormas] = useState(false)
  const [formasEdit, setFormasEdit] = useState<FormaPag[]>([])
  const [savingFormas, setSavingFormas] = useState(false)

  // Caixa diário
  const [caixa, setCaixa] = useState<any>(null)
  const [caixaMov, setCaixaMov] = useState({ totalEntradas: 0, totalSaidas: 0 })
  const [caixaHistorico, setCaixaHistorico] = useState<any[]>([])
  const [showAbrirCaixa, setShowAbrirCaixa] = useState(false)
  const [showFecharCaixa, setShowFecharCaixa] = useState(false)
  const [caixaSaldoInicial, setCaixaSaldoInicial] = useState("")
  const [caixaSaldoConferido, setCaixaSaldoConferido] = useState("")
  const [caixaObs, setCaixaObs] = useState("")
  const [caixaSaving, setCaixaSaving] = useState(false)

  const loadCaixa = () => {
    fetch("/api/financeiro/caixa").then((r) => r.json()).then((d) => {
      setCaixa(d.caixaHoje)
      setCaixaMov(d.movimentacoesHoje ?? { totalEntradas: 0, totalSaidas: 0 })
      setCaixaHistorico(d.historico ?? [])
    }).catch(() => {})
  }

  const abrirCaixa = async () => {
    const valor = parseFloat(caixaSaldoInicial.replace(",", "."))
    if (isNaN(valor) || valor < 0) return
    setCaixaSaving(true)
    const res = await fetch("/api/financeiro/caixa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saldoInicial: valor }) })
    if (res.ok) { setShowAbrirCaixa(false); setCaixaSaldoInicial(""); toast("Caixa aberto"); loadCaixa() }
    else { const e = await res.json(); toast(e.error ?? "Erro ao abrir caixa") }
    setCaixaSaving(false)
  }

  const fecharCaixa = async () => {
    const valor = parseFloat(caixaSaldoConferido.replace(",", "."))
    if (isNaN(valor) || valor < 0) return
    setCaixaSaving(true)
    const res = await fetch("/api/financeiro/caixa", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saldoConferido: valor, observacoes: caixaObs }) })
    if (res.ok) { setShowFecharCaixa(false); setCaixaSaldoConferido(""); setCaixaObs(""); toast("Caixa fechado"); loadCaixa() }
    else { const e = await res.json(); toast(e.error ?? "Erro ao fechar caixa") }
    setCaixaSaving(false)
  }

  const load = () => {
    Promise.all([
      fetch("/api/financeiro").then((r) => r.json()),
      fetch("/api/recebiveis").then((r) => r.json()),
    ]).then(([fin, rec]) => {
      setData(fin)
      if (Array.isArray(rec?.recebiveis)) { setRecebiveis(rec.recebiveis); setRecebiveisStats(rec.stats) }
      setLoading(false)
    }).catch(() => setLoading(false))
    loadCaixa()
  }

  useEffect(() => { load() }, [])

  const receber = async (id: string) => {
    await fetch("/api/recebiveis", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    toast("Recebimento confirmado")
    load()
  }

  const abrirFormas = () => {
    fetch("/api/formas-pagamento").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setFormasEdit(d) }).catch(() => {})
    setShowFormas(true)
  }

  const salvarFormas = async () => {
    setSavingFormas(true)
    await fetch("/api/formas-pagamento", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formas: formasEdit }) })
    setSavingFormas(false); setShowFormas(false)
    toast("Formas de pagamento atualizadas")
  }

  const salvarDespesa = async () => {
    if (!despForm.descricao.trim() || !despForm.valor) {
      setDespError("Descrição e valor são obrigatórios"); return
    }
    const valor = parseFloat(despForm.valor.replace(",", "."))
    if (isNaN(valor) || valor <= 0) {
      setDespError("Valor inválido"); return
    }
    setSaving(true); setDespError("")
    try {
      const res = await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: despForm.descricao, valor, categoria: despForm.categoria,
          dataTransacao: despForm.recorrente ? undefined : despForm.data,
          recorrente: despForm.recorrente,
          diaVencimento: despForm.recorrente && despForm.diaVencimento ? despForm.diaVencimento : undefined,
        }),
      })
      if (!res.ok) { const e = await res.json(); setDespError(e.error); setSaving(false); return }
      setShowDespesa(false)
      setDespForm({ descricao: "", valor: "", categoria: "", data: toLocalISO(new Date()), recorrente: false, diaVencimento: "" })
      toast(despForm.recorrente ? "Despesa recorrente criada" : "Despesa registrada com sucesso")
      load()
    } catch { setDespError("Erro ao salvar") }
    setSaving(false)
  }

  const toggleRecorrente = async (id: string, ativo: boolean) => {
    await fetch("/api/financeiro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo }),
    })
    toast(ativo ? "Recorrência ativada" : "Recorrência pausada")
    load()
  }

  const togglePago = async (id: string, pago: boolean) => {
    await fetch("/api/financeiro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pago }),
    })
    toast(pago ? "Pagamento confirmado" : "Pagamento desmarcado")
    load()
  }

  const deletarRecorrente = async (id: string) => {
    await fetch(`/api/financeiro?id=${id}`, { method: "DELETE" })
    toast("Despesa recorrente excluída")
    load()
  }

  const [editDesp, setEditDesp] = useState<{ id: string; descricao: string; valor: string; categoria: string } | null>(null)
  const [savingDesp, setSavingDesp] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ tipo: "recorrente" | "despesa"; id: string; nome: string } | null>(null)

  const iniciarEdicao = (d: Despesa) => {
    setEditDesp({ id: d.id, descricao: d.descricao, valor: String(Number(d.valor)), categoria: d.categoria ?? "" })
  }

  const salvarEdicao = async () => {
    if (!editDesp) return
    const valor = parseFloat(editDesp.valor.replace(",", "."))
    if (!editDesp.descricao.trim() || isNaN(valor) || valor <= 0) return
    setSavingDesp(true)
    await fetch("/api/financeiro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editDesp.id, tipo: "transacao", descricao: editDesp.descricao, valor, categoria: editDesp.categoria }),
    })
    setEditDesp(null)
    setSavingDesp(false)
    toast("Despesa atualizada")
    load()
  }

  const deletarDespesa = async (id: string) => {
    await fetch(`/api/financeiro?id=${id}&tipo=transacao`, { method: "DELETE" })
    toast("Despesa excluída")
    load()
  }

  function pagoEsteMes(pagoEm: string | null): boolean {
    if (!pagoEm) return false
    const d = new Date(pagoEm)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  const lucroPositivo = (data?.kpis.lucro ?? 0) >= 0
  const totalRecorrente = (data?.recorrentes ?? []).filter((r) => r.ativo).reduce((sum, r) => sum + Number(r.valor), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-base-primary tracking-tight">Financeiro</h1>
          <p className="text-xs text-base-muted">Dados em tempo real do banco de dados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDespesa(true)}
            className="text-xs sm:text-sm font-medium text-white bg-red-500 hover:bg-red-600 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
            <Plus size={15} /> <span className="hidden sm:inline">Registrar despesa</span><span className="sm:hidden">Despesa</span>
          </button>
          <button onClick={() => {
            const now = new Date()
            const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
            const a = document.createElement("a")
            a.href = `/api/relatorios?tipo=fluxo-caixa&mes=${mes}&formato=csv`
            a.download = `fluxo-caixa-${mes}.csv`
            a.click()
            toast("Relatório exportado com sucesso")
          }} className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <FileText size={15} /> <span className="hidden sm:inline">Exportar</span>
          </button>
          <Link href="/financeiro/comissoes"
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <DollarSign size={15} /> <span className="hidden sm:inline">Comissões</span>
          </Link>
          <Link href="/financeiro/contas-pagar"
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Receipt size={15} /> <span className="hidden sm:inline">Contas a pagar</span>
          </Link>
          <Link href="/financeiro/dre"
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <FileText size={15} /> <span className="hidden sm:inline">DRE</span>
          </Link>
          <button onClick={abrirFormas}
            className="text-xs sm:text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <CreditCard size={15} /> <span className="hidden sm:inline">Formas de pagamento</span>
          </button>
        </div>
      </div>

      {/* Caixa diário */}
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${caixa?.aberto ? "bg-emerald-50" : "bg-surface-border-light"}`}>
              {caixa?.aberto ? <Unlock size={18} className="text-emerald-600" /> : <Lock size={18} className="text-base-muted" />}
            </div>
            <div>
              <p className="text-sm font-bold text-base-primary">
                Caixa do dia {new Date().toLocaleDateString("pt-BR")}
              </p>
              {caixa?.aberto ? (
                <p className="text-xs text-emerald-600 font-medium">
                  Aberto · Saldo inicial: R$ {caixa.saldoInicial.toLocaleString("pt-BR")} · Entradas: R$ {caixaMov.totalEntradas.toLocaleString("pt-BR")} · Saídas: R$ {caixaMov.totalSaidas.toLocaleString("pt-BR")} · <span className="font-semibold">Saldo esperado: R$ {caixa.saldoEsperado.toLocaleString("pt-BR")}</span>
                </p>
              ) : caixa && !caixa.aberto ? (
                <p className="text-xs text-base-muted">
                  Fechado · Final: R$ {caixa.saldoFinal?.toLocaleString("pt-BR")} · Conferido: R$ {caixa.saldoConferido?.toLocaleString("pt-BR")}
                  {caixa.diferenca !== 0 && <span className={caixa.diferenca > 0 ? " text-emerald-600" : " text-red-500"}> · Diferença: R$ {caixa.diferenca?.toLocaleString("pt-BR")}</span>}
                </p>
              ) : (
                <p className="text-xs text-base-muted">Caixa não aberto hoje</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!caixa ? (
              <button onClick={() => setShowAbrirCaixa(true)} className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Unlock size={13} /> Abrir caixa
              </button>
            ) : caixa.aberto ? (
              <button onClick={() => setShowFecharCaixa(true)} className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Lock size={13} /> Fechar caixa
              </button>
            ) : null}
          </div>
        </div>

        {/* Histórico mini */}
        {caixaHistorico.length > 0 && (
          <details className="mt-3">
            <summary className="text-[11px] text-base-muted cursor-pointer hover:text-base-secondary">
              <Clock size={11} className="inline mr-1" />Histórico ({caixaHistorico.length} dias)
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {caixaHistorico.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-surface-base">
                  <span className="text-base-secondary">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                  <span className="text-base-secondary">Ini: R$ {h.saldoInicial.toLocaleString("pt-BR")}</span>
                  <span className="text-emerald-600">+R$ {h.totalEntradas.toLocaleString("pt-BR")}</span>
                  <span className="text-red-500">-R$ {h.totalSaidas.toLocaleString("pt-BR")}</span>
                  <span className="font-medium text-base-primary">Final: R$ {h.saldoFinal.toLocaleString("pt-BR")}</span>
                  {h.diferenca != null && h.diferenca !== 0 && (
                    <span className={h.diferenca > 0 ? "text-emerald-600" : "text-red-500"}>Dif: R$ {h.diferenca.toLocaleString("pt-BR")}</span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modal abrir caixa */}
      <Modal open={showAbrirCaixa} title="Abrir caixa do dia" onClose={() => setShowAbrirCaixa(false)}>
        <Field label="Saldo inicial (gaveta)" value={caixaSaldoInicial} onChange={(v) => setCaixaSaldoInicial(v)} placeholder="0,00" />
        <ModalActions onCancel={() => setShowAbrirCaixa(false)} onSave={abrirCaixa} saving={caixaSaving} saveLabel="Abrir caixa" />
      </Modal>

      {/* Modal fechar caixa */}
      <Modal open={showFecharCaixa} title="Fechar caixa do dia" onClose={() => setShowFecharCaixa(false)}>
        <div className="mb-3 p-3 bg-surface-base rounded-lg text-xs space-y-1">
          <p>Saldo inicial: <span className="font-semibold">R$ {caixa?.saldoInicial?.toLocaleString("pt-BR") ?? "0"}</span></p>
          <p>Entradas: <span className="font-semibold text-emerald-600">R$ {caixaMov.totalEntradas.toLocaleString("pt-BR")}</span></p>
          <p>Saídas: <span className="font-semibold text-red-500">R$ {caixaMov.totalSaidas.toLocaleString("pt-BR")}</span></p>
          <p className="border-t border-surface-border-light pt-1 mt-1">Saldo esperado: <span className="font-bold">R$ {caixa?.saldoEsperado?.toLocaleString("pt-BR") ?? "0"}</span></p>
        </div>
        <Field label="Saldo conferido (contagem de gaveta)" value={caixaSaldoConferido} onChange={(v) => setCaixaSaldoConferido(v)} placeholder="0,00" />
        <Field label="Observações (opcional)" value={caixaObs} onChange={(v) => setCaixaObs(v)} placeholder="Ex.: troco para amanhã..." />
        <ModalActions onCancel={() => setShowFecharCaixa(false)} onSave={fecharCaixa} saving={caixaSaving} saveLabel="Fechar caixa" />
      </Modal>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-surface-border-light mb-3" />
              <div className="h-6 bg-surface-border-light rounded w-24 mb-1" />
              <div className="h-4 bg-surface-border-light rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: CircleDollarSign, label: "Receita bruta", value: `R$ ${data?.kpis.receita.toLocaleString("pt-BR") ?? "0"}`, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Wallet, label: "Despesas operacionais", value: `R$ ${data?.kpis.despesas.toLocaleString("pt-BR") ?? "0"}`, color: "text-red-500", bg: "bg-red-50" },
            { icon: PiggyBank, label: "Lucro líquido", value: `R$ ${data?.kpis.lucro.toLocaleString("pt-BR") ?? "0"}`, color: lucroPositivo ? "text-accent-600" : "text-red-600", bg: lucroPositivo ? "bg-accent-50" : "bg-red-50" },
            { icon: Receipt, label: "Comissões a pagar", value: `R$ ${data?.kpis.comissoes.toLocaleString("pt-BR") ?? "0"}`, color: "text-violet-600", bg: "bg-violet-50" },
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

      {/* AI Insight */}
      {!loading && data && (
        <div className="bg-gradient-to-r from-accent-50 to-accent-50/60 border border-accent-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-accent-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-base-primary">Resumo financeiro</p>
              <p className="text-xs text-accent-600 mt-1">
                Receita total de R$ {data.kpis.receita.toLocaleString("pt-BR")} com margem líquida de {data.kpis.receita > 0 ? Math.round((data.kpis.lucro / data.kpis.receita) * 100) : 0}%.
                {data.receitaPorProf.length > 0 && ` ${data.receitaPorProf[0].nome} lidera com R$ ${data.receitaPorProf[0].receita.toLocaleString("pt-BR")} em receita.`}
                {" "}Total de comissões a pagar: R$ {data.kpis.comissoes.toLocaleString("pt-BR")}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Revenue evolution */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-4 md:p-5">
          <h3 className="text-sm font-bold text-base-primary mb-4">Evolução de receita vs despesas</h3>
          {loading ? (
            <div className="h-[240px] bg-surface-base rounded animate-pulse" />
          ) : (data?.evolucao ?? []).some((e) => e.receita > 0 || e.despesa > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.evolucao ?? []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#105a73" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#105a73" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, ""]} />
                <Area type="monotone" dataKey="receita" stroke="#105a73" strokeWidth={2} fill="url(#revGrad)" name="Receita" />
                <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" fill="none" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-base-muted/60">
              <div className="text-center">
                <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                <p>Sem dados financeiros no período</p>
              </div>
            </div>
          )}
        </div>

        {/* Revenue by service */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-base-primary mb-4">Receita por serviço</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-surface-border-light rounded w-full mb-1" />
                  <div className="h-1.5 bg-surface-base rounded w-full" />
                </div>
              ))}
            </div>
          ) : (data?.receitaPorServico ?? []).length > 0 ? (
            <div className="space-y-3">
              {(data?.receitaPorServico ?? []).map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                      <span className="text-base-secondary">{s.nome}</span>
                    </div>
                    <span className="font-semibold text-accent-700">R$ {s.valor.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="w-full bg-surface-border-light rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.cor }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-muted/60 text-center py-8">Sem serviços cadastrados</p>
          )}
        </div>
      </div>

      {/* Margem real por serviço */}
      {!loading && (data?.margemPorServico ?? []).some((s) => s.custoInsumos > 0) && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-base-primary">Margem real por serviço</h3>
            {(data?.kpis.cmv ?? 0) > 0 && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">CMV mês: R$ {data?.kpis.cmv.toLocaleString("pt-BR")}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-base-muted border-b border-surface-border-light">
                  <th className="pb-2 font-medium">Serviço</th>
                  <th className="pb-2 font-medium text-right">Preço</th>
                  <th className="pb-2 font-medium text-right">Custo insumos</th>
                  <th className="pb-2 font-medium text-right">Margem</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-base">
                {(data?.margemPorServico ?? []).filter((s) => s.custoInsumos > 0).map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-base-primary font-medium">{s.nome}</td>
                    <td className="py-2.5 text-right text-base-secondary">R$ {s.preco.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 text-right text-red-500">R$ {s.custoInsumos.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">R$ {s.margem.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.margemPct >= 60 ? "bg-emerald-50 text-emerald-600" : s.margemPct >= 30 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                        {s.margemPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Commissions by professional */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-base-primary mb-4">Receita e comissões por profissional</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-surface-border-light animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-surface-border-light" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-surface-border-light rounded w-24" />
                    <div className="h-3 bg-surface-border-light rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (data?.receitaPorProf ?? []).length > 0 ? (
            <div className="space-y-4">
              {(data?.receitaPorProf ?? []).map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-surface-border-light">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: p.cor ?? "#105a73" }}>
                    {p.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-primary">{p.nome}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-base-muted">Receita: <span className="font-semibold text-accent-700">R$ {p.receita.toLocaleString("pt-BR")}</span></span>
                      <span className="text-xs text-base-muted">Comissão ({p.comissaoPct}%): <span className="font-semibold text-accent-600">R$ {p.comissao.toLocaleString("pt-BR")}</span></span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-surface-border-light">
                <span className="text-sm font-semibold text-accent-700">Total de comissões</span>
                <span className="text-sm font-bold text-accent-600">R$ {data?.kpis.comissoes.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-base-muted/60 text-center py-8">Sem profissionais cadastrados</p>
          )}
        </div>

        {/* Projection */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-base-primary mb-1">Projeção de receita -- próximos dias</h3>
          <p className="text-xs text-base-muted mb-4">Baseada nos agendamentos confirmados</p>
          {loading ? (
            <div className="h-[200px] bg-surface-base rounded-lg animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.projecao ?? []} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v?.toLocaleString("pt-BR") || "—"}`, "Previsto"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="previsto" fill="#105a73" radius={[6, 6, 0, 0]} opacity={0.6} name="Previsto" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700">
                  <span className="font-semibold">Previsão da semana:</span> R$ {data?.totalProjecao.toLocaleString("pt-BR")} baseado nos agendamentos
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contas a receber */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-sky-500" />
            <h3 className="text-sm font-bold text-base-primary">Contas a receber</h3>
            {recebiveisStats.quantidade > 0 && (
              <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">R$ {recebiveisStats.totalPendente.toLocaleString("pt-BR")}</span>
            )}
          </div>
          {recebiveisStats.totalVencido > 0 && (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">R$ {recebiveisStats.totalVencido.toLocaleString("pt-BR")} vencido</span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 bg-surface-base rounded animate-pulse" />)}</div>
        ) : recebiveis.length > 0 ? (
          <div className="space-y-2">
            {recebiveis.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border-light">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.vencido ? "bg-red-50" : "bg-sky-50"}`}>
                  <CreditCard size={16} className={r.vencido ? "text-red-500" : "text-sky-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-base-primary truncate">{r.cliente ?? r.descricao}</p>
                  <p className="text-[11px] text-base-muted">
                    {r.origemLabel} · prev. {new Date(r.dataPrevista).toLocaleDateString("pt-BR")}
                    {r.vencido && <span className="text-red-500 font-medium"> · vencido</span>}
                  </p>
                </div>
                <span className="text-sm font-semibold text-sky-600 shrink-0">R$ {r.valorLiquido.toLocaleString("pt-BR")}</span>
                <button onClick={() => receber(r.id)} className="text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg shrink-0">Receber</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-base-muted/60">
            <CalendarClock size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum recebível pendente</p>
            <p className="text-[10px] mt-1">Pagamentos em cartão de crédito aparecem aqui até a data de recebimento</p>
          </div>
        )}
      </div>

      {/* Contas a pagar - resumo */}
      {!loading && data?.contasPagar && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-base-primary">Contas a pagar</h3>
              {data.contasPagar.countPendente > 0 && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {data.contasPagar.countPendente} pendente{data.contasPagar.countPendente > 1 ? "s" : ""}
                </span>
              )}
              {data.contasPagar.countVencido > 0 && (
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {data.contasPagar.countVencido} vencida{data.contasPagar.countVencido > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Link href="/financeiro/contas-pagar" className="text-xs text-accent-600 hover:text-accent-700 font-medium">
              Ver todas →
            </Link>
          </div>

          {/* KPIs inline */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-600 font-medium">Pendente</p>
              <p className="text-lg font-bold text-amber-700">R$ {data.contasPagar.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-[10px] text-red-600 font-medium">Vencido</p>
              <p className="text-lg font-bold text-red-700">R$ {data.contasPagar.totalVencido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Próximas contas */}
          {data.contasPagar.proximas.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-base-muted font-medium">Próximos vencimentos (7 dias)</p>
              {data.contasPagar.proximas.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border-light">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.status === "VENCIDO" ? "bg-red-50" : "bg-amber-50"}`}>
                    <Receipt size={16} className={c.status === "VENCIDO" ? "text-red-500" : "text-amber-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-base-primary truncate">{c.descricao}</p>
                    <p className="text-[11px] text-base-muted">
                      {c.fornecedor && <span>{c.fornecedor} · </span>}
                      Venc. {new Date(c.dataVencimento).toLocaleDateString("pt-BR")}
                      {c.status === "VENCIDO" && <span className="text-red-500 font-medium"> · vencido</span>}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${c.status === "VENCIDO" ? "text-red-500" : "text-amber-600"}`}>
                    R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-base-muted/60">
              <Receipt size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conta vencendo nos próximos 7 dias</p>
            </div>
          )}
        </div>
      )}

      {/* Despesas recorrentes */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-base-primary">Despesas recorrentes</h3>
            {totalRecorrente > 0 && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                R$ {totalRecorrente.toLocaleString("pt-BR")}/mês
              </span>
            )}
          </div>
          <button onClick={() => { setDespForm({ descricao: "", valor: "", categoria: "", data: toLocalISO(new Date()), recorrente: true, diaVencimento: "" }); setShowDespesa(true) }}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-surface-base rounded animate-pulse" />)}
          </div>
        ) : (data?.recorrentes ?? []).length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {(data?.recorrentes ?? []).map((r) => (
                <div key={r.id} className={`p-3 rounded-2xl border ${r.ativo ? "border-surface-border-light" : "border-surface-base opacity-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <RefreshCw size={12} className={r.ativo ? "text-amber-400" : "text-base-muted/60"} />
                      <span className={`text-sm font-medium truncate ${r.ativo ? "text-accent-700" : "text-base-muted line-through"}`}>{r.descricao}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500 shrink-0 ml-2">R$ {Number(r.valor).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] mb-3">
                    {r.categoria && <span className="bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">{r.categoria}</span>}
                    {r.diaVencimento && <span className="text-base-secondary">Venc. dia {String(r.diaVencimento).padStart(2, "0")}</span>}
                    <span className={`font-semibold px-1.5 py-0.5 rounded-full ${r.ativo ? "bg-emerald-50 text-emerald-600" : "bg-surface-border-light text-base-muted"}`}>
                      {r.ativo ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-base-muted">Pago</span>
                      <button type="button" onClick={() => togglePago(r.id, !pagoEsteMes(r.pagoEm))}
                        className={`relative w-9 h-[18px] rounded-full transition-colors ${pagoEsteMes(r.pagoEm) ? "bg-emerald-500" : "bg-surface-border"}`}>
                        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform ${pagoEsteMes(r.pagoEm) ? "translate-x-[18px]" : ""}`} />
                      </button>
                      {pagoEsteMes(r.pagoEm) && (
                        <span className="text-[9px] text-emerald-500 font-medium">{new Date(r.pagoEm!).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleRecorrente(r.id, !r.ativo)}
                        className={`p-1.5 rounded-lg hover:bg-surface-border-light ${r.ativo ? "text-amber-500" : "text-emerald-500"}`}
                        title={r.ativo ? "Pausar" : "Ativar"}>
                        <Power size={13} />
                      </button>
                      <button onClick={() => setConfirmDel({ tipo: "recorrente", id: r.id, nome: r.descricao })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500"
                        title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-base-muted border-b border-surface-border-light">
                    <th className="pb-2 font-medium">Descrição</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium text-center">Vencimento</th>
                    <th className="pb-2 font-medium text-center">Pago</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Último registro</th>
                    <th className="pb-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-base">
                  {(data?.recorrentes ?? []).map((r) => (
                    <tr key={r.id} className="group">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <RefreshCw size={12} className={r.ativo ? "text-amber-400" : "text-base-muted/60"} />
                          <span className={`font-medium ${r.ativo ? "text-accent-700" : "text-base-muted line-through"}`}>{r.descricao}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {r.categoria ? (
                          <span className="text-[10px] bg-surface-border-light text-base-secondary px-1.5 py-0.5 rounded">{r.categoria}</span>
                        ) : (
                          <span className="text-base-muted/60">--</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-semibold text-red-500">R$ {Number(r.valor).toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-center">
                        {r.diaVencimento ? (
                          <span className="text-xs text-base-secondary">Dia {String(r.diaVencimento).padStart(2, "0")}</span>
                        ) : (
                          <span className="text-xs text-base-muted/60">--</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => togglePago(r.id, !pagoEsteMes(r.pagoEm))}
                            className={`relative w-9 h-[18px] rounded-full transition-colors ${pagoEsteMes(r.pagoEm) ? "bg-emerald-500" : "bg-surface-border"}`}>
                            <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform ${pagoEsteMes(r.pagoEm) ? "translate-x-[18px]" : ""}`} />
                          </button>
                          {pagoEsteMes(r.pagoEm) && (
                            <span className="text-[9px] text-emerald-500 font-medium">
                              {new Date(r.pagoEm!).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.ativo ? "bg-emerald-50 text-emerald-600" : "bg-surface-border-light text-base-muted"}`}>
                          {r.ativo ? "Ativa" : "Pausada"}
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-base-muted">
                        {r.ultimoRegistro ? new Date(r.ultimoRegistro).toLocaleDateString("pt-BR") : "Aguardando dia 01"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleRecorrente(r.id, !r.ativo)}
                            className={`p-1.5 rounded-lg hover:bg-surface-border-light ${r.ativo ? "text-amber-500" : "text-emerald-500"}`}
                            title={r.ativo ? "Pausar" : "Ativar"}>
                            <Power size={13} />
                          </button>
                          <button onClick={() => setConfirmDel({ tipo: "recorrente", id: r.id, nome: r.descricao })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500"
                            title="Excluir">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-base-muted/60">
            <RefreshCw size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma despesa recorrente cadastrada</p>
            <p className="text-[10px] mt-1">Despesas recorrentes são registradas automaticamente todo dia 01</p>
          </div>
        )}
      </div>

      {/* Despesas recentes */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-base-primary">Despesas recentes</h3>
          <button onClick={() => { setDespForm({ descricao: "", valor: "", categoria: "", data: toLocalISO(new Date()), recorrente: false, diaVencimento: "" }); setShowDespesa(true) }}
            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
            <Plus size={13} /> Nova despesa
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-surface-base rounded animate-pulse" />)}
          </div>
        ) : (data?.despesasRecentes ?? []).length > 0 ? (
          <div className="divide-y divide-surface-base">
            {(data?.despesasRecentes ?? []).map((d) => (
              <div key={d.id} className="group">
                {editDesp?.id === d.id ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-2">
                    <input value={editDesp.descricao} onChange={(e) => setEditDesp({ ...editDesp, descricao: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                      placeholder="Descrição" />
                    <div className="flex items-center gap-2">
                      <input value={editDesp.valor} onChange={(e) => setEditDesp({ ...editDesp, valor: e.target.value })}
                        className="w-24 px-2 py-1.5 border border-surface-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                        placeholder="Valor" />
                      <select value={editDesp.categoria} onChange={(e) => setEditDesp({ ...editDesp, categoria: e.target.value })}
                        className="w-32 px-2 py-1.5 border border-surface-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent-400/30">
                        <option value="">Sem categoria</option>
                        {categoriasDespesa.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={salvarEdicao} disabled={savingDesp}
                        className="p-1.5 rounded-lg bg-accent-50 text-accent-600 hover:bg-accent-100">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditDesp(null)}
                        className="p-1.5 rounded-lg bg-surface-base text-base-muted hover:bg-surface-border-light">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <ArrowDownRight size={14} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-accent-700">{d.descricao}</p>
                        <p className="text-[10px] text-base-muted">
                          {d.categoria && <span className="bg-surface-border-light px-1.5 py-0.5 rounded mr-1.5">{d.categoria}</span>}
                          {new Date(d.dataTransacao).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-500">- R$ {Number(d.valor).toLocaleString("pt-BR")}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => iniciarEdicao(d)}
                          className="p-1.5 rounded-lg hover:bg-surface-border-light text-base-muted hover:text-base-secondary"
                          title="Editar">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setConfirmDel({ tipo: "despesa", id: d.id, nome: d.descricao })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-base-muted hover:text-red-500"
                          title="Excluir">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-base-muted/60">
            <Wallet size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma despesa registrada</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return
          if (confirmDel.tipo === "recorrente") await deletarRecorrente(confirmDel.id)
          else await deletarDespesa(confirmDel.id)
          setConfirmDel(null)
        }}
        title={confirmDel?.tipo === "recorrente" ? "Excluir despesa recorrente" : "Excluir despesa"}
        message={`Tem certeza que deseja excluir "${confirmDel?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      {/* Modal: Registrar Despesa */}
      <Modal open={showDespesa} onClose={() => setShowDespesa(false)} title={despForm.recorrente ? "Nova Despesa Recorrente" : "Registrar Despesa"}>
        <div className="space-y-4">
          {despError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{despError}</div>}

          <Field label="Descrição" value={despForm.descricao} onChange={(v) => setDespForm({ ...despForm, descricao: v })} required placeholder="Ex: Compra de shampoo profissional" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)" value={despForm.valor} onChange={(v) => setDespForm({ ...despForm, valor: v })} required placeholder="150,00" />
            <SelectField label="Categoria" value={despForm.categoria} onChange={(v) => setDespForm({ ...despForm, categoria: v })}
              options={categoriasDespesa.map((c) => ({ value: c, label: c }))} />
          </div>

          {!despForm.recorrente && (
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Data</label>
              <input type="date" value={despForm.data} onChange={(e) => setDespForm({ ...despForm, data: e.target.value })}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface-base">
            <button type="button" onClick={() => setDespForm({ ...despForm, recorrente: !despForm.recorrente })}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${despForm.recorrente ? "bg-amber-500" : "bg-surface-border"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${despForm.recorrente ? "translate-x-5" : ""}`} />
            </button>
            <div>
              <p className="text-xs font-medium text-accent-700">Despesa recorrente</p>
              <p className="text-[10px] text-base-muted">Registrada automaticamente todo dia 01 de cada mês</p>
            </div>
          </div>

          {despForm.recorrente && (
            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Dia de vencimento</label>
              <select value={despForm.diaVencimento} onChange={(e) => setDespForm({ ...despForm, diaVencimento: e.target.value })}
                className="w-full px-3 py-2.5 border border-surface-border rounded-xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30">
                <option value="">Sem vencimento definido</option>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Dia {String(d).padStart(2, "0")}</option>
                ))}
              </select>
              <p className="text-[10px] text-base-muted mt-1">Dia do mês em que o pagamento vence</p>
            </div>
          )}

          <ModalActions onCancel={() => setShowDespesa(false)} onSave={salvarDespesa} saving={saving}
            saveLabel={despForm.recorrente ? "Salvar recorrência" : "Registrar despesa"} />
        </div>
      </Modal>

      {/* Modal: Formas de pagamento */}
      <Modal open={showFormas} onClose={() => setShowFormas(false)} title="Formas de pagamento" wide>
        <div className="space-y-3">
          <p className="text-xs text-base-muted">Configure a taxa e o prazo de recebimento de cada forma. Cartão de crédito costuma receber em ~30 dias com taxa ~3,5% — isso alimenta a receita líquida e as contas a receber.</p>
          <div className="space-y-2">
            {formasEdit.map((f, idx) => (
              <div key={f.id ?? idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-surface-border-light">
                <input value={f.nome} onChange={(e) => setFormasEdit((prev) => prev.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))}
                  className="col-span-4 px-2 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/30" placeholder="Nome" />
                <div className="col-span-3 flex items-center gap-1">
                  <input type="number" step="0.1" value={f.taxaPercentual} onChange={(e) => setFormasEdit((prev) => prev.map((x, i) => i === idx ? { ...x, taxaPercentual: Number(e.target.value) } : x))}
                    className="w-full px-2 py-1.5 border border-surface-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                  <span className="text-[10px] text-base-muted shrink-0">% taxa</span>
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  <input type="number" value={f.diasRecebimento} onChange={(e) => setFormasEdit((prev) => prev.map((x, i) => i === idx ? { ...x, diasRecebimento: Number(e.target.value) } : x))}
                    className="w-full px-2 py-1.5 border border-surface-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
                  <span className="text-[10px] text-base-muted shrink-0">dias</span>
                </div>
                <button onClick={() => setFormasEdit((prev) => prev.map((x, i) => i === idx ? { ...x, ativo: !x.ativo } : x))}
                  className={`col-span-2 text-[10px] font-medium px-2 py-1.5 rounded-lg ${f.ativo ? "bg-emerald-50 text-emerald-600" : "bg-surface-base text-base-muted"}`}>
                  {f.ativo ? "Ativa" : "Inativa"}
                </button>
              </div>
            ))}
          </div>
          <ModalActions onCancel={() => setShowFormas(false)} onSave={salvarFormas} saving={savingFormas} saveLabel="Salvar formas" />
        </div>
      </Modal>
    </div>
  )
}
