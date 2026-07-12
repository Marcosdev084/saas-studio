"use client"

import { Scissors } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen app-ambient flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center mx-auto mb-4">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-base-primary tracking-tight">SaaS Studio</h1>
          <p className="text-sm text-base-secondary mt-1">Inteligência operacional para seu negócio</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl shadow-sm p-8">
          <h2 className="text-lg font-bold text-base-primary text-center mb-2">Bem-vindo de volta</h2>
          <p className="text-sm text-base-muted text-center mb-6">
            Acesse sua conta para gerenciar seu estabelecimento
          </p>

          <a
            href="/api/auth/login"
            className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Entrar na plataforma
          </a>

          <div className="mt-6 pt-6 border-t border-surface-border-light">
            <p className="text-xs text-base-muted text-center">
              Não tem uma conta?{" "}
              <a href="/api/auth/login?screen_hint=signup" className="text-accent-600 font-medium hover:text-accent-700">
                Criar conta
              </a>
            </p>
          </div>
        </div>

        <p className="text-[10px] text-base-muted text-center mt-6">
          Protegido por Auth0 • Seus dados estão seguros
        </p>
      </div>
    </div>
  )
}
