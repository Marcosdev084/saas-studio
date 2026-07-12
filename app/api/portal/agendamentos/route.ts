import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalSession } from "@/lib/portal-auth"

export async function GET() {
  const session = await getPortalSession()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clientes = await prisma.cliente.findMany({
    where: { contaClienteId: session.contaClienteId, ativo: true },
    select: { id: true },
  })

  const clienteIds = clientes.map((c) => c.id)

  if (clienteIds.length === 0) {
    return NextResponse.json([])
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: { clienteId: { in: clienteIds } },
    include: {
      estabelecimento: { select: { nome: true, telefone: true } },
      profissional: { select: { nome: true, cor: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
    orderBy: { dataHoraInicio: "desc" },
    take: 30,
  })

  return NextResponse.json(agendamentos)
}
