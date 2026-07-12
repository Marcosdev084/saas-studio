export interface AgendaSlot {
  client: string
  clientId?: string
  service: string
  status: "concluido" | "atendendo" | "confirmado" | "pendente"
  duration: number
}

export const hours = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]

export const profColors: Record<string, string> = {
  "Ana": "#105a73",
  "Carlos": "#F59E0B",
  "Beatriz": "#EC4899",
}

export const agendaSlots: Record<string, Record<string, AgendaSlot | "__cont" | null>> = {
  "Ana": {
    "08:00": { client: "Maria Silva", clientId: "maria-silva", service: "Corte + Escova", status: "concluido", duration: 1 },
    "09:00": null,
    "10:00": { client: "Carla Souza", clientId: "carla-souza", service: "Coloração", status: "confirmado", duration: 2 },
    "11:00": "__cont",
    "12:00": null,
    "13:00": null,
    "14:00": { client: "Fernanda Costa", clientId: "fernanda-costa", service: "Tratamento", status: "confirmado", duration: 1 },
    "15:00": null,
    "16:00": { client: "Rita Oliveira", service: "Corte + Escova", status: "pendente", duration: 1 },
    "17:00": null,
    "18:00": null,
  },
  "Carlos": {
    "08:00": null,
    "09:00": { client: "João Mendes", clientId: "joao-mendes", service: "Barba", status: "atendendo", duration: 1 },
    "10:00": { client: "Pedro Lima", clientId: "pedro-lima", service: "Corte Masculino", status: "confirmado", duration: 1 },
    "11:00": { client: "Lucas Rocha", service: "Corte + Barba", status: "confirmado", duration: 1 },
    "12:00": null,
    "13:00": null,
    "14:00": null,
    "15:00": { client: "André Santos", service: "Corte Masculino", status: "pendente", duration: 1 },
    "16:00": null,
    "17:00": null,
    "18:00": null,
  },
  "Beatriz": {
    "08:00": { client: "Lucia Alves", clientId: "lucia-alves", service: "Manicure + Pedicure", status: "confirmado", duration: 2 },
    "09:00": "__cont",
    "10:00": null,
    "11:00": { client: "Paula Dias", service: "Unhas em Gel", status: "confirmado", duration: 2 },
    "12:00": "__cont",
    "13:00": null,
    "14:00": null,
    "15:00": { client: "Camila Reis", service: "Manicure", status: "pendente", duration: 1 },
    "16:00": null,
    "17:00": null,
    "18:00": null,
  },
}
