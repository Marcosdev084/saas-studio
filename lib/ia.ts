export interface AISuggestionFull {
  id: number
  type: "retention" | "opportunity" | "insight"
  title: string
  desc: string
  action: string
  status: "pendente" | "executado"
  date: string
  priority: "high" | "medium" | "low"
}

export const aiHistory: AISuggestionFull[] = [
  { id: 1, type: "retention", title: "Carla Souza não vem há 38 dias", desc: "Frequência habitual: 25 dias. Risco de perda alto. Sugestão: enviar oferta de retoque.", action: "Enviar mensagem personalizada", status: "pendente", date: "22/Jun", priority: "high" },
  { id: 2, type: "opportunity", title: "2 horários vagos amanhã (14h e 15:30h)", desc: "3 clientes costumam agendar nesse período. Posso avisá-los automaticamente.", action: "Notificar clientes", status: "pendente", date: "22/Jun", priority: "medium" },
  { id: 3, type: "insight", title: "Ana gerou 42% mais receita essa semana", desc: "Motivo: 3 procedimentos de coloração premium. Priorize esses serviços na agenda dela.", action: "Ver detalhes", status: "pendente", date: "22/Jun", priority: "low" },
  { id: 4, type: "retention", title: "Roberto Almeida atrasando padrão", desc: "Frequência de 30 dias, já está em 25. Enviar lembrete preventivo?", action: "Enviar lembrete", status: "pendente", date: "22/Jun", priority: "medium" },
  { id: 5, type: "insight", title: "Sábados geram 35% da receita semanal", desc: "Considere estender o horário nos sábados ou adicionar mais profissionais.", action: "Ver análise", status: "executado", date: "20/Jun", priority: "low" },
  { id: 6, type: "opportunity", title: "Beatriz tem 40% de ociosidade às terças", desc: "Sugestão: promoção de manicure às terças para preencher a agenda.", action: "Criar promoção", status: "executado", date: "19/Jun", priority: "medium" },
  { id: 7, type: "retention", title: "5 clientes não voltaram no prazo", desc: "Campanha automática enviada para os 5 clientes. 3 já reagendaram.", action: "Ver resultados", status: "executado", date: "18/Jun", priority: "high" },
]
