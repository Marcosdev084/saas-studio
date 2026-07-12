import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

// GET — retorna o caixa de hoje (ou o último aberto) + histórico dos últimos 30 dias
export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const hoje = toDateOnly(new Date())

  const caixaHoje = await prisma.caixaDiario.findUnique({
    where: { estabelecimentoId_data: { estabelecimentoId: estabId, data: hoje } },
  })

  // Movimentações à vista de hoje (dinheiro/pix = entradas imediatas)
  const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0)
  const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999)

  const [entradasHoje, saidasHoje] = await Promise.all([
    prisma.transacao.aggregate({
      where: { estabelecimentoId: estabId, tipo: "RECEITA", dataTransacao: { gte: inicioHoje, lte: fimHoje } },
      _sum: { valor: true },
    }),
    prisma.transacao.aggregate({
      where: { estabelecimentoId: estabId, tipo: "DESPESA", dataTransacao: { gte: inicioHoje, lte: fimHoje } },
      _sum: { valor: true },
    }),
  ])

  const totalEntradas = Number(entradasHoje._sum.valor ?? 0)
  const totalSaidas = Number(saidasHoje._sum.valor ?? 0)

  // Histórico dos últimos 30 caixas fechados
  const historico = await prisma.caixaDiario.findMany({
    where: { estabelecimentoId: estabId, aberto: false },
    orderBy: { data: "desc" },
    take: 30,
  })

  return NextResponse.json({
    caixaHoje: caixaHoje ? {
      id: caixaHoje.id,
      data: caixaHoje.data,
      saldoInicial: Number(caixaHoje.saldoInicial),
      totalEntradas,
      totalSaidas,
      saldoEsperado: Number(caixaHoje.saldoInicial) + totalEntradas - totalSaidas,
      saldoFinal: caixaHoje.saldoFinal != null ? Number(caixaHoje.saldoFinal) : null,
      saldoConferido: caixaHoje.saldoConferido != null ? Number(caixaHoje.saldoConferido) : null,
      diferenca: caixaHoje.diferenca != null ? Number(caixaHoje.diferenca) : null,
      aberto: caixaHoje.aberto,
      observacoes: caixaHoje.observacoes,
      abertoEm: caixaHoje.abertoEm,
      fechadoEm: caixaHoje.fechadoEm,
    } : null,
    movimentacoesHoje: { totalEntradas, totalSaidas },
    historico: historico.map((c) => ({
      id: c.id,
      data: c.data,
      saldoInicial: Number(c.saldoInicial),
      totalEntradas: Number(c.totalEntradas),
      totalSaidas: Number(c.totalSaidas),
      saldoFinal: Number(c.saldoFinal ?? 0),
      saldoConferido: c.saldoConferido != null ? Number(c.saldoConferido) : null,
      diferenca: c.diferenca != null ? Number(c.diferenca) : null,
      fechadoEm: c.fechadoEm,
    })),
  })
}

// POST — abrir o caixa do dia
export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE", "RECEPCIONISTA")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { saldoInicial } = body
  if (saldoInicial == null || saldoInicial < 0) {
    return NextResponse.json({ error: "Saldo inicial é obrigatório" }, { status: 400 })
  }

  const hoje = toDateOnly(new Date())

  const existente = await prisma.caixaDiario.findUnique({
    where: { estabelecimentoId_data: { estabelecimentoId: estabId, data: hoje } },
  })
  if (existente) {
    return NextResponse.json({ error: "Caixa de hoje já foi aberto" }, { status: 409 })
  }

  const caixa = await prisma.caixaDiario.create({
    data: {
      estabelecimentoId: estabId,
      data: hoje,
      saldoInicial,
      abertoPor: auth.usuario.nome,
    },
  })

  return NextResponse.json(caixa, { status: 201 })
}

// PATCH — fechar o caixa do dia (com conferência)
export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE", "RECEPCIONISTA")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { saldoConferido, observacoes } = body
  if (saldoConferido == null || saldoConferido < 0) {
    return NextResponse.json({ error: "Informe o saldo conferido (contagem de gaveta)" }, { status: 400 })
  }

  const hoje = toDateOnly(new Date())

  const caixa = await prisma.caixaDiario.findUnique({
    where: { estabelecimentoId_data: { estabelecimentoId: estabId, data: hoje } },
  })
  if (!caixa) return NextResponse.json({ error: "Caixa não foi aberto hoje" }, { status: 404 })
  if (!caixa.aberto) return NextResponse.json({ error: "Caixa já foi fechado" }, { status: 409 })

  // Calcular movimentações do dia
  const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0)
  const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999)

  const [entradasHoje, saidasHoje] = await Promise.all([
    prisma.transacao.aggregate({
      where: { estabelecimentoId: estabId, tipo: "RECEITA", dataTransacao: { gte: inicioHoje, lte: fimHoje } },
      _sum: { valor: true },
    }),
    prisma.transacao.aggregate({
      where: { estabelecimentoId: estabId, tipo: "DESPESA", dataTransacao: { gte: inicioHoje, lte: fimHoje } },
      _sum: { valor: true },
    }),
  ])

  const totalEntradas = Number(entradasHoje._sum.valor ?? 0)
  const totalSaidas = Number(saidasHoje._sum.valor ?? 0)
  const saldoFinal = Number(caixa.saldoInicial) + totalEntradas - totalSaidas
  const diferenca = saldoConferido - saldoFinal

  const fechado = await prisma.caixaDiario.update({
    where: { id: caixa.id },
    data: {
      totalEntradas,
      totalSaidas,
      saldoFinal,
      saldoConferido,
      diferenca: Math.round(diferenca * 100) / 100,
      observacoes: observacoes?.trim() || null,
      fechadoPor: auth.usuario.nome,
      aberto: false,
      fechadoEm: new Date(),
    },
  })

  return NextResponse.json(fechado)
}
