// ── TYPES ────────────────────────────────────────────────────────

export interface AgendaItem {
  time: string
  client: string
  clientId: string | null
  service: string
  professional: string
  status: "concluido" | "atendendo" | "confirmado" | "pendente" | "vago"
}

export interface AISuggestion {
  id: number
  type: "retention" | "opportunity" | "insight"
  priority: "high" | "medium" | "low"
  title: string
  desc: string
  action: string
}

export interface Professional {
  name: string
  atendimentos: number
  receita: number
  ocupacao: number
}

export interface ClientVisit {
  date: string
  service: string
  prof: string
  value: number
  notes: string
}

export interface ClientData {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  since: string
  totalVisits: number
  avgTicket: number
  totalSpent: number
  frequency: string
  lastVisit: string
  daysAway: number
  churnRisk: "alto" | "medio" | "baixo"
  favProfessional: string
  favDay: string
  favTime: string
  preferences: string[]
  history: ClientVisit[]
  fidelity: {
    points: number
    level: string
    nextReward: string
    progress: number
  }
}

// ── CHART DATA ──────────────────────────────────────────────────

export const revenueWeekData = [
  { day: "Seg", valor: 1850 },
  { day: "Ter", valor: 2400 },
  { day: "Qua", valor: 1900 },
  { day: "Qui", valor: 3100 },
  { day: "Sex", valor: 3800 },
  { day: "Sáb", valor: 4200 },
  { day: "Dom", valor: 0 },
]

export const serviceMixData = [
  { name: "Corte", value: 35, color: "#105a73" },
  { name: "Coloração", value: 25, color: "#F59E0B" },
  { name: "Tratamento", value: 20, color: "#8B5CF6" },
  { name: "Manicure", value: 12, color: "#EC4899" },
  { name: "Outros", value: 8, color: "#94A3B8" },
]

// ── AGENDA ──────────────────────────────────────────────────────

export const todayAgenda: AgendaItem[] = [
  { time: "08:00", client: "Maria Silva", clientId: "maria-silva", service: "Corte + Escova", professional: "Ana", status: "concluido" },
  { time: "09:30", client: "João Mendes", clientId: "joao-mendes", service: "Barba", professional: "Carlos", status: "atendendo" },
  { time: "10:00", client: "Carla Souza", clientId: "carla-souza", service: "Coloração", professional: "Ana", status: "confirmado" },
  { time: "11:30", client: "Pedro Lima", clientId: "pedro-lima", service: "Corte Masculino", professional: "Carlos", status: "confirmado" },
  { time: "13:00", client: "—", clientId: null, service: "—", professional: "—", status: "vago" },
  { time: "14:00", client: "Fernanda Costa", clientId: "fernanda-costa", service: "Tratamento Capilar", professional: "Ana", status: "confirmado" },
  { time: "15:30", client: "—", clientId: null, service: "—", professional: "—", status: "vago" },
  { time: "16:00", client: "Lucia Alves", clientId: "lucia-alves", service: "Manicure + Pedicure", professional: "Beatriz", status: "pendente" },
]

// ── AI SUGGESTIONS ──────────────────────────────────────────────

export const aiSuggestions: AISuggestion[] = [
  {
    id: 1,
    type: "retention",
    priority: "high",
    title: "Carla Souza não vem há 38 dias",
    desc: "Frequência habitual: a cada 25 dias. Último serviço: Coloração (R$ 180). Risco de perda alto.",
    action: "Enviar mensagem personalizada",
  },
  {
    id: 2,
    type: "opportunity",
    priority: "medium",
    title: "2 horários vagos amanhã (14h e 15:30h)",
    desc: "3 clientes costumam agendar nesse período. Posso avisá-los automaticamente.",
    action: "Notificar clientes",
  },
  {
    id: 3,
    type: "insight",
    priority: "low",
    title: "Ana gerou 42% mais receita essa semana",
    desc: "Motivo: 3 procedimentos de coloração premium. Considere priorizar esses serviços na agenda dela.",
    action: "Ver detalhes",
  },
]

// ── PROFESSIONALS ───────────────────────────────────────────────

export const professionals: Professional[] = [
  { name: "Ana", atendimentos: 28, receita: 8400, ocupacao: 87 },
  { name: "Carlos", atendimentos: 22, receita: 5200, ocupacao: 72 },
  { name: "Beatriz", atendimentos: 18, receita: 3800, ocupacao: 65 },
]

// ── CLIENT PROFILES ─────────────────────────────────────────────

export const clients: Record<string, ClientData> = {
  "carla-souza": {
    id: "carla-souza",
    name: "Carla Souza",
    initials: "CS",
    phone: "(84) 99876-5432",
    email: "carla.souza@email.com",
    since: "Mar 2024",
    totalVisits: 14,
    avgTicket: 165,
    totalSpent: 2310,
    frequency: "25 dias",
    lastVisit: "15/Mai/2026",
    daysAway: 38,
    churnRisk: "alto",
    favProfessional: "Ana",
    favDay: "Sexta-feira",
    favTime: "14:00",
    preferences: [
      "Prefere franja mais curta, na altura da sobrancelha",
      "Produto X irritou a pele — nunca mais usar",
      "Gosta de música ambiente baixa durante o atendimento",
      "Sempre pede café com leite ao chegar",
      "Prefere tintura tom 7.1 (loiro acinzentado)",
    ],
    history: [
      { date: "15/Mai", service: "Coloração + Corte", prof: "Ana", value: 220, notes: "Pediu tom mais claro que o habitual" },
      { date: "18/Abr", service: "Corte + Escova", prof: "Ana", value: 130, notes: "Franja ficou ótima, repetir" },
      { date: "22/Mar", service: "Coloração", prof: "Ana", value: 180, notes: "Tom 7.1 padrão" },
      { date: "25/Fev", service: "Tratamento + Corte", prof: "Ana", value: 160, notes: "Hidratação profunda — cabelo muito ressecado" },
      { date: "01/Fev", service: "Corte + Escova", prof: "Ana", value: 130, notes: "" },
      { date: "05/Jan", service: "Coloração + Corte", prof: "Ana", value: 220, notes: "Retoque de raiz + pontas" },
    ],
    fidelity: { points: 280, level: "Ouro", nextReward: "Escova grátis em 20 pontos", progress: 93 },
  },
  "maria-silva": {
    id: "maria-silva",
    name: "Maria Silva",
    initials: "MS",
    phone: "(84) 99812-3456",
    email: "maria.silva@email.com",
    since: "Jan 2024",
    totalVisits: 22,
    avgTicket: 140,
    totalSpent: 3080,
    frequency: "20 dias",
    lastVisit: "22/Jun/2026",
    daysAway: 0,
    churnRisk: "baixo",
    favProfessional: "Ana",
    favDay: "Sábado",
    favTime: "08:00",
    preferences: [
      "Corte sempre na altura do ombro",
      "Gosta de escova modelada nas pontas",
      "Alérgica a amônia — usar produtos sem amônia",
    ],
    history: [
      { date: "22/Jun", service: "Corte + Escova", prof: "Ana", value: 130, notes: "Manteve o comprimento" },
      { date: "02/Jun", service: "Hidratação", prof: "Ana", value: 90, notes: "Fios muito secos" },
      { date: "12/Mai", service: "Corte + Escova", prof: "Ana", value: 130, notes: "" },
    ],
    fidelity: { points: 440, level: "Platina", nextReward: "Hidratação grátis em 60 pontos", progress: 88 },
  },
}

// Fallback: return carla-souza for any unknown client ID
export function getClient(id: string): ClientData {
  return clients[id] || clients["carla-souza"]
}
