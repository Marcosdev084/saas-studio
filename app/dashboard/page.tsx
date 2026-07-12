"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar, Users, DollarSign, Activity, Bot, ChevronRight,
  AlertTriangle, Zap, TrendingUp, ArrowUpRight, Clock, Sparkles, Package
} from "lucide-react"
import { useToast } from "@/components/ui/toast"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts"
import { StatusBadge } from "@/components/ui/cards"

interface SugestaoIA {
  id: string
  tipo: string
  titulo: string
  descricao: string
  acaoSugerida: string
}

interface Profissional {
  id: string
  nome: string
  cor: string
  totalAtendimentos: number
  receitaTotal: number
  avaliacaoMedia: number
}

interface AgendaItem {
  time: string
  client: string
  clientId: string | null
  service: string
  professional: string
  status: string
}

interface ChartItem {
  day: string
  valor: number
}

interface MixItem {
  name: string
  value: number
  color: string
}

interface DashboardData {
  kpis: {
    totalClientes: number
    totalProfissionais: number
    sugestoesPendentes: number
    atendimentosHoje: number
    receitaDia: number
    receitaPrevista: number
    horariosVagos: number
  }
  sugestoesIA: SugestaoIA[]
  profissionais: Profissional[]
  clientesEmRisco: { id: string; nome: string; scoreChurn: number }[]
  agenda: AgendaItem[]
  receitaSemana: ChartItem[]
  mixServicos: MixItem[]
  estoqueBaixo?: { total: number; produtos: { id: string; nome: string; quantidade: number; unidade: string; estoqueMinimo: number }[] }
}

