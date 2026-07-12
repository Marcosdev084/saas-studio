export interface ChurnClient {
  id: number
  name: string
  risk: number
  lastVisit: string
  frequency: string
  daysAway: number
  avgTicket: number
  service: string
  prof: string
}

export interface Campaign {
  id: number
  name: string
  status: "enviada" | "ativa" | "concluida"
  date: string
  channel: string
  opens: number
  conversions: number
}

export const churnClients: ChurnClient[] = [
  { id: 1, name: "Carla Souza", risk: 92, lastVisit: "15/Mai", frequency: "25 dias", daysAway: 38, avgTicket: 180, service: "Coloração", prof: "Ana" },
  { id: 2, name: "Roberto Almeida", risk: 78, lastVisit: "28/Mai", frequency: "30 dias", daysAway: 25, avgTicket: 85, service: "Corte Masculino", prof: "Carlos" },
  { id: 3, name: "Lucia Alves", risk: 71, lastVisit: "05/Jun", frequency: "20 dias", daysAway: 17, avgTicket: 120, service: "Manicure + Pedicure", prof: "Beatriz" },
  { id: 4, name: "Fernanda Costa", risk: 65, lastVisit: "10/Jun", frequency: "28 dias", daysAway: 12, avgTicket: 190, service: "Tratamento", prof: "Ana" },
  { id: 5, name: "Paulo Ribeiro", risk: 58, lastVisit: "12/Jun", frequency: "35 dias", daysAway: 10, avgTicket: 70, service: "Barba", prof: "Carlos" },
]

export const campaigns: Campaign[] = [
  { id: 1, name: "Retorno Coloração — Carla", status: "enviada", date: "20/Jun", channel: "WhatsApp", opens: 1, conversions: 0 },
  { id: 2, name: "Desconto 15% — Clientes Inativos", status: "ativa", date: "18/Jun", channel: "WhatsApp", opens: 8, conversions: 3 },
  { id: 3, name: "Programa Fidelidade — Upgrade Ouro", status: "concluida", date: "10/Jun", channel: "WhatsApp", opens: 12, conversions: 7 },
]
