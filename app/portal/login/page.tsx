"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Scissors, Eye, EyeOff, Loader2 } from "lucide-react"
import { usePortalAuth } from "../layout"

export default function PortalLoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [senha, setSenha] = useState("")
  const [showSenha, setShowSenha] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, refresh } = usePortalAuth()

  useEffect(() => {
    if (!authLoading && user) router.replace("/portal")
  }, [user, authLoading, router])

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const submit = async () => {
    setError(""); setLoading(true)
    try {
      const body = tab === "register"
        ? { action: "register", nome, email, telefone: telefone.replace(/\D/g, ""), senha }
        : { action: "login", email, senha }

      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }

      refresh()
      router.push("/portal")
    } catch {
      setError("Erro de conexão. Tente novamente.")
    }
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent-500" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center mx-auto mb-4">
            <Scissors size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-base-primary">Portal do Cliente</h1>
          <p className="text-sm text-base-muted mt-1">Agende seus horários de forma rápida e prática</p>
        </div>

        <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-surface-border-light">
            <button onClick={() => { setTab("login"); setError("") }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "login" ? "text-accent-700 border-b-2 border-accent-400 bg-accent-50/50" : "text-base-muted hover:text-base-secondary"}`}>
              Entrar
            </button>
            <button onClick={() => { setTab("register"); setError("") }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "register" ? "text-accent-700 border-b-2 border-accent-400 bg-accent-50/50" : "text-base-muted hover:text-base-secondary"}`}>
              Criar conta
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600">{error}</div>
            )}

            {tab === "register" && (
              <div>
                <label className="text-xs font-medium text-base-secondary mb-1.5 block">Nome completo</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
                  className="w-full px-3 py-2.5 border border-surface-border rounded-2xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
                className="w-full px-3 py-2.5 border border-surface-border rounded-2xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
            </div>

            {tab === "register" && (
              <div>
                <label className="text-xs font-medium text-base-secondary mb-1.5 block">Telefone <span className="text-base-muted/60">(opcional)</span></label>
                <input type="tel" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))} placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2.5 border border-surface-border rounded-2xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-base-secondary mb-1.5 block">Senha</label>
              <div className="relative">
                <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder={tab === "register" ? "Mínimo 6 caracteres" : "Sua senha"}
                  onKeyDown={(e) => { if (e.key === "Enter") submit() }}
                  className="w-full px-3 py-2.5 pr-10 border border-surface-border rounded-2xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-muted hover:text-base-secondary">
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button onClick={submit} disabled={loading}
              className="w-full py-3 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {tab === "login" ? "Entrar" : "Criar minha conta"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-base-muted mt-6">
          {tab === "login" ? "Não tem conta? " : "Já tem conta? "}
          <button onClick={() => { setTab(tab === "login" ? "register" : "login"); setError("") }}
            className="text-accent-600 hover:text-accent-700 font-medium">
            {tab === "login" ? "Crie agora" : "Faça login"}
          </button>
        </p>
      </div>
    </div>
  )
}
