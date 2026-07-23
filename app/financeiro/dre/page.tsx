"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, TrendingDown, Target, DollarSign, Percent, Calendar, Settings2, BarChart3, Package } from "lucide-react"
import Link from "next/link"
import { Modal, Field, ModalActions } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

interface DREData {
  receitaBruta: number
  taxas: number
  receitaLiquida: number
  cmv: number
  lucroBruto: number
  despesasOperacionais: number
  despesasPorCategoria: { categoria: string; valor: number }[]
  comissoes: number
  ebitda: number
  proLabore: number
  lucroLiquido: number
}

interface KPIs {
  totalAtendimentos: number
  margemBruta: number
  margemLiquida: number
  ticketMedio: number
  custoAtendimento: number
  pontoEquilibrio: number
  diasDeCaixa: number
  giroEstoque: number
}

export default function DREPage() {
  const [dre, setDre] = useState<DREData | null>(null)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [periodo, setPeriodo] = useState("")
  const [mesSel, setMesSel] = useState("")
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [proLabore, setProLabore] = useState("")
  const [saldoMinimo, setSaldoMinimo] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const load = (mes?: string) => {
    setLoading(true)
    const url = mes ? `/api/financeiro/dre?mes=${mes}` : "/api/financeiro/dre"
    fetch(url).then((r) => r.json()).then((d) => {
      setDre(d.dre)
      setKpis(d.kpis)
      setPeriodo(d.periodo)
      setProLabore(String(d.dre.proLabore || ""))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const salvarConfig = async () => {
    setSaving(true)
    const res = await fetch("/api/financeiro/dre", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proLabore: parseFloat(proLabore.replace(",", ".")) || 0,
        saldoMinimo: parseFloat(saldoMinimo.replace(",", ".")) || 0,
      }),
    })
    if (res.ok) { toast("Configurações salvas"); setShowConfig(false); load(mesSel || undefined) }
    setSaving(false)
  }

  const mesesOpcoes = () => {
    const opcoes: { label: string; value: string }[] = []
    const agora = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      opcoes.push({
        label: `${meses[d.getMonth()]}/${d.getFullYear()}`,
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      })
    }
    return opcoes
  }

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  const LinhasDRE = ({ label, valor, tipo, bold, indent }: { label: string; valor: number; tipo?: "pos" | "neg" | "neutro"; bold?: boolean; indent?: boolean }) => (
    <div className={`flex items-center justify-between py-2 ${bold ? "border-t border-surface-border-light font-semibold" : ""} ${indent ? "pl-4" : ""}`}>
      <span className={`text-sm ${bold ? "text-base-primary" : "text-base-secondary"}`}>{tipo === "neg" ? `(−) ${label}` : tipo === "pos" ? `(+) ${label}` : label}</span>
      <span className={`text-sm font-medium ${valor >= 0 ? (tipo === "neg" ? "text-red-500" : "text-base-primary") : "text-red-600"}`}>
        {fmt(Math.abs(valor))}
      </span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="w-8 h-8 rounded-lg hover:bg-surface-border-light flex items-center justify-center text-base-muted">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-base-primary tracking-tight">DRE Simplificada</h1>
            <p className="text-xs text-base-muted">Demonstrativo de Resultado do Exercício — {periodo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mesSel}
            onChange={(e) => { setMesSel(e.target.value); load(e.target.value || undefined) }}
            className="text-xs border border-surface-border rounded-lg px-3 py-2 bg-surface-card text-base-primary"
          >
            {mesesOpcoes().map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button onClick={() => {
            const mes = mesSel || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
            const a = document.createElement("a")
            a.href = `/api/relatorios?tipo=dre&mes=${mes}&formato=csv`
            a.download = `dre-${mes}.csv`
            a.click()
          }} className="text-xs font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <BarChart3 size={13} /> Exportar
          </button>
          <button onClick={() => setShowConfig(true)} className="text-xs font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Settings2 size={13} /> Config
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-8 bg-surface-border-light rounded" />)}
        </div>
      ) : dre && kpis ? (
        <>
          {/* DRE */}
          <div className="glass-card rounded-2xl p-5 md:p-6">
            <h3 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-accent-600" /> Demonstrativo de Resultado
            </h3>
            <div className="divide-y divide-surface-base">
              <LinhasDRE label="Receita Bruta" valor={dre.receitaBruta} bold />
              <LinhasDRE label="Taxas de pagamento" valor={dre.taxas} tipo="neg" indent />
              <LinhasDRE label="Receita Líquida" valor={dre.receitaLiquida} bold />
              <LinhasDRE label="CMV (custo de insumos)" valor={dre.cmv} tipo="neg" indent />
              <LinhasDRE label="Lucro Bruto" valor={dre.lucroBruto} bold />
              <LinhasDRE label="Despesas operacionais" valor={dre.despesasOperacionais} tipo="neg" indent />
              {dre.despesasPorCategoria.length > 0 && dre.despesasPorCategoria.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 pl-8">
                  <span className="text-xs text-base-muted">{d.categoria}</span>
                  <span className="text-xs text-base-muted">{fmt(d.valor)}</span>
                </div>
              ))}
              <LinhasDRE label="Comissões" valor={dre.comissoes} tipo="neg" indent />
              <LinhasDRE label="EBITDA" valor={dre.ebitda} bold />
              <LinhasDRE label="Pró-labore" valor={dre.proLabore} tipo="neg" indent />
              <LinhasDRE label="Lucro Líquido" valor={dre.lucroLiquido} bold />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: "Margem bruta", value: `${kpis.margemBruta}%`, color: kpis.margemBruta >= 50 ? "text-emerald-600" : kpis.margemBruta >= 30 ? "text-amber-600" : "text-red-600", bg: kpis.margemBruta >= 50 ? "bg-emerald-50" : kpis.margemBruta >= 30 ? "bg-amber-50" : "bg-red-50" },
              { icon: Percent, label: "Margem líquida", value: `${kpis.margemLiquida}%`, color: kpis.margemLiquida >= 20 ? "text-emerald-600" : kpis.margemLiquida >= 10 ? "text-amber-600" : "text-red-600", bg: kpis.margemLiquida >= 20 ? "bg-emerald-50" : kpis.margemLiquida >= 10 ? "bg-amber-50" : "bg-red-50" },
              { icon: DollarSign, label: "Ticket médio", value: fmt(kpis.ticketMedio), color: "text-accent-600", bg: "bg-accent-50" },
              { icon: Target, label: "Ponto equilíbrio", value: fmt(kpis.pontoEquilibrio), color: "text-sky-600", bg: "bg-sky-50" },
              { icon: Calendar, label: "Dias de caixa", value: `${kpis.diasDeCaixa} dias`, color: kpis.diasDeCaixa >= 30 ? "text-emerald-600" : kpis.diasDeCaixa >= 15 ? "text-amber-600" : "text-red-600", bg: kpis.diasDeCaixa >= 30 ? "bg-emerald-50" : kpis.diasDeCaixa >= 15 ? "bg-amber-50" : "bg-red-50" },
              { icon: TrendingDown, label: "Custo/atendimento", value: fmt(kpis.custoAtendimento), color: "text-violet-600", bg: "bg-violet-50" },
              { icon: Package, label: "Giro estoque", value: `${kpis.giroEstoque}x`, color: "text-sky-600", bg: "bg-sky-50" },
              { icon: BarChart3, label: "Atendimentos", value: String(kpis.totalAtendimentos), color: "text-accent-600", bg: "bg-accent-50" },
            ].map((k, i) => (
              <div key={i} className="glass-card rounded-2xl p-4">
                <div className={`w-9 h-9 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <k.icon size={16} className={k.color} />
                </div>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[11px] text-base-muted">{k.label}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-base-muted">
          <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
          <p>Sem dados financeiros para este período</p>
        </div>
      )}

      <Modal open={showConfig} title="Configurações financeiras" onClose={() => setShowConfig(false)}>
        <Field label="Pró-labore mensal (R$)" value={proLabore} onChange={(v) => setProLabore(v)} placeholder="Ex.: 5000" />
        <p className="text-[10px] text-base-muted -mt-2 mb-3">Retirada mensal do(a) proprietário(a). Entra na DRE após o EBITDA.</p>
        <Field label="Saldo mínimo de caixa (R$)" value={saldoMinimo} onChange={(v) => setSaldoMinimo(v)} placeholder="Ex.: 2000" />
        <p className="text-[10px] text-base-muted -mt-2 mb-3">Valor de reserva — alertas serão disparados se o saldo cair abaixo.</p>
        <ModalActions onCancel={() => setShowConfig(false)} onSave={salvarConfig} saving={saving} />
      </Modal>
    </div>
  )
}
