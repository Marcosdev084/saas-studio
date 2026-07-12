import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

// POST — corrige movimentações de estoque antigas que usaram quantidade em unidade de consumo
// em vez de fração de unidade de estoque
export async function POST() {
  const auth = await requirePermissao("ADMIN")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const movs = await prisma.movimentacaoEstoque.findMany({
    where: {
      estabelecimentoId: estabId,
      tipo: "SAIDA",
      observacao: { startsWith: "Consumo automático" },
    },
    include: {
      produto: {
        select: { id: true, custoUnitario: true, capacidadePorUnidade: true, unidadeConsumo: true },
      },
    },
  })

  let corrigidos = 0
  let estornoEstoque = 0

  for (const mov of movs) {
    const cap = mov.produto.capacidadePorUnidade ? Number(mov.produto.capacidadePorUnidade) : null
    if (!cap || cap <= 0) continue

    const qtdAtual = mov.quantidade
    const custoAtual = Number(mov.custoUnitario ?? 0)
    const custoProduto = Number(mov.produto.custoUnitario)

    // Se a quantidade é >= 1 e muito maior que o esperado (fração), é um registro antigo
    // Ex: quantidade=50 (ml bruto) quando deveria ser 0.1 (50ml/500ml)
    if (qtdAtual >= 1 && custoAtual === custoProduto) {
      const qtdCorreta = Math.round((qtdAtual / cap) * 1000) / 1000
      const diferencaEstoque = qtdAtual - qtdCorreta

      await prisma.movimentacaoEstoque.update({
        where: { id: mov.id },
        data: {
          quantidade: qtdCorreta,
          custoUnitario: custoProduto,
          observacao: mov.observacao + " [corrigido]",
        },
      })

      // Devolver unidades descontadas a mais no estoque
      if (diferencaEstoque > 0) {
        await prisma.produto.update({
          where: { id: mov.produto.id },
          data: { quantidade: { increment: Math.round(diferencaEstoque) } },
        })
        estornoEstoque += diferencaEstoque
      }

      corrigidos++
    }
  }

  return NextResponse.json({
    message: `${corrigidos} movimentação(ões) corrigida(s). ${Math.round(estornoEstoque)} unidades devolvidas ao estoque.`,
    corrigidos,
    estornoEstoque: Math.round(estornoEstoque),
  })
}
