import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

async function processarRecorrentes(estabId: string) {
  const hoje = new Date()
  if (hoje.getDate() !== 1) return

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0)

  const recorrentes = await prisma.despesaRecorrente.findMany({
    where: { estabelecimentoId: estabId, ativo: true },
  })

  for (const rec of recorrentes) {
    const jaRegistrou = rec.ultimoRegistro && new Date(rec.ultimoRegistro) >= inicioMes

    if (!jaRegistrou) {
      await prisma.transacao.create({
        data: {
          estabelecimentoId: estabId,
          tipo: "DESPESA",
          descricao: `${rec.descricao} (recorrente)`,
          valor: rec.valor,
          categoria: rec.categoria,
          dataTransacao: inicioMes,
        },
      })
      await prisma.despesaRecorrente.update({
        where: { id: rec.id },
        data: { ultimoRegistro: inicioMes },
      })
    }
  }
}

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  await processarRecorrentes(estabId)

  const profissionais = await prisma.profissional.findMany({
    where: { estabelecimentoId: estabId, ativo: true },
    select: { id: true, nome: true, cor: true, receitaTotal: true, comissaoPadrao: true, totalAtendimentos: true },
    orderBy: { receitaTotal: "desc" },
  })

  const receitaPorProf = profissionais.map((p) => ({
    nome: p.nome, cor: p.cor,
    receita: Number(p.receitaTotal), comissaoPct: Number(p.comissaoPadrao),
    comissao: Math.round(Number(p.receitaTotal) * (Number(p.comissaoPadrao) / 100)),
  }))

  const totalReceita = receitaPorProf.reduce((a, p) => a + p.receita, 0)
  const totalComissoes = receitaPorProf.reduce((a, p) => a + p.comissao, 0)
  const despesasAgg = await prisma.transacao.aggregate({ where: { estabelecimentoId: estabId, tipo: "DESPESA" }, _sum: { valor: true } })
  const totalDespesas = Number(despesasAgg._sum.valor ?? 0)

  const servicos = await prisma.servico.findMany({ where: { estabelecimentoId: estabId, ativo: true }, select: { nome: true, preco: true, profissionais: { select: { profissional: { select: { totalAtendimentos: true } } } } }, orderBy: { preco: "desc" } })
  const cores = ["#105a73", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#94A3B8"]
  const receitaPorServico = servicos.map((s, i) => ({ nome: s.nome, valor: Math.round(Number(s.preco) * (s.profissionais.length > 0 ? s.profissionais.length * 4 : 1)), cor: cores[i % cores.length] })).sort((a, b) => b.valor - a.valor).slice(0, 6)
  const totalServicos = receitaPorServico.reduce((a, s) => a + s.valor, 0)
  const receitaPorServicoComPct = receitaPorServico.map((s) => ({ ...s, pct: totalServicos > 0 ? Math.round((s.valor / totalServicos) * 100) : 0 }))

  const agora = new Date()
  const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7)
  const agendFuturos = await prisma.agendamento.findMany({ where: { estabelecimentoId: estabId, dataHoraInicio: { gte: agora, lte: em7dias }, status: { in: ["CONFIRMADO", "PENDENTE"] } }, select: { dataHoraInicio: true, valorTotal: true }, orderBy: { dataHoraInicio: "asc" } })
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const projPorDia: Record<string, number> = {}
  agendFuturos.forEach((a) => { const d = new Date(a.dataHoraInicio); const label = `${diasSemana[d.getDay()]} ${d.getDate()}`; projPorDia[label] = (projPorDia[label] ?? 0) + Number(a.valorTotal) })
  let projecao = Object.entries(projPorDia).map(([dia, previsto]) => ({ dia, previsto }))
  if (projecao.length === 0) { for (let i = 1; i <= 6; i++) { const d = new Date(); d.setDate(d.getDate() + i); if (d.getDay() === 0) continue; projecao.push({ dia: `${diasSemana[d.getDay()]} ${d.getDate()}`, previsto: 0 }) } }
  const totalProjecao = projecao.reduce((a, p) => a + p.previsto, 0)

  const mesesAbrev = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const evolucao: { mes: string; receita: number; despesa: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ano = d.getFullYear()
    const mes = d.getMonth()
    const inicio = new Date(ano, mes, 1)
    const fim = new Date(ano, mes + 1, 1)

    const [receitaMes, despesaMes] = await Promise.all([
      prisma.agendamento.aggregate({
        where: { estabelecimentoId: estabId, status: "CONCLUIDO", dataHoraInicio: { gte: inicio, lt: fim } },
        _sum: { valorTotal: true },
      }),
      prisma.transacao.aggregate({
        where: { estabelecimentoId: estabId, tipo: "DESPESA", dataTransacao: { gte: inicio, lt: fim } },
        _sum: { valor: true },
      }),
    ])

    const anoAbrev = String(ano).slice(2)
    evolucao.push({
      mes: `${mesesAbrev[mes]}/${anoAbrev}`,
      receita: Number(receitaMes._sum.valorTotal ?? 0),
      despesa: Number(despesaMes._sum.valor ?? 0),
    })
  }

  const despesasRecentes = await prisma.transacao.findMany({
    where: { estabelecimentoId: estabId, tipo: "DESPESA" },
    orderBy: { dataTransacao: "desc" },
    take: 10,
    select: { id: true, descricao: true, categoria: true, valor: true, dataTransacao: true },
  })

  const recorrentes = await prisma.despesaRecorrente.findMany({
    where: { estabelecimentoId: estabId },
    orderBy: { criadoEm: "desc" },
    select: { id: true, descricao: true, valor: true, categoria: true, diaVencimento: true, pagoEm: true, ativo: true, ultimoRegistro: true, criadoEm: true },
  })

  return NextResponse.json({
    kpis: { receita: totalReceita, despesas: totalDespesas, lucro: totalReceita - totalDespesas, comissoes: totalComissoes },
    receitaPorProf, receitaPorServico: receitaPorServicoComPct, projecao, totalProjecao, evolucao, despesasRecentes, recorrentes,
  })
}

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const { descricao, valor, categoria, dataTransacao, recorrente, diaVencimento } = body

  if (!descricao?.trim() || !valor || valor <= 0) {
    return NextResponse.json({ error: "Descrição e valor são obrigatórios" }, { status: 400 })
  }

  if (recorrente) {
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0)

    const despesaRecorrente = await prisma.despesaRecorrente.create({
      data: {
        estabelecimentoId: usuario.estabelecimentoId,
        descricao: descricao.trim(),
        valor,
        categoria: categoria?.trim() || null,
        diaVencimento: diaVencimento ? parseInt(diaVencimento) : null,
        ultimoRegistro: inicioMes,
      },
    })

    await prisma.transacao.create({
      data: {
        estabelecimentoId: usuario.estabelecimentoId,
        tipo: "DESPESA",
        descricao: `${descricao.trim()} (recorrente)`,
        valor,
        categoria: categoria?.trim() || null,
        dataTransacao: agora,
      },
    })

    return NextResponse.json(despesaRecorrente, { status: 201 })
  }

  const transacao = await prisma.transacao.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      tipo: "DESPESA",
      descricao: descricao.trim(),
      valor,
      categoria: categoria?.trim() || null,
      dataTransacao: dataTransacao ? new Date(dataTransacao + "T12:00:00") : new Date(),
    },
  })

  return NextResponse.json(transacao, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const { id, tipo } = body

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  if (tipo === "transacao") {
    const { descricao, valor, categoria } = body
    const transacao = await prisma.transacao.findFirst({
      where: { id, estabelecimentoId: usuario.estabelecimentoId, tipo: "DESPESA" },
    })
    if (!transacao) return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 })

    const updated = await prisma.transacao.update({
      where: { id },
      data: {
        ...(descricao !== undefined && { descricao: descricao.trim() }),
        ...(valor !== undefined && { valor }),
        ...(categoria !== undefined && { categoria: categoria?.trim() || null }),
      },
    })
    return NextResponse.json(updated)
  }

  const { ativo, pago } = body
  const rec = await prisma.despesaRecorrente.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!rec) return NextResponse.json({ error: "Despesa recorrente não encontrada" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (ativo !== undefined) data.ativo = ativo
  if (pago !== undefined) data.pagoEm = pago ? new Date() : null

  const updated = await prisma.despesaRecorrente.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const tipo = searchParams.get("tipo")
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  if (tipo === "transacao") {
    const transacao = await prisma.transacao.findFirst({
      where: { id, estabelecimentoId: usuario.estabelecimentoId, tipo: "DESPESA", pagamentoId: null },
    })
    if (!transacao) return NextResponse.json({ error: "Despesa não encontrada ou vinculada a pagamento" }, { status: 404 })

    await prisma.transacao.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  const rec = await prisma.despesaRecorrente.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!rec) return NextResponse.json({ error: "Despesa recorrente não encontrada" }, { status: 404 })

  await prisma.despesaRecorrente.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
