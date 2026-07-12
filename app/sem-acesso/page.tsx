"use client"

import { Scissors, AlertTriangle, LogOut, Mail } from "lucide-react"

export default function SemAcessoPage() {
  return (
    <div className="min-h-screen app-ambient flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-base-primary mb-2">Conta não encontrada</h1>
        <p className="text-sm text-base-secondary mb-6">
          O e-mail usado para login não está vinculado a nenhum estabelecimento no sistema.
          Entre em contato com a equipe do SaaS Studio para ativar seu acesso.
        </p>

        <div className="glass-card rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-3 p-3 bg-surface-base rounded-lg mb-4">
            <Mail size={16} className="text-base-muted" />
            <p className="text-sm text-base-secondary">suporte@saasstudio.com.br</p>
          </div>
          <p className="text-xs text-base-muted">
            Informe o nome do seu estabelecimento e o e-mail usado no login.
            Nossa equipe vai cadastrar sua conta e liberar o acesso.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <a href="/api/auth/logout" className="text-sm font-medium text-base-secondary border border-surface-border hover:bg-surface-base px-4 py-2 rounded-lg flex items-center gap-1.5">
            <LogOut size={15} /> Sair e tentar outro e-mail
          </a>
        </div>
      </div>
    </div>
  )
}
