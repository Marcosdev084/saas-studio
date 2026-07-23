import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

async function marcarVencidas(estabId: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  await prisma.contaPagar.updateMany({
    where: {
      estabelecimentoId: estabId,
      status: "PENDENTE",
      dataVencimento: { lt: hoje },
    },
    data: { status: "VENCIDO" },
  })
}

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  await marcarVencidas(estabId)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"
  const mes = searchParams.get("mes") // YYYY-MM

  const where: Record<string, unknown> = { estabelecimentoId: estabId }

  if (status && status !== "all") {
    where.status = status
  }

  if (mes) {
    const [ano, mesNum] = mes.split("-").map(Number)
    const inicio = new Date(ano, mesNum - 1, 1)
    const fim = new Date(ano, mesNum, 1)
    where.dataVencimento = { gte: inicio, lt: fim }
  }

  const contas = await prisma.contaPagar.findMany({
    where,
    include: { fornecedor: { select: { id: true, nome: true } } },
    orderBy: { dataVencimento: "asc" },
  })

  // Summary stats
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
  const em7dias = new Date(hoje)
  em7dias.setDate(em7dias.getDate() + 7)

  const [pendentes, vencidas, pagosMes, proximas7dias] = await Promise.all([
    prisma.contaPagar.aggregate({
      where: { estabelecimentoId: estabId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { estabelecimentoId: estabId, status: "VENCIDO" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: {
        estabelecimentoId: estabId,
        status: "PAGO",
        dataPagamento: { gte: inicioMes, lt: fimMes },
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: {
        estabelecimentoId: estabId,
        status: "PENDENTE",
        dataVencimento: { gte: hoje, lte: em7dias },
      },
      _sum: { valor: true },
      _count: true,
    }),
  ])

  const resumo = {
    totalPendente: Number(pendentes._sum.valor ?? 0),
    countPendente: pendentes._count,
    totalVencido: Number(vencidas._sum.valor ?? 0),
    countVencido: vencidas._count,
    totalPagoMes: Number(pagosMes._sum.valor ?? 0),
    countPagoMes: pagosMes._count,
    totalProximos7dias: Number(proximas7dias._sum.valor ?? 0),
    countProximos7dias: proximas7dias._count,
  }

  return NextResponse.json({ contas, resumo })
}

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { descricao, valor, categoria, fornecedorId, dataVencimento, observacoes, recorrente } = body

  if (!descricao?.trim() || !valor || valor <= 0 || !dataVencimento) {
    return NextResponse.json({ error: "Descrição, valor e data de vencimento são obrigatórios" }, { status: 400 })
  }

  if (fornecedorId) {
    const fornecedor = await prisma.fornecedor.findFirst({
      where: { id: fornecedorId, estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    })
    if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
  }

  const conta = await prisma.contaPagar.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      descricao: descricao.trim(),
      valor,
      categoria: categoria?.trim() || null,
      fornecedorId: fornecedorId || null,
      dataVencimento: new Date(dataVencimento + "T12:00:00"),
      observacoes: observacoes?.trim() || null,
      recorrente: recorrente || false,
    },
    include: { fornecedor: { select: { id: true, nome: true } } },
  })

  if (recorrente) {
    const vencDate = new Date(dataVencimento + "T12:00:00")
    await prisma.despesaRecorrente.create({
      data: {
        estabelecimentoId: usuario.estabelecimentoId,
        descricao: descricao.trim(),
        valor,
        categoria: categoria?.trim() || null,
        diaVencimento: vencDate.getDate(),
      },
    })
  }

  return NextResponse.json(conta, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { id, status, descricao, valor, categoria, dataVencimento, observacoes } = body

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const conta = await prisma.contaPagar.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (descricao !== undefined) data.descricao = descricao.trim()
  if (valor !== undefined) data.valor = valor
  if (categoria !== undefined) data.categoria = categoria?.trim() || null
  if (dataVencimento !== undefined) data.dataVencimento = new Date(dataVencimento + "T12:00:00")
  if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null

  if (status !== undefined) {
    data.status = status

    if (status === "PAGO" && conta.status !== "PAGO") {
      data.dataPagamento = new Date()

      await prisma.transacao.create({
        data: {
          estabelecimentoId: usuario.estabelecimentoId,
          tipo: "DESPESA",
          descricao: conta.descricao,
          valor: conta.valor,
          categoria: conta.categoria,
          dataTransacao: new Date(),
        },
      })
    }
  }

  const updated = await prisma.contaPagar.update({
    where: { id },
    data,
    include: { fornecedor: { select: { id: true, nome: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const conta = await prisma.contaPagar.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  if (conta.status === "PAGO") {
    return NextResponse.json({ error: "Não é possível excluir uma conta já paga" }, { status: 400 })
  }

  await prisma.contaPagar.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
