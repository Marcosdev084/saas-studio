import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

// GET — DRE simplificada do mês (ou de um período)
export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const mesParam = searchParams.get("mes")

  const agora = new Date()
  let ano: number, mes: number

  if (mesParam) {
    const [a, m] = mesParam.split("-").map(Number)
    ano = a; mes = m - 1
  } else {
    ano = agora.getFullYear(); mes = agora.getMonth()
  }

  const inicio = new Date(ano, mes, 1)
  const fim = new Date(ano, mes + 1, 1)

  const estab = await prisma.estabelecimento.findUnique({
    where: { id: estabId },
    select: { proLabore: true, saldoMinimo: true },
  })

  // 1. Receita bruta (agendamentos concluídos)
  const receitaAgg = await prisma.agendamento.aggregate({
    where: { estabelecimentoId: estabId, status: "CONCLUIDO", dataHoraInicio: { gte: inicio, lt: fim } },
    _sum: { valorTotal: true },
    _count: true,
  })
  const receitaBruta = Number(receitaAgg._sum.valorTotal ?? 0)
  const totalAtendimentos = receitaAgg._count

  // 2. Taxas de pagamento (despesas categoria "Taxa de pagamento")
  const taxasAgg = await prisma.transacao.aggregate({
    where: { estabelecimentoId: estabId, tipo: "DESPESA", categoria: "Taxa de pagamento", dataTransacao: { gte: inicio, lt: fim } },
    _sum: { valor: true },
  })
  const taxas = Number(taxasAgg._sum.valor ?? 0)

  // 3. Receita líquida
  const receitaLiquida = receitaBruta - taxas

  // 4. CMV (saídas de estoque no período)
  const cmvMovs = await prisma.movimentacaoEstoque.findMany({
    where: { estabelecimentoId: estabId, tipo: "SAIDA", criadoEm: { gte: inicio, lt: fim } },
    select: { quantidade: true, custoUnitario: true },
  })
  const cmv = cmvMovs.reduce((sum, m) => sum + m.quantidade * Number(m.custoUnitario ?? 0), 0)

  // 5. Lucro bruto
  const lucroBruto = receitaLiquida - cmv

  // 6. Despesas operacionais (todas menos taxas)
  const despOpAgg = await prisma.transacao.aggregate({
    where: {
      estabelecimentoId: estabId,
      tipo: "DESPESA",
      dataTransacao: { gte: inicio, lt: fim },
      NOT: { categoria: "Taxa de pagamento" },
    },
    _sum: { valor: true },
  })
  const despesasOperacionais = Number(despOpAgg._sum.valor ?? 0)

  // Breakdown por categoria
  const despPorCat = await prisma.transacao.groupBy({
    by: ["categoria"],
    where: {
      estabelecimentoId: estabId,
      tipo: "DESPESA",
      dataTransacao: { gte: inicio, lt: fim },
      NOT: { categoria: "Taxa de pagamento" },
    },
    _sum: { valor: true },
    orderBy: { _sum: { valor: "desc" } },
  })
  const despesasPorCategoria = despPorCat.map((d) => ({
    categoria: d.categoria ?? "Sem categoria",
    valor: Number(d._sum.valor ?? 0),
  }))

  // 7. Comissões
  const comissoesAgg = await prisma.comissao.aggregate({
    where: {
      agendamento: { estabelecimentoId: estabId, dataHoraInicio: { gte: inicio, lt: fim }, status: "CONCLUIDO" },
    },
    _sum: { valorComissao: true },
  })
  const comissoes = Number(comissoesAgg._sum.valorComissao ?? 0)

  // 8. EBITDA
  const ebitda = lucroBruto - despesasOperacionais - comissoes

  // 9. Pró-labore
  const proLabore = Number(estab?.proLabore ?? 0)

  // 10. Lucro líquido
  const lucroLiquido = ebitda - proLabore

  // KPIs derivados
  const margemBruta = receitaBruta > 0 ? Math.round((lucroBruto / receitaBruta) * 100) : 0
  const margemLiquida = receitaBruta > 0 ? Math.round((lucroLiquido / receitaBruta) * 100) : 0
  const ticketMedio = totalAtendimentos > 0 ? Math.round((receitaBruta / totalAtendimentos) * 100) / 100 : 0
  const custoAtendimento = totalAtendimentos > 0 ? Math.round(((despesasOperacionais + cmv + comissoes) / totalAtendimentos) * 100) / 100 : 0

  // Ponto de equilíbrio: receita mínima para cobrir custos fixos + variáveis
  const custoFixoMensal = despesasOperacionais + proLabore
  const margemContribuicaoPct = receitaBruta > 0 ? (receitaBruta - cmv - taxas - comissoes) / receitaBruta : 0
  const pontoEquilibrio = margemContribuicaoPct > 0 ? Math.round(custoFixoMensal / margemContribuicaoPct) : 0

  // Dias de caixa: saldo atual / despesa média diária
  const diasNoMes = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  const despesaDiaria = (despesasOperacionais + comissoes + proLabore) / diasNoMes
  const saldoAtual = receitaBruta - taxas - cmv - despesasOperacionais - comissoes - proLabore
  const diasDeCaixa = despesaDiaria > 0 ? Math.round(saldoAtual / despesaDiaria) : 0

  // Giro de estoque
  const estoqueValor = await prisma.produto.aggregate({
    where: { estabelecimentoId: estabId, ativo: true },
    _sum: { custoUnitario: true },
  })
  const valorEstoque = Number(estoqueValor._sum.custoUnitario ?? 0)
  const giroEstoque = valorEstoque > 0 ? Math.round((cmv / valorEstoque) * 10) / 10 : 0

  const mesesAbrev = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

  return NextResponse.json({
    periodo: `${mesesAbrev[mes]}/${ano}`,
    dre: {
      receitaBruta: Math.round(receitaBruta * 100) / 100,
      taxas: Math.round(taxas * 100) / 100,
      receitaLiquida: Math.round(receitaLiquida * 100) / 100,
      cmv: Math.round(cmv * 100) / 100,
      lucroBruto: Math.round(lucroBruto * 100) / 100,
      despesasOperacionais: Math.round(despesasOperacionais * 100) / 100,
      despesasPorCategoria,
      comissoes: Math.round(comissoes * 100) / 100,
      ebitda: Math.round(ebitda * 100) / 100,
      proLabore: Math.round(proLabore * 100) / 100,
      lucroLiquido: Math.round(lucroLiquido * 100) / 100,
    },
    kpis: {
      totalAtendimentos,
      margemBruta,
      margemLiquida,
      ticketMedio,
      custoAtendimento,
      pontoEquilibrio,
      diasDeCaixa,
      giroEstoque,
    },
  })
}

// PATCH — atualizar pró-labore e saldo mínimo
export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: Record<string, unknown> = {}
  if (body.proLabore !== undefined) data.proLabore = Math.max(0, Number(body.proLabore) || 0)
  if (body.saldoMinimo !== undefined) data.saldoMinimo = Math.max(0, Number(body.saldoMinimo) || 0)

  await prisma.estabelecimento.update({ where: { id: estabId }, data })

  return NextResponse.json({ ok: true })
}
