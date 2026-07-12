import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

// GET — lista insumos de um serviço
export async function GET(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const servicoId = searchParams.get("servicoId")
  if (!servicoId) return NextResponse.json({ error: "servicoId obrigatório" }, { status: 400 })

  const servico = await prisma.servico.findFirst({ where: { id: servicoId, estabelecimentoId: estabId }, select: { id: true } })
  if (!servico) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

  const insumos = await prisma.servicoInsumo.findMany({
    where: { servicoId },
    include: { produto: { select: { id: true, nome: true, unidade: true, unidadeConsumo: true, capacidadePorUnidade: true, custoUnitario: true, quantidade: true } } },
  })

  const calcCusto = (i: typeof insumos[0]) => {
    const qtd = Number(i.quantidadeUsada)
    const custoUnit = Number(i.produto.custoUnitario)
    const cap = i.produto.capacidadePorUnidade ? Number(i.produto.capacidadePorUnidade) : null
    if (cap && cap > 0) return (qtd / cap) * custoUnit
    return qtd * custoUnit
  }

  const custoTotal = insumos.reduce((sum, i) => sum + calcCusto(i), 0)

  return NextResponse.json({
    insumos: insumos.map((i) => ({
      id: i.id,
      produtoId: i.produtoId,
      produtoNome: i.produto.nome,
      unidade: i.produto.unidade,
      unidadeConsumo: i.produto.unidadeConsumo ?? null,
      capacidadePorUnidade: i.produto.capacidadePorUnidade ? Number(i.produto.capacidadePorUnidade) : null,
      custoUnitario: Number(i.produto.custoUnitario),
      quantidadeUsada: Number(i.quantidadeUsada),
      custoInsumo: Math.round(calcCusto(i) * 100) / 100,
      estoqueAtual: i.produto.quantidade,
    })),
    custoTotal: Math.round(custoTotal * 100) / 100,
  })
}

// PUT — salva insumos de um serviço em lote (substitui todos)
export async function PUT(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { servicoId, insumos } = body as {
    servicoId: string
    insumos: { produtoId: string; quantidadeUsada: number }[]
  }
  if (!servicoId || !Array.isArray(insumos)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const servico = await prisma.servico.findFirst({ where: { id: servicoId, estabelecimentoId: estabId }, select: { id: true } })
  if (!servico) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

  await prisma.servicoInsumo.deleteMany({ where: { servicoId } })

  const validInsumos = insumos.filter((i) => i.produtoId && i.quantidadeUsada > 0)
  if (validInsumos.length > 0) {
    await prisma.servicoInsumo.createMany({
      data: validInsumos.map((i) => ({
        servicoId,
        produtoId: i.produtoId,
        quantidadeUsada: i.quantidadeUsada,
      })),
    })
  }

  return NextResponse.json({ ok: true })
}
