"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Building2, ChevronRight, ChevronLeft, User, Scissors, Calendar,
  Clock, Check, Loader2, MapPin, Star, ArrowLeft
} from "lucide-react"
import { usePortalAuth } from "./layout"

interface Estabelecimento {
  id: string; nome: string; tipoNegocio: string; cidade: string | null; estado: string | null; telefone: string | null
  _count: { profissionais: number }
}
interface Profissional { id: string; nome: string; especialidade: string | null; cor: string | null; avatarUrl: string | null; avaliacaoMedia: number }
interface Servico { id: string; nome: string; categoria: string | null; duracaoMinutos: number; preco: number }
interface HorarioData { aberto: boolean; abertura?: string; fechamento?: string; ocupados?: { inicio: number; fim: number }[] }

const tipoLabels: Record<string, string> = {
  SALAO_BELEZA: "Salão de Beleza", BARBEARIA: "Barbearia", CLINICA_ESTETICA: "Clínica Estética",
  CLINICA_ODONTO: "Clínica Odontológica", ESPACO_BELEZA: "Espaço de Beleza", OUTRO: "Outro",
}

function toMin(h: string) { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm }
function fromMin(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` }
function toLocalISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }

export default function PortalPage() {
  const { user, loading: authLoading } = usePortalAuth()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [search, setSearch] = useState("")
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [loadingEstab, setLoadingEstab] = useState(true)

  const [selectedEstab, setSelectedEstab] = useState<Estabelecimento | null>(null)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loadingProfs, setLoadingProfs] = useState(false)
  const [selectedProf, setSelectedProf] = useState<Profissional | null>(null)

  const [servicos, setServicos] = useState<Servico[]>([])
  const [loadingServicos, setLoadingServicos] = useState(false)
  const [selectedServicos, setSelectedServicos] = useState<string[]>([])

  const [dataSel, setDataSel] = useState(toLocalISO(new Date()))
  const [horarioData, setHorarioData] = useState<HorarioData | null>(null)
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [selectedHora, setSelectedHora] = useState("")

  const [observacoes, setObservacoes] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) router.replace("/portal/login")
  }, [user, authLoading, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingEstab(true)
      fetch(`/api/portal/estabelecimentos${search ? `?q=${encodeURIComponent(search)}` : ""}`)
        .then((r) => r.json())
        .then((d) => { setEstabelecimentos(d); setLoadingEstab(false) })
        .catch(() => setLoadingEstab(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const selectEstab = (e: Estabelecimento) => {
    setSelectedEstab(e)
    setStep(2)
    setLoadingProfs(true)
    fetch(`/api/portal/agendar?estabelecimentoId=${e.id}&step=profissionais`)
      .then((r) => r.json())
      .then((d) => { setProfissionais(d); setLoadingProfs(false) })
      .catch(() => setLoadingProfs(false))
  }

  const selectProf = (p: Profissional) => {
    setSelectedProf(p)
    setSelectedServicos([])
    setSelectedHora("")
    setStep(3)
    setLoadingServicos(true)
    fetch(`/api/portal/agendar?estabelecimentoId=${selectedEstab!.id}&profissionalId=${p.id}&step=servicos`)
      .then((r) => r.json())
      .then((d) => { setServicos(Array.isArray(d) ? d : []); setLoadingServicos(false) })
      .catch(() => setLoadingServicos(false))
  }

  const toggleServico = (id: string) => {
    setSelectedServicos((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
    setSelectedHora("")
  }

  const servicosSelecionados = servicos.filter((s) => selectedServicos.includes(s.id))
  const duracaoTotal = servicosSelecionados.reduce((sum, s) => sum + s.duracaoMinutos, 0)
  const valorTotal = servicosSelecionados.reduce((sum, s) => sum + Number(s.preco), 0)

  const goToHorarios = () => {
    setStep(4)
    loadHorarios(dataSel)
  }

  const loadHorarios = (data: string) => {
    if (!selectedEstab || !selectedProf) return
    setLoadingHorarios(true)
    setSelectedHora("")
    fetch(`/api/portal/agendar?estabelecimentoId=${selectedEstab.id}&profissionalId=${selectedProf.id}&data=${data}&step=horarios`)
      .then((r) => r.json())
      .then((d) => { setHorarioData(d); setLoadingHorarios(false) })
      .catch(() => setLoadingHorarios(false))
  }

  const changeDate = (data: string) => {
    setDataSel(data)
    loadHorarios(data)
  }

  const horariosDisponiveis = useMemo(() => {
    if (!horarioData?.aberto || duracaoTotal <= 0) return []
    const abMin = toMin(horarioData.abertura!)
    const feMin = toMin(horarioData.fechamento!)
    const ocupados = horarioData.ocupados ?? []

    const candidatos: number[] = []
    for (let m = abMin; m < feMin; m += 30) candidatos.push(m)
    for (const o of ocupados) {
      if (o.fim >= abMin && o.fim < feMin && !candidatos.includes(o.fim)) candidatos.push(o.fim)
    }
    candidatos.sort((a, b) => a - b)

    return candidatos
      .filter((m) => {
        if (m + duracaoTotal > feMin) return false
        return !ocupados.some((o) => m < o.fim && m + duracaoTotal > o.inicio)
      })
      .map((m) => ({ value: fromMin(m), label: `${fromMin(m)} — ${fromMin(m + duracaoTotal)}` }))
  }, [horarioData, duracaoTotal])

  const confirmar = async () => {
    if (!selectedEstab || !selectedProf || !selectedServicos.length || !selectedHora) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/portal/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estabelecimentoId: selectedEstab.id,
          profissionalId: selectedProf.id,
          servicoIds: selectedServicos,
          data: dataSel,
          hora: selectedHora,
          observacoes,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return }
      setSuccess(true)
    } catch { setError("Erro de conexão") }
    setSaving(false)
  }

  const reset = () => {
    setStep(1); setSelectedEstab(null); setSelectedProf(null)
    setSelectedServicos([]); setSelectedHora(""); setObservacoes("")
    setSuccess(false); setError("")
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-accent-500" /></div>
  }

  if (success) {
    const dataFormatada = new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-base-primary mb-2">Agendamento confirmado!</h2>
        <p className="text-sm text-base-secondary mb-6">Seu horário foi reservado com sucesso.</p>
        <div className="glass-card rounded-2xl p-5 text-left space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Building2 size={16} className="text-base-muted" />
            <span className="text-sm text-accent-700">{selectedEstab?.nome}</span>
          </div>
          <div className="flex items-center gap-3">
            <User size={16} className="text-base-muted" />
            <span className="text-sm text-accent-700">{selectedProf?.nome}</span>
          </div>
          <div className="flex items-center gap-3">
            <Scissors size={16} className="text-base-muted" />
            <span className="text-sm text-accent-700">{servicosSelecionados.map((s) => s.nome).join(", ")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-base-muted" />
            <span className="text-sm text-accent-700 capitalize">{dataFormatada}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-base-muted" />
            <span className="text-sm text-accent-700">{selectedHora} — {fromMin(toMin(selectedHora) + duracaoTotal)}</span>
          </div>
          <div className="pt-2 border-t border-surface-border-light flex items-center justify-between">
            <span className="text-sm text-base-secondary">Total</span>
            <span className="text-lg font-bold text-accent-600">R$ {valorTotal.toFixed(0)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 py-2.5 border border-surface-border rounded-2xl text-sm font-medium text-base-secondary hover:bg-surface-base transition-colors">
            Novo agendamento
          </button>
          <button onClick={() => router.push("/portal/meus-agendamentos")} className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-700 rounded-2xl text-sm font-medium text-white transition-colors">
            Meus agendamentos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { n: 1, label: "Local" },
          { n: 2, label: "Profissional" },
          { n: 3, label: "Serviços" },
          { n: 4, label: "Horário" },
          { n: 5, label: "Confirmar" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-2 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s.n ? "bg-accent-600 text-white" : "bg-surface-border text-base-muted"
            }`}>{s.n}</div>
            <span className={`text-xs font-medium ${step >= s.n ? "text-accent-700" : "text-base-muted"}`}>{s.label}</span>
            {s.n < 5 && <ChevronRight size={14} className="text-base-muted/60" />}
          </div>
        ))}
      </div>

      {/* Step 1: Estabelecimento */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-base-primary">Escolha o estabelecimento</h2>
            <p className="text-xs text-base-muted mt-1">Selecione onde deseja agendar</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-muted/60" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..."
              className="w-full pl-9 pr-4 py-2.5 glass-card rounded-2xl text-sm text-base-secondary placeholder:text-base-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-400/30" />
          </div>
          {loadingEstab ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 glass-card rounded-2xl animate-pulse" />)}</div>
          ) : estabelecimentos.length > 0 ? (
            <div className="space-y-2">
              {estabelecimentos.map((e) => (
                <button key={e.id} onClick={() => selectEstab(e)}
                  className="w-full flex items-center gap-4 p-4 glass-card rounded-2xl hover:border-accent-400/50 hover:shadow-sm transition-all text-left">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-primary">{e.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-base-muted">{tipoLabels[e.tipoNegocio] ?? e.tipoNegocio}</span>
                      {e.cidade && (
                        <span className="text-[11px] text-base-muted flex items-center gap-0.5"><MapPin size={10} />{e.cidade}{e.estado ? `, ${e.estado}` : ""}</span>
                      )}
                      <span className="text-[11px] text-base-muted">{e._count.profissionais} profission{e._count.profissionais === 1 ? "al" : "ais"}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-base-muted/60 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-base-muted">Nenhum estabelecimento encontrado</div>
          )}
        </div>
      )}

      {/* Step 2: Profissional */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-base-muted hover:text-accent-600 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-base-primary">Escolha o profissional</h2>
            <p className="text-xs text-base-muted mt-1">{selectedEstab?.nome}</p>
          </div>
          {loadingProfs ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 glass-card rounded-2xl animate-pulse" />)}</div>
          ) : profissionais.length > 0 ? (
            <div className="space-y-2">
              {profissionais.map((p) => (
                <button key={p.id} onClick={() => selectProf(p)}
                  className="w-full flex items-center gap-4 p-4 glass-card rounded-2xl hover:border-accent-400/50 hover:shadow-sm transition-all text-left">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: p.cor ?? "#105a73" }}>
                    {p.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-primary">{p.nome}</p>
                    {p.especialidade && <p className="text-[11px] text-base-muted mt-0.5">{p.especialidade}</p>}
                  </div>
                  {Number(p.avaliacaoMedia) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-500 shrink-0">
                      <Star size={12} fill="currentColor" /> {Number(p.avaliacaoMedia).toFixed(1)}
                    </div>
                  )}
                  <ChevronRight size={18} className="text-base-muted/60 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-base-muted">Nenhum profissional disponível</div>
          )}
        </div>
      )}

      {/* Step 3: Serviços */}
      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-base-muted hover:text-accent-600 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-base-primary">Selecione os serviços</h2>
            <p className="text-xs text-base-muted mt-1">{selectedEstab?.nome} • {selectedProf?.nome}</p>
          </div>
          {loadingServicos ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 glass-card rounded-2xl animate-pulse" />)}</div>
          ) : servicos.length === 0 ? (
            <div className="text-center py-12 text-sm text-base-muted">Este profissional ainda não tem serviços disponíveis. Escolha outro profissional.</div>
          ) : (
            <div className="space-y-2">
              {servicos.map((s) => {
                const selected = selectedServicos.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleServico(s.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${selected ? "border-accent-400 bg-accent-50" : "border-surface-border/60 bg-surface-card/50 hover:border-accent-400/40"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-accent-400 bg-accent-400" : "border-base-muted/60"}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-base-primary">{s.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-base-muted flex items-center gap-0.5"><Clock size={10} /> {s.duracaoMinutos}min</span>
                        {s.categoria && <span className="text-[11px] text-base-muted">• {s.categoria}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-accent-700 shrink-0">R$ {Number(s.preco).toFixed(0)}</span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedServicos.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-base-secondary">{selectedServicos.length} serviço{selectedServicos.length > 1 ? "s" : ""} • {duracaoTotal}min</span>
                <span className="text-base font-bold text-accent-600">R$ {valorTotal.toFixed(0)}</span>
              </div>
              <button onClick={goToHorarios}
                className="w-full py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-2xl transition-colors flex items-center justify-center gap-2">
                Escolher horário <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Data e Horário */}
      {step === 4 && (
        <div className="space-y-4">
          <button onClick={() => setStep(3)} className="flex items-center gap-1 text-xs text-base-muted hover:text-accent-600 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-base-primary">Escolha a data e horário</h2>
            <p className="text-xs text-base-muted mt-1">{selectedEstab?.nome} • {selectedProf?.nome} • {duracaoTotal}min</p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <label className="text-xs font-medium text-base-secondary mb-2 block">Data</label>
            <input type="date" value={dataSel} onChange={(e) => changeDate(e.target.value)}
              min={toLocalISO(new Date())}
              className="w-full px-3 py-2.5 border border-surface-border rounded-2xl text-sm text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
          </div>

          <div className="glass-card rounded-2xl p-4">
            <label className="text-xs font-medium text-base-secondary mb-2 block">Horário disponível</label>
            {loadingHorarios ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-accent-500" /></div>
            ) : !horarioData?.aberto ? (
              <div className="text-center py-8 text-sm text-base-muted">Estabelecimento fechado neste dia</div>
            ) : horariosDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-sm text-base-muted">Nenhum horário disponível nesta data</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto scroll-fade-y">
                {horariosDisponiveis.map((h) => (
                  <button key={h.value} onClick={() => setSelectedHora(h.value)}
                    className={`py-3 px-2 rounded-2xl text-xs font-medium text-center transition-all ${
                      selectedHora === h.value
                        ? "bg-accent-600 text-white ring-2 ring-accent-400/50"
                        : "bg-surface-base text-accent-700 hover:bg-accent-50 hover:text-accent-700"
                    }`}>
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedHora && (
            <button onClick={() => setStep(5)}
              className="w-full py-3 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-2xl transition-colors flex items-center justify-center gap-2">
              Revisar e confirmar <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Step 5: Confirmação */}
      {step === 5 && (
        <div className="space-y-4">
          <button onClick={() => setStep(4)} className="flex items-center gap-1 text-xs text-base-muted hover:text-accent-600 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-base-primary">Confirmar agendamento</h2>
            <p className="text-xs text-base-muted mt-1">Revise os detalhes antes de confirmar</p>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600">{error}</div>}

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-border-light flex items-center justify-center"><Building2 size={16} className="text-base-secondary" /></div>
              <div><p className="text-[11px] text-base-muted">Estabelecimento</p><p className="text-sm font-medium text-base-primary">{selectedEstab?.nome}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedProf?.cor ?? "#105a73" }}>
                {selectedProf?.nome[0]}
              </div>
              <div><p className="text-[11px] text-base-muted">Profissional</p><p className="text-sm font-medium text-base-primary">{selectedProf?.nome}</p></div>
            </div>
            <div className="border-t border-surface-border-light pt-3">
              <p className="text-[11px] text-base-muted mb-2">Serviços</p>
              {servicosSelecionados.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Scissors size={12} className="text-accent-500" />
                    <span className="text-sm text-accent-700">{s.nome}</span>
                    <span className="text-[10px] text-base-muted">{s.duracaoMinutos}min</span>
                  </div>
                  <span className="text-sm font-medium text-base-secondary">R$ {Number(s.preco).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-border-light pt-3">
              <div className="flex items-center gap-3 mb-2">
                <Calendar size={14} className="text-base-muted" />
                <span className="text-sm text-accent-700 capitalize">
                  {new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-base-muted" />
                <span className="text-sm text-accent-700">{selectedHora} — {fromMin(toMin(selectedHora) + duracaoTotal)} ({duracaoTotal}min)</span>
              </div>
            </div>
            <div className="border-t border-surface-border-light pt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-base-secondary">Total</span>
              <span className="text-xl font-bold text-accent-600">R$ {valorTotal.toFixed(0)}</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <label className="text-xs font-medium text-base-secondary mb-1.5 block">Observações <span className="text-base-muted/60">(opcional)</span></label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Alguma informação adicional..."
              className="w-full px-3 py-2.5 border border-surface-border rounded-2xl text-sm text-accent-700 resize-none focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400/50" />
          </div>

          <button onClick={confirmar} disabled={saving}
            className="w-full py-3 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirmar agendamento
          </button>
        </div>
      )}
    </div>
  )
}
