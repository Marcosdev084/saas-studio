"use client"

import {
  ArrowUpRight, ArrowDownRight, AlertTriangle, Zap, TrendingUp
} from "lucide-react"
import type { AISuggestion } from "@/lib/data"

// ── STATUS BADGE ────────────────────────────────────────────────

const statusMap: Record<string, { bg: string; text: string; border: string; label: string }> = {
  concluido:  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Concluído" },
  atendendo:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   label: "Atendendo" },
  confirmado: { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     label: "Confirmado" },
  pendente:   { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  label: "Pendente" },
  vago:       { bg: "bg-surface-base",  text: "text-base-muted",   border: "border-surface-border",   label: "Horário vago" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || statusMap.pendente
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

// ── CHURN BADGE ─────────────────────────────────────────────────

const churnMap: Record<string, { bg: string; text: string; border: string }> = {
  alto:  { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  medio: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  baixo: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
}

export function ChurnBadge({ level }: { level: string }) {
  const s = churnMap[level] || churnMap.medio
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      Risco {level}
    </span>
  )
}

// ── KPI CARD ────────────────────────────────────────────────────

interface KPICardProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  trend?: string
  trendUp?: boolean
}

export function KPICard({ icon: Icon, label, value, sub, trend, trendUp }: KPICardProps) {
  return (
    <div className="glass-card glass-lift rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] font-medium text-base-secondary">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-accent-600/[0.07] flex items-center justify-center">
          <Icon size={17} strokeWidth={1.8} className="text-accent-600" />
        </div>
      </div>
      <div className="flex items-end gap-2.5 flex-wrap">
        <p className="text-[26px] leading-none font-bold text-base-primary tracking-tight">{value}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full ${trendUp ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-base-muted mt-2.5">{sub}</p>}
    </div>
  )
}

// ── AI SUGGESTION CARD ──────────────────────────────────────────

const iconMap = {
  retention:   <AlertTriangle size={18} className="text-red-500" />,
  opportunity: <Zap size={18} className="text-amber-500" />,
  insight:     <TrendingUp size={18} className="text-accent-600" />,
}

const borderColorMap = {
  retention:   "border-l-red-400",
  opportunity: "border-l-amber-400",
  insight:     "border-l-accent-400",
}

export function AISuggestionCard({ suggestion, onDismiss }: { suggestion: AISuggestion; onDismiss: (id: number) => void }) {
  return (
    <div className={`glass-card rounded-2xl border-l-4 ${borderColorMap[suggestion.type]} p-4`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{iconMap[suggestion.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-base-primary">{suggestion.title}</p>
          <p className="text-xs text-base-secondary mt-1 leading-relaxed">{suggestion.desc}</p>
          <div className="flex items-center gap-2 mt-3.5">
            <button className="text-xs font-medium text-white bg-accent-600 hover:bg-accent-700 px-3.5 py-2 rounded-lg shadow-sm hover:shadow-md hover:shadow-accent-600/20 hover:-translate-y-px">
              {suggestion.action}
            </button>
            <button
              onClick={() => onDismiss(suggestion.id)}
              className="text-xs text-base-muted hover:text-base-secondary px-2 py-1.5 transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
