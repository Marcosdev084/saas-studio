export interface ProfessionalFull {
  id: string
  name: string
  role: string
  avatar: string
  phone: string
  email: string
  since: string
  color: string
  stats: {
    atendimentos: number
    receita: number
    ocupacao: number
    ticketMedio: number
    cancelamentos: number
    noShows: number
    avaliacaoMedia: number
    clientesUnicos: number
    comissao: number
    comissaoValor: number
  }
  monthlyRevenue: { mes: string; valor: number }[]
  topServices: { service: string; qty: number; revenue: number }[]
}

export const professionalsData: ProfessionalFull[] = [
  {
    id: "ana", name: "Ana Costa", role: "Cabeleireira Senior", avatar: "AC",
    phone: "(84) 99887-1234", email: "ana@studio.com", since: "Jan 2023",
    color: "#105a73",
    stats: {
      atendimentos: 28, receita: 8400, ocupacao: 87, ticketMedio: 300,
      cancelamentos: 2, noShows: 1, avaliacaoMedia: 4.9, clientesUnicos: 22,
      comissao: 40, comissaoValor: 3360,
    },
    monthlyRevenue: [
      { mes: "Jan", valor: 6200 }, { mes: "Fev", valor: 7100 }, { mes: "Mar", valor: 6800 },
      { mes: "Abr", valor: 8100 }, { mes: "Mai", valor: 7900 }, { mes: "Jun", valor: 8400 },
    ],
    topServices: [
      { service: "Coloração", qty: 12, revenue: 3600 },
      { service: "Corte + Escova", qty: 10, revenue: 2600 },
      { service: "Tratamento Capilar", qty: 6, revenue: 2200 },
    ],
  },
  {
    id: "carlos", name: "Carlos Mendes", role: "Barbeiro", avatar: "CM",
    phone: "(84) 99765-4321", email: "carlos@studio.com", since: "Mar 2023",
    color: "#F59E0B",
    stats: {
      atendimentos: 22, receita: 5200, ocupacao: 72, ticketMedio: 236,
      cancelamentos: 3, noShows: 2, avaliacaoMedia: 4.7, clientesUnicos: 18,
      comissao: 35, comissaoValor: 1820,
    },
    monthlyRevenue: [
      { mes: "Jan", valor: 3800 }, { mes: "Fev", valor: 4200 }, { mes: "Mar", valor: 4500 },
      { mes: "Abr", valor: 4800 }, { mes: "Mai", valor: 5000 }, { mes: "Jun", valor: 5200 },
    ],
    topServices: [
      { service: "Corte Masculino", qty: 14, revenue: 2100 },
      { service: "Barba", qty: 10, revenue: 1500 },
      { service: "Corte + Barba", qty: 5, revenue: 1600 },
    ],
  },
  {
    id: "beatriz", name: "Beatriz Lima", role: "Manicure / Pedicure", avatar: "BL",
    phone: "(84) 99654-8765", email: "beatriz@studio.com", since: "Jun 2023",
    color: "#EC4899",
    stats: {
      atendimentos: 18, receita: 3800, ocupacao: 65, ticketMedio: 211,
      cancelamentos: 1, noShows: 0, avaliacaoMedia: 4.8, clientesUnicos: 15,
      comissao: 35, comissaoValor: 1330,
    },
    monthlyRevenue: [
      { mes: "Jan", valor: 2200 }, { mes: "Fev", valor: 2800 }, { mes: "Mar", valor: 3100 },
      { mes: "Abr", valor: 3400 }, { mes: "Mai", valor: 3600 }, { mes: "Jun", valor: 3800 },
    ],
    topServices: [
      { service: "Manicure + Pedicure", qty: 10, revenue: 2000 },
      { service: "Unhas em Gel", qty: 5, revenue: 1250 },
      { service: "Manicure", qty: 3, revenue: 550 },
    ],
  },
]

export const radarData = [
  { metric: "Receita", Ana: 95, Carlos: 62, Beatriz: 45 },
  { metric: "Ocupação", Ana: 87, Carlos: 72, Beatriz: 65 },
  { metric: "Avaliação", Ana: 98, Carlos: 94, Beatriz: 96 },
  { metric: "Clientes", Ana: 88, Carlos: 72, Beatriz: 60 },
  { metric: "Ticket", Ana: 85, Carlos: 67, Beatriz: 60 },
]
