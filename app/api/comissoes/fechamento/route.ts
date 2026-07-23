import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const fechamentos = await prisma.fechamentoComissao.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId },
    include: {
      profissional: { select: { id: true, nome: true } },
      _count: { select: { comissoes: true } },
    },
    orderBy: { criadoEm: "desc" },
  })

  const resultado = fechamentos.map((f) => ({
    id: f.id,
    profissional: f.profissional,
    periodoInicio: f.periodoInicio,
    periodoFim: f.periodoFim,
    totalBruto: Number(f.totalBruto),
    descontos: Number(f.descontos),
    totalLiquido: Number(f.totalLiquido),
    observacoes: f.observacoes,
    totalComissoes: f._count.comissoes,
    criadoEm: f.criadoEm,
  }))

  return NextResponse.json(resultado)
}

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { profissionalId, periodoInicio, periodoFim, descontos, observacoes } = body

  if (!profissionalId || !periodoInicio || !periodoFim) {
    return NextResponse.json(
      { error: "profissionalId, periodoInicio e periodoFim são obrigatórios" },
      { status: 400 }
    )
  }

  // Verificar que o profissional pertence ao estabelecimento
  const profissional = await prisma.profissional.findFirst({
    where: { id: profissionalId, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!profissional) {
    return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })
  }

  const inicio = new Date(periodoInicio)
  const fim = new Date(periodoFim)

  // Buscar comissões não pagas no período
  const comissoesPendentes = await prisma.comissao.findMany({
    where: {
      profissionalId,
      pago: false,
      agendamento: {
        dataHoraInicio: { gte: inicio, lte: fim },
      },
    },
  })

  if (comissoesPendentes.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma comissão pendente encontrada no período" },
      { status: 400 }
    )
  }

  const totalBruto = comissoesPendentes.reduce(
    (acc, c) => acc + Number(c.valorComissao),
    0
  )
  const valorDescontos = Number(descontos ?? 0)
  const totalLiquido = totalBruto - valorDescontos

  const comissaoIds = comissoesPendentes.map((c) => c.id)

  // Criar fechamento e marcar comissões como pagas em uma transação
  const fechamento = await prisma.$transaction(async (tx) => {
    const fech = await tx.fechamentoComissao.create({
      data: {
        estabelecimentoId: usuario.estabelecimentoId,
        profissionalId,
        periodoInicio: inicio,
        periodoFim: fim,
        totalBruto,
        descontos: valorDescontos,
        totalLiquido,
        observacoes: observacoes || null,
      },
    })

    await tx.comissao.updateMany({
      where: { id: { in: comissaoIds } },
      data: {
        pago: true,
        pagoEm: new Date(),
        fechamentoId: fech.id,
      },
    })

    return fech
  })

  return NextResponse.json(
    {
      id: fechamento.id,
      profissionalId: fechamento.profissionalId,
      periodoInicio: fechamento.periodoInicio,
      periodoFim: fechamento.periodoFim,
      totalBruto: Number(fechamento.totalBruto),
      descontos: Number(fechamento.descontos),
      totalLiquido: Number(fechamento.totalLiquido),
      observacoes: fechamento.observacoes,
      comissoesIncluidas: comissaoIds.length,
    },
    { status: 201 }
  )
}
