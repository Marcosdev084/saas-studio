import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json([], { status: 200 })
  const estabId = usuario.estabelecimentoId

  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  amanha.setHours(23, 59, 59, 999)

  const [agendamentosHoje, sugestoesIA, noShows, novosClientes] = await Promise.all([
    prisma.agendamento.findMany({
      where: {
        estabelecimentoId: estabId,
        dataHoraInicio: { gte: hoje.toISOString().split("T")[0] + "T00:00:00Z", lte: amanha.toISOString() },
        status: { in: ["PENDENTE", "CONFIRMADO"] },
      },
      include: { cliente: { select: { nome: true } }, profissional: { select: { nome: true } } },
      orderBy: { dataHoraInicio: "asc" },
      take: 5,
    }),
    prisma.sugestaoIA.findMany({
      where: { estabelecimentoId: estabId, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      take: 3,
    }),
    prisma.agendamento.findMany({
      where: {
        estabelecimentoId: estabId,
        status: "NO_SHOW",
        dataHoraInicio: { gte: ontem.toISOString() },
      },
      include: { cliente: { select: { nome: true } } },
      take: 3,
    }),
    prisma.cliente.findMany({
      where: {
        estabelecimentoId: estabId,
        ativo: true,
        criadoEm: { gte: ontem.toISOString() },
      },
      select: { id: true, nome: true, criadoEm: true },
      take: 3,
    }),
  ])

  const notifs: Array<{
    id: string
    tipo: string
    titulo: string
    descricao: string
    lida: boolean
    criadoEm: string
  }> = []

  for (const ag of agendamentosHoje) {
    const hora = new Date(ag.dataHoraInicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    notifs.push({
      id: `ag-${ag.id}`,
      tipo: "agendamento",
      titulo: `Agendamento às ${hora}`,
      descricao: `${ag.cliente.nome} com ${ag.profissional.nome}`,
      lida: ag.status === "CONFIRMADO",
      criadoEm: ag.dataHoraInicio.toISOString(),
    })
  }

  for (const s of sugestoesIA) {
    notifs.push({
      id: `ia-${s.id}`,
      tipo: "servico",
      titulo: s.titulo,
      descricao: s.descricao,
      lida: false,
      criadoEm: s.criadoEm.toISOString(),
    })
  }

  for (const ns of noShows) {
    notifs.push({
      id: `ns-${ns.id}`,
      tipo: "cliente",
      titulo: "No-show registrado",
      descricao: `${ns.cliente.nome} não compareceu ao agendamento`,
      lida: false,
      criadoEm: ns.dataHoraInicio.toISOString(),
    })
  }

  for (const nc of novosClientes) {
    notifs.push({
      id: `nc-${nc.id}`,
      tipo: "cliente",
      titulo: "Novo cliente cadastrado",
      descricao: `${nc.nome} foi adicionado à sua base`,
      lida: true,
      criadoEm: nc.criadoEm.toISOString(),
    })
  }

  notifs.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())

  return NextResponse.json(notifs)
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  return NextResponse.json({ ok: true })
}
