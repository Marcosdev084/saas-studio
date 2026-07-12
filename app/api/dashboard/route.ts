import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const estabId = usuario.estabelecimentoId

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1)
  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(fimSemana.getDate() + 7)

  const [
    totalClientes,
    totalProfissionais,
    sugestoesIA,
    profissionais,
    clientesEmRisco,
    agendamentosHoje,
    agendamentosSemana,
    todosAgendamentosConcluidos,
  ] = await Promise.all([
    prisma.cliente.count({ where: { estabelecimentoId: estabId, ativo: true } }),
    prisma.profissional.count({ where: { estabelecimentoId: estabId, ativo: true } }),
    prisma.sugestaoIA.findMany({
      where: { estabelecimentoId: estabId, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      take: 5,
    }),
    prisma.profissional.findMany({
      select: { id: true, nome: true, cor: true, totalAtendimentos: true, receitaTotal: true, avaliacaoMedia: true },
      where: { estabelecimentoId: estabId, ativo: true },
    }),
    prisma.cliente.findMany({
      where: { estabelecimentoId: estabId, riscoChurn: "ALTO" },
      select: { id: true, nome: true, diasDesdeUltimaVisita: true, scoreChurn: true },
      orderBy: { scoreChurn: "desc" },
      take: 5,
    }),
    prisma.agendamento.findMany({
      where: {
        estabelecimentoId: estabId,
        dataHoraInicio: { gte: hoje, lt: amanha },
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        profissional: { select: { nome: true } },
        servicos: { include: { servico: { select: { nome: true } } } },
      },
      orderBy: { dataHoraInicio: "asc" },
    }),
    prisma.agendamento.findMany({
      where: {
        estabelecimentoId: estabId,
        dataHoraInicio: { gte: inicioSemana, lt: fimSemana },
        status: { notIn: ["CANCELADO", "NO_SHOW"] },
      },
      select: { dataHoraInicio: true, valorTotal: true },
    }),
    prisma.agendamento.findMany({
      where: {
        estabelecimentoId: estabId,
        status: "CONCLUIDO",
      },
      select: {
        servicos: { select: { servico: { select: { categoria: true } } } },
      },
    }),
  ])

  // Produtos com baixo estoque (quantidade <= estoque mínimo)
  const produtosAtivos = await prisma.produto.findMany({
    where: { estabelecimentoId: estabId, ativo: true },
    select: { id: true, nome: true, quantidade: true, unidade: true, estoqueMinimo: true },
  })
  const produtosBaixoEstoque = produtosAtivos.filter((p) => p.quantidade <= p.estoqueMinimo)

  const atendimentosAtivos = agendamentosHoje.filter(
    (a) => !["CANCELADO", "NO_SHOW"].includes(a.status)
  )
  const receitaDia = atendimentosAtivos.reduce(
    (sum, a) => sum + Number(a.valorTotal),
    0
  )
  const receitaPrevista = receitaDia
  const horariosVagos = 0

  const agenda = agendamentosHoje.map((a) => {
    const hora = new Date(a.dataHoraInicio).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const statusMap: Record<string, string> = {
      PENDENTE: "pendente",
      CONFIRMADO: "confirmado",
      ATENDENDO: "atendendo",
      CONCLUIDO: "concluido",
      CANCELADO: "cancelado",
      NO_SHOW: "no_show",
    }
    return {
      time: hora,
      client: a.cliente.nome,
      clientId: a.cliente.id,
      service: a.servicos.map((s) => s.servico.nome).join(" + "),
      professional: a.profissional.nome,
      status: statusMap[a.status] ?? "pendente",
    }
  })

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const receitaSemana = diasSemana.map((day, i) => {
    const diaIndex = i === 0 ? 0 : i
    const total = agendamentosSemana
      .filter((a) => new Date(a.dataHoraInicio).getDay() === diaIndex)
      .reduce((sum, a) => sum + Number(a.valorTotal), 0)
    return { day, valor: total }
  })

  const categoriasCount: Record<string, number> = {}
  let totalServicos = 0
  for (const ag of todosAgendamentosConcluidos) {
    for (const s of ag.servicos) {
      const cat = s.servico.categoria || "Outros"
      categoriasCount[cat] = (categoriasCount[cat] || 0) + 1
      totalServicos++
    }
  }

  const cores = ["#105a73", "#27c5f1", "#8dd8f2", "#759ba6", "#0d4a5f", "#1a9ec5", "#d6d9da"]
  const mixServicos = Object.entries(categoriasCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count], i) => ({
      name,
      value: totalServicos > 0 ? Math.round((count / totalServicos) * 100) : 0,
      color: cores[i] ?? "#759ba6",
    }))

  return NextResponse.json({
    kpis: {
      totalClientes,
      totalProfissionais,
      sugestoesPendentes: sugestoesIA.length,
      atendimentosHoje: atendimentosAtivos.length,
      receitaDia,
      receitaPrevista,
      horariosVagos,
    },
    sugestoesIA,
    profissionais,
    clientesEmRisco,
    agenda,
    receitaSemana,
    mixServicos,
    estoqueBaixo: {
      total: produtosBaixoEstoque.length,
      produtos: produtosBaixoEstoque.slice(0, 6).map((p) => ({ id: p.id, nome: p.nome, quantidade: p.quantidade, unidade: p.unidade, estoqueMinimo: p.estoqueMinimo })),
    },
  })
}
