"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Activity, Calendar, Users, DollarSign, AlertTriangle,
  Bot, Scissors, Settings, X, Package
} from "lucide-react"

const mainNav = [
  { icon: Activity,       label: "Dashboard",      href: "/dashboard" },
  { icon: Calendar,       label: "Agenda",          href: "/agenda" },
  { icon: Users,          label: "Clientes",        href: "/clientes" },
  { icon: DollarSign,     label: "Financeiro",      href: "/financeiro" },
  { icon: Package,        label: "Estoque",         href: "/estoque" },
  { icon: AlertTriangle,  label: "Retenção",        href: "/retencao" },
  { icon: Bot,            label: "Assistente IA",   href: "/ia" },
  { icon: Scissors,       label: "Profissionais",   href: "/profissionais" },
]

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname()

  const iconLink = (item: { icon: typeof Activity; label: string; href: string }) => {
    const active = pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onMobileClose}
        title={item.label}
        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center group ${
          active
            ? "bg-accent-600 text-white shadow-lg shadow-accent-600/25"
            : "text-base-muted hover:text-accent-700 hover:bg-accent-600/[0.06]"
        }`}
      >
        <item.icon size={20} strokeWidth={active ? 2 : 1.6} />
        <span className="absolute left-full ml-4 px-2.5 py-1.5 rounded-lg bg-accent-800 text-white text-[11px] font-medium whitespace-nowrap opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-elevated z-50">
          {item.label}
        </span>
      </Link>
    )
  }

  const mobileLink = (item: { icon: typeof Activity; label: string; href: string }) => {
    const active = pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onMobileClose}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-medium ${
          active
            ? "bg-accent-600 text-white shadow-lg shadow-accent-600/20"
            : "text-base-secondary hover:text-accent-700 hover:bg-accent-600/[0.06]"
        }`}
      >
        <item.icon size={18} strokeWidth={active ? 2 : 1.6} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Sidebar desktop — painel de vidro flutuante, só ícones */}
      <aside className="w-[76px] hidden md:flex flex-shrink-0 flex-col items-center py-6 my-3 ml-3 rounded-3xl glass-card">
        {/* Logo */}
        <Link href="/dashboard" className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center shadow-lg shadow-accent-600/20 mb-10 hover:shadow-accent-600/35 hover:scale-105 transition-all duration-200">
          <Scissors size={19} className="text-white" />
        </Link>

        {/* Navegação principal */}
        <nav className="flex-1 flex flex-col items-center gap-2.5">
          {mainNav.map(iconLink)}
        </nav>

        {/* Configurações, isolada na base */}
        <div className="mt-auto pt-5 flex flex-col items-center">
          <div className="w-8 h-px bg-accent-800/[0.07] mb-5" />
          <Link
            href="/configuracoes"
            title="Configurações"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center group ${
              pathname.startsWith("/configuracoes")
                ? "bg-accent-600 text-white shadow-lg shadow-accent-600/25"
                : "text-base-muted hover:text-accent-700 hover:bg-accent-600/[0.06]"
            }`}
          >
            <Settings size={20} strokeWidth={pathname.startsWith("/configuracoes") ? 2 : 1.6} />
            <span className="absolute left-full ml-4 px-2.5 py-1.5 rounded-lg bg-accent-800 text-white text-[11px] font-medium whitespace-nowrap opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-elevated z-50">
              Configurações
            </span>
          </Link>
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-accent-900/40 backdrop-blur-md animate-fade-in" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-[264px] glass-solid flex flex-col animate-slide-in-left">
            {/* Cabeçalho mobile */}
            <div className="h-[72px] flex items-center justify-between px-5">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onMobileClose}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center shadow-lg shadow-accent-600/20">
                  <Scissors size={16} className="text-white" />
                </div>
                <span className="text-sm font-bold text-base-primary tracking-tight">SaaS Studio</span>
              </Link>
              <button onClick={onMobileClose} className="w-8 h-8 rounded-lg hover:bg-accent-600/[0.06] flex items-center justify-center text-base-muted">
                <X size={18} />
              </button>
            </div>

            {/* Navegação mobile */}
            <nav className="flex-1 px-4 py-3 space-y-1.5">
              {mainNav.map(mobileLink)}
            </nav>

            {/* Configurações mobile */}
            <div className="px-4 pb-6">
              <div className="h-px bg-accent-800/[0.06] mb-3" />
              {mobileLink({ icon: Settings, label: "Configurações", href: "/configuracoes" })}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
