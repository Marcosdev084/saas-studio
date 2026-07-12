import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true, nome: true, email: true, telefone: true, totalVisitas: true,
      ticketMedio: true, totalGasto: true, ultimaVisita: true, diasDesdeUltimaVisita: true,
      riscoChurn: true, scoreChurn: true,
    },
    where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    orderBy: { scoreChurn: "desc" },
  })

  return NextResponse.json(clientes)
}

export async function POST(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await request.json()
  const { nome, email, telefone, dataNascimento, observacoes } = body

  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  }

  const cliente = await prisma.cliente.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      nome,
      email: email || null,
      telefone: telefone || null,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      observacoes: observacoes || null,
    },
  })

  // Criar registro de fidelidade automaticamente
  await prisma.fidelidade.create({
    data: { clienteId: cliente.id, pontos: 0, nivel: "PRATA" },
  })

  return NextResponse.json(cliente, { status: 201 })
}