const tipoIcone: Record<string, typeof AlertTriangle> = {
  RETENCAO: AlertTriangle,
  OPORTUNIDADE: Zap,
  INSIGHT: TrendingUp,
  ALERTA: AlertTriangle,
}
const tipoCor: Record<string, string> = {
  RETENCAO: "from-red-500/20 to-red-500/5",
  OPORTUNIDADE: "from-amber-500/20 to-amber-500/5",
  INSIGHT: "from-accent-400/20 to-accent-400/5",
  ALERTA: "from-red-500/20 to-red-500/5",
}
const tipoIconCor: Record<string, string> = {
  RETENCAO: "text-red-500",
  OPORTUNIDADE: "text-amber-500",
  INSIGHT: "text-accent-400",
  ALERTA: "text-red-500",
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const executarSugestao = async (s: SugestaoIA) => {
    try {
      await fetch("/api/ia", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, status: "EXECUTADA" }) })
      setDismissed([...dismissed, s.id])
      toast("Sugestão marcada como executada")
      router.push("/ia")
    } catch { toast("Erro ao executar sugestão", "error") }
  }

  const sugestoes = data?.sugestoesIA?.filter((s) => !dismissed.includes(s.id)) ?? []
  const receitaSemanaTotal = data?.receitaSemana?.reduce((s, d) => s + d.valor, 0) ?? 0

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="space-y-7 relative">
      {/* Saudação */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-[26px] font-bold text-base-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-base-muted capitalize mt-1">{hoje}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/agenda" className="text-xs font-medium text-accent-700 glass-card px-4 py-2.5 rounded-full flex items-center gap-1.5 hover:-translate-y-px">
            <Calendar size={14} /> Ver agenda
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          {
            icon: Calendar,
            label: "Atendimentos",
            value: loading ? "—" : String(data?.kpis?.atendimentosHoje ?? 0),
            sub: loading ? "" : `${data?.kpis?.horariosVagos ?? 0} vagos`,
          },
          {
            icon: DollarSign,
            label: "Receita do dia",
            value: loading ? "—" : formatCurrency(data?.kpis?.receitaDia ?? 0),
            sub: loading ? "" : `Prev. ${formatCurrency(data?.kpis?.receitaPrevista ?? 0)}`,
          },
          {
            icon: Users,
            label: "Clientes ativos",
            value: loading ? "—" : String(data?.kpis?.totalClientes ?? 0),
            sub: `${data?.kpis?.totalProfissionais ?? 0} profissionais`,
          },
          {
            icon: Sparkles,
            label: "Sugestões IA",
            value: loading ? "—" : String(data?.kpis?.sugestoesPendentes ?? 0),
            sub: "pendentes",
          },
        ].map((k, i) => (
          <div key={i} className="glass-card glass-lift rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] font-medium text-base-secondary">{k.label}</p>
              <div className="w-9 h-9 rounded-xl bg-accent-600/[0.07] flex items-center justify-center">
                <k.icon size={17} strokeWidth={1.8} className="text-accent-600" />
              </div>
            </div>
            <p className="text-[26px] leading-none font-bold text-base-primary tracking-tight">{k.value}</p>
            <p className="text-xs text-base-muted mt-2.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerta de estoque baixo */}
      {!loading && (data?.estoqueBaixo?.total ?? 0) > 0 && (
        <Link href="/estoque" className="block rounded-2xl border border-red-200 bg-red-50/60 p-4 hover:bg-red-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Package size={18} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700">
                {data?.estoqueBaixo?.total} produto{(data?.estoqueBaixo?.total ?? 0) > 1 ? "s" : ""} com estoque baixo
              </p>
              <p className="text-[11px] text-red-500/80 truncate">
                {(data?.estoqueBaixo?.produtos ?? []).map((p) => `${p.nome} (${p.quantidade} ${p.unidade})`).join(" · ")}
              </p>
            </div>
            <span className="text-[11px] font-medium text-red-600 flex items-center gap-0.5 shrink-0">Ver estoque <ArrowUpRight size={12} /></span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Assistente IA */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-800 to-accent-600 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-400/20 rounded-full blur-2xl -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-400/10 rounded-full blur-xl translate-y-6 -translate-x-6" />
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Bot size={18} className="text-accent-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Assistente IA</h3>
                <p className="text-[11px] text-white/50">
                  {loading ? "Analisando..." : `${sugestoes.length} sugestões para hoje`}
                </p>
              </div>
            </div>

            {loading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && sugestoes.slice(0, 3).map((s) => {
              const Icon = tipoIcone[s.tipo] ?? TrendingUp
              return (
                <div key={s.id} className="relative mb-2 last:mb-0">
                  <div className={`rounded-xl bg-gradient-to-r ${tipoCor[s.tipo] ?? tipoCor.INSIGHT} backdrop-blur-sm border border-white/[0.08] p-3.5`}>
                    <div className="flex items-start gap-2.5">
                      <Icon size={15} className={`${tipoIconCor[s.tipo] ?? "text-accent-400"} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white leading-snug truncate">{s.titulo}</p>
                        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{s.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 pl-[26px]">
                      <button onClick={() => executarSugestao(s)} className="text-[11px] font-semibold text-base-primary bg-accent-400 hover:bg-accent-400/90 px-3 py-1 rounded-lg transition-colors">
                        {s.acaoSugerida}
                      </button>
                      <button onClick={() => setDismissed([...dismissed, s.id])} className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 transition-colors">
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {!loading && sugestoes.length === 0 && (
              <div className="text-center py-4">
                <Bot size={24} className="mx-auto mb-1.5 text-white/20" />
                <p className="text-xs text-white/40">Tudo em dia</p>
              </div>
            )}

            {!loading && sugestoes.length > 3 && (
              <Link href="/ia" className="flex items-center justify-center gap-1 text-[11px] font-medium text-accent-400 hover:text-white mt-3 transition-colors">
                Ver todas ({sugestoes.length}) <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>

        {/* Agenda do dia */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
              <h3 className="text-sm font-bold text-base-primary">Agenda de hoje</h3>
            </div>
            <Link href="/agenda" className="text-[11px] text-base-muted hover:text-accent-600 font-medium flex items-center gap-0.5 transition-colors">
              Completa <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="rounded-2xl glass-card overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-5 bg-accent-800/[0.04] rounded-lg animate-pulse" />
                    <div className="flex-1 h-5 bg-accent-800/[0.04] rounded-lg animate-pulse" />
                    <div className="w-16 h-5 bg-accent-800/[0.04] rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (data?.agenda ?? []).length > 0 ? (
              <div className="divide-y divide-accent-800/[0.04] max-h-[132px] overflow-y-auto scroll-fade-y">
                {(data?.agenda ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-card/40 transition-colors group">
                    <span className="text-sm font-mono text-base-muted w-12 shrink-0 tabular-nums">{item.time}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/clientes/${item.clientId}`} className="text-sm font-medium text-base-primary group-hover:text-accent-600 transition-colors truncate block">
                        {item.client}
                      </Link>
                      <p className="text-[11px] text-base-muted truncate mt-0.5 hidden md:block">
                        {item.service} · {item.professional}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-accent-800/[0.03] flex items-center justify-center mx-auto mb-3">
                  <Calendar size={20} className="text-base-muted/60" />
                </div>
                <p className="text-sm text-base-muted">Nenhum agendamento</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 rounded-2xl glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
              <h3 className="text-sm font-bold text-base-primary">Receita da semana</h3>
            </div>
            <span className="text-xs font-semibold text-base-primary bg-accent-800/[0.04] px-3 py-1 rounded-lg">
              {loading ? "..." : formatCurrency(receitaSemanaTotal)}
            </span>
          </div>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-base-muted/40">Carregando...</div>
          ) : receitaSemanaTotal > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.receitaSemana ?? []}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27c5f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#27c5f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#759ba6" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#759ba6" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} width={44} />
                <Tooltip
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
                  contentStyle={{ borderRadius: 12, border: "none", background: "rgba(1,30,38,0.9)", color: "white", fontSize: 12, backdropFilter: "blur(8px)" }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                  itemStyle={{ color: "#27c5f1" }}
                  cursor={{ stroke: "#27c5f1", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="valor" stroke="#27c5f1" strokeWidth={2.5} fill="url(#receitaGrad)" dot={false} activeDot={{ r: 5, fill: "#27c5f1", stroke: "white", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent-800/[0.03] flex items-center justify-center mx-auto mb-3">
                  <DollarSign size={20} className="text-base-muted/60" />
                </div>
                <p className="text-sm text-base-muted">Sem receita esta semana</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
            <h3 className="text-sm font-bold text-base-primary">Mix de serviços</h3>
          </div>
          {loading ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-base-muted/40">Carregando...</div>
          ) : (data?.mixServicos ?? []).length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={data?.mixServicos ?? []} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {(data?.mixServicos ?? []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, ""]}
                    contentStyle={{ borderRadius: 12, border: "none", background: "rgba(1,30,38,0.9)", color: "white", fontSize: 12 }}
                    itemStyle={{ color: "#27c5f1" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {(data?.mixServicos ?? []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[12px] text-base-secondary">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-base-primary">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent-800/[0.03] flex items-center justify-center mx-auto mb-3">
                  <Activity size={20} className="text-base-muted/60" />
                </div>
                <p className="text-sm text-base-muted">Sem dados</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profissionais */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
            <h3 className="text-sm font-bold text-base-primary">Profissionais</h3>
          </div>
          <Link href="/profissionais" className="text-[11px] text-base-muted hover:text-accent-600 font-medium flex items-center gap-0.5 transition-colors">
            Ver todos <ArrowUpRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl glass-card p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-800/[0.06]" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-accent-800/[0.06] rounded-lg w-24" />
                    <div className="h-2 bg-accent-800/[0.04] rounded-lg w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (data?.profissionais ?? []).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(data?.profissionais ?? []).map((p) => (
              <Link key={p.id} href="/profissionais" className="group rounded-2xl glass-card p-4 glass-lift">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg" style={{ backgroundColor: p.cor ?? "#105a73" }}>
                    {p.nome[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-base-primary group-hover:text-accent-600 transition-colors truncate">{p.nome}</p>
                    <p className="text-[11px] text-base-muted">{p.totalAtendimentos} atendimentos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-accent-800/[0.03] rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-bold text-base-primary">R$ {(Number(p.receitaTotal) / 1000).toFixed(1)}k</p>
                    <p className="text-[9px] text-base-muted mt-0.5">Receita</p>
                  </div>
                  <div className="flex-1 bg-accent-800/[0.03] rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-bold text-base-primary">{Number(p.avaliacaoMedia).toFixed(1)} ★</p>
                    <p className="text-[9px] text-base-muted mt-0.5">Avaliação</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl glass-card text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-accent-800/[0.03] flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-base-muted/60" />
            </div>
            <p className="text-sm text-base-muted">Nenhum profissional</p>
          </div>
        )}
      </div>
    </div>
  )
}
