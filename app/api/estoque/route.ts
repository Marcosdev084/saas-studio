import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

// GET — lista de produtos + estatísticas + histórico recente de movimentações
export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const produtosRaw = await prisma.produto.findMany({
    where: { estabelecimentoId: estabId, ativo: true },
    orderBy: { nome: "asc" },
  })

  const produtos = produtosRaw.map((p) => {
    const custo = Number(p.custoUnitario)
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      categoria: p.categoria,
      sku: p.sku,
      unidade: p.unidade,
      quantidade: p.quantidade,
      estoqueMinimo: p.estoqueMinimo,
      custoUnitario: custo,
      precoVenda: p.precoVenda != null ? Number(p.precoVenda) : null,
      valorEmEstoque: p.quantidade * custo,
      baixo: p.quantidade <= p.estoqueMinimo,
    }
  })

  const movimentacoesRaw = await prisma.movimentacaoEstoque.findMany({
    where: { estabelecimentoId: estabId },
    orderBy: { criadoEm: "desc" },
    take: 30,
    include: { produto: { select: { nome: true, unidade: true } } },
  })
  const movimentacoes = movimentacoesRaw.map((m) => ({
    id: m.id,
    produtoNome: m.produto.nome,
    unidade: m.produto.unidade,
    tipo: m.tipo,
    quantidade: m.quantidade,
    custoUnitario: m.custoUnitario != null ? Number(m.custoUnitario) : null,
    observacao: m.observacao,
    criadoEm: m.criadoEm,
    gerouDespesa: m.transacaoId != null,
  }))

  const stats = {
    totalProdutos: produtos.length,
    itensEmEstoque: produtos.reduce((sum, p) => sum + p.quantidade, 0),
    valorEstoque: produtos.reduce((sum, p) => sum + p.valorEmEstoque, 0),
    baixoEstoque: produtos.filter((p) => p.baixo).length,
  }

  return NextResponse.json({ produtos, movimentacoes, stats })
}

// POST — cria um produto (opcionalmente com saldo inicial, sem gerar despesa)
export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, descricao, categoria, sku, unidade, estoqueMinimo, custoUnitario, precoVenda, quantidadeInicial } = body
  if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const custo = custoUnitario != null && !isNaN(Number(custoUnitario)) ? Number(custoUnitario) : 0
  const preco = precoVenda != null && precoVenda !== "" && !isNaN(Number(precoVenda)) ? Number(precoVenda) : null
  const minimo = estoqueMinimo != null && !isNaN(Number(estoqueMinimo)) ? Math.max(0, Math.round(Number(estoqueMinimo))) : 0
  const qtdInicial = quantidadeInicial != null && !isNaN(Number(quantidadeInicial)) ? Math.max(0, Math.round(Number(quantidadeInicial))) : 0

  const produto = await prisma.produto.create({
    data: {
      estabelecimentoId: estabId,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      categoria: categoria?.trim() || null,
      sku: sku?.trim() || null,
      unidade: (unidade?.trim() || "un"),
      estoqueMinimo: minimo,
      custoUnitario: custo,
      precoVenda: preco,
      quantidade: qtdInicial,
    },
  })

  // Saldo inicial é registrado como AJUSTE (não gera despesa financeira)
  if (qtdInicial > 0) {
    await prisma.movimentacaoEstoque.create({
      data: {
        estabelecimentoId: estabId,
        produtoId: produto.id,
        tipo: "AJUSTE",
        quantidade: qtdInicial,
        observacao: "Saldo inicial",
      },
    })
  }

  return NextResponse.json({ id: produto.id }, { status: 201 })
}

// PATCH — edita os dados de um produto (a quantidade muda apenas via movimentação)
export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const produto = await prisma.produto.findFirst({ where: { id, estabelecimentoId: estabId } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  const updated = await prisma.produto.update({
    where: { id },
    data: {
      ...(body.nome !== undefined && { nome: String(body.nome).trim() }),
      ...(body.descricao !== undefined && { descricao: body.descricao?.trim() || null }),
      ...(body.categoria !== undefined && { categoria: body.categoria?.trim() || null }),
      ...(body.sku !== undefined && { sku: body.sku?.trim() || null }),
      ...(body.unidade !== undefined && { unidade: body.unidade?.trim() || "un" }),
      ...(body.estoqueMinimo !== undefined && { estoqueMinimo: Math.max(0, Math.round(Number(body.estoqueMinimo) || 0)) }),
      ...(body.custoUnitario !== undefined && { custoUnitario: Number(body.custoUnitario) || 0 }),
      ...(body.precoVenda !== undefined && { precoVenda: body.precoVenda === "" || body.precoVenda == null ? null : Number(body.precoVenda) }),
    },
  })

  return NextResponse.json({ id: updated.id })
}

// DELETE — desativa o produto (soft delete)
export async function DELETE(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const produto = await prisma.produto.findFirst({ where: { id, estabelecimentoId: estabId } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  await prisma.produto.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
