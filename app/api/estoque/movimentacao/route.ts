import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

// POST — registra uma movimentação de estoque e ajusta a quantidade do produto.
// ENTRADA (compra) com custo gera uma despesa no financeiro; SAÍDA/AJUSTE não.
export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { produtoId, tipo, quantidade, custoUnitario, observacao, registrarDespesa } = body as {
    produtoId: string; tipo: "ENTRADA" | "SAIDA" | "AJUSTE"; quantidade: number
    custoUnitario?: number; observacao?: string; registrarDespesa?: boolean
  }

  if (!produtoId || !["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo)) {
    return NextResponse.json({ error: "Produto e tipo de movimentação são obrigatórios" }, { status: 400 })
  }
  const qtd = Math.round(Number(quantidade))
  if (isNaN(qtd) || qtd < 0) return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
  if (tipo !== "AJUSTE" && qtd <= 0) return NextResponse.json({ error: "Quantidade deve ser maior que zero" }, { status: 400 })

  const produto = await prisma.produto.findFirst({ where: { id: produtoId, estabelecimentoId: estabId } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  // Calcula a nova quantidade conforme o tipo
  let novaQtd: number
  if (tipo === "ENTRADA") novaQtd = produto.quantidade + qtd
  else if (tipo === "SAIDA") {
    if (qtd > produto.quantidade) return NextResponse.json({ error: "Estoque insuficiente para esta saída" }, { status: 400 })
    novaQtd = produto.quantidade - qtd
  } else novaQtd = qtd // AJUSTE define o valor absoluto

  const custo = custoUnitario != null && !isNaN(Number(custoUnitario)) && Number(custoUnitario) > 0
    ? Number(custoUnitario)
    : Number(produto.custoUnitario)

  // Entrada de compra gera despesa por padrão (quando há custo)
  const deveRegistrarDespesa = tipo === "ENTRADA" && qtd > 0 && custo > 0 && (registrarDespesa ?? true)

  await prisma.$transaction(async (tx) => {
    let transacaoId: string | null = null

    if (deveRegistrarDespesa) {
      const transacao = await tx.transacao.create({
        data: {
          estabelecimentoId: estabId,
          tipo: "DESPESA",
          categoria: "Estoque",
          descricao: `Compra de estoque - ${produto.nome} (${qtd} ${produto.unidade})`,
          valor: custo * qtd,
          dataTransacao: new Date(),
        },
      })
      transacaoId = transacao.id
    }

    await tx.movimentacaoEstoque.create({
      data: {
        estabelecimentoId: estabId,
        produtoId: produto.id,
        tipo,
        quantidade: qtd,
        custoUnitario: tipo === "ENTRADA" ? custo : null,
        observacao: observacao?.trim() || null,
        transacaoId,
      },
    })

    await tx.produto.update({
      where: { id: produto.id },
      data: {
        quantidade: novaQtd,
        // Entrada com custo atualiza o custo unitário de referência do produto
        ...(tipo === "ENTRADA" && custo > 0 ? { custoUnitario: custo } : {}),
      },
    })
  })

  return NextResponse.json({ ok: true, quantidade: novaQtd, gerouDespesa: deveRegistrarDespesa }, { status: 201 })
}
