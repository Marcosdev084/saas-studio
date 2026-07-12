import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { calcularRisco, diasDesdeVisita } from "@/lib/churn"
import type { StatusAgendamento } from "@prisma/client"

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const profId = searchParams.get("profissional")
  const dataParam = searchParams.get("data")

  const baseDate = dataParam ? new Date(dataParam + "T12:00:00") : new Date()
  const startOfDay = new Date(baseDate); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(baseDate); endOfDay.setHours(23, 59, 59, 999)

  const diaSemana = baseDate.getDay()

  const configHorario = await prisma.configHorario.findFirst({
    where: { estabelecimentoId: estabId, profissionalId: null, diaSemana },
  })

  const horarioDia = configHorario?.ativo !== false && configHorario
    ? { ativo: true, abertura: configHorario.horaAbertura, fechamento: configHorario.horaFechamento }
    : { ativo: false, abertura: "08:00", fechamento: "18:00" }

  const profissionais = await prisma.profissional.findMany({
    where: { estabelecimentoId: estabId, ativo: true, ...(profId && profId !== "all" ? { id: profId } : {}) },
    select: { id: true, nome: true, cor: true, especialidade: true },
    orderBy: { nome: "asc" },
  })

  const configsProfissionais = await prisma.configHorario.findMany({
    where: { estabelecimentoId: estabId, profissionalId: { not: null }, diaSemana },
  })
  const horarioPorProf: Record<string, { ativo: boolean; abertura: string; fechamento: string }> = {}
  configsProfissionais.forEach((c) => {
    if (c.profissionalId) {
      horarioPorProf[c.profissionalId] = { ativo: c.ativo, abertura: c.horaAbertura, fechamento: c.horaFechamento }
    }
  })

  const agendamentos = await prisma.agendamento.findMany({
    where: { estabelecimentoId: estabId, dataHoraInicio: { gte: startOfDay, lte: endOfDay }, ...(profId && profId !== "all" ? { profissionalId: profId } : {}) },
    include: { cliente: { select: { id: true, nome: true } }, profissional: { select: { id: true, nome: true, cor: true } }, servicos: { include: { servico: { select: { nome: true, duracaoMinutos: true } } } } },
    orderBy: { dataHoraInicio: "asc" },
  })

  const slotsPorProf: Record<string, Array<{ id: string; hora: string; clienteId: string | null; clienteNome: string; servico: string; status: string; duracao: number }>> = {}
  profissionais.forEach((p) => { slotsPorProf[p.id] = [] })
  agendamentos.forEach((a) => {
    const dt = new Date(a.dataHoraInicio)
    const dtFim = new Date(a.dataHoraFim)
    const hora = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    const sn = a.servicos.map((s) => s.servico.nome).join(" + ")
    const dur = Math.round((dtFim.getTime() - dt.getTime()) / 60000)
    if (slotsPorProf[a.profissional.id]) {
      slotsPorProf[a.profissional.id].push({ id: a.id, hora, clienteId: a.cliente.id, clienteNome: a.cliente.nome, servico: sn || "Serviço", status: a.status.toLowerCase(), duracao: dur > 0 ? dur : 60 })
    }
  })

  const ativos = agendamentos.filter((a) => !["CANCELADO", "NO_SHOW"].includes(a.status))
  const total = ativos.length
  const confirmados = ativos.filter((a) => a.status === "CONFIRMADO").length
  const atendendo = ativos.filter((a) => a.status === "ATENDENDO").length
  const concluidos = ativos.filter((a) => a.status === "CONCLUIDO").length
  const receitaPrevista = ativos.reduce((sum, a) => sum + Number(a.valorTotal), 0)
  const vagos = Math.max(0, profissionais.length * 10 - total)

  return NextResponse.json({
    profissionais, slotsPorProf,
    stats: { total, confirmados, atendendo, concluidos, vagos, receitaPrevista },
    horarioDia, horarioPorProf,
    data: startOfDay.toISOString(),
  })
}

export async function POST(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { clienteId, profissionalId, servicoIds, data, hora, observacoes } = body as {
    clienteId: string; profissionalId: string; servicoIds: string[]; data: string; hora: string; observacoes?: string
  }

  if (!clienteId || !profissionalId || !servicoIds?.length || !data || !hora) {
    return NextResponse.json({ error: "Cliente, profissional, serviço, data e hora são obrigatórios" }, { status: 400 })
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  const profissionalExiste = await prisma.profissional.findFirst({
    where: { id: profissionalId, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!profissionalExiste) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  const dataDate = new Date(data + "T12:00:00")
  const diaSemana = dataDate.getDay()
  const configEstab = await prisma.configHorario.findFirst({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId: null, diaSemana },
  })
  if (!configEstab || !configEstab.ativo) {
    return NextResponse.json({ error: "O estabelecimento está fechado neste dia" }, { status: 400 })
  }

  const configProf = await prisma.configHorario.findFirst({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId, diaSemana },
  })
  if (configProf && !configProf.ativo) {
    return NextResponse.json({ error: "Este profissional não atende neste dia" }, { status: 400 })
  }

  const [horaNum, minNum] = hora.split(":").map(Number)
  const horaMinutos = horaNum * 60 + minNum

  const [eAbH, eAbM] = configEstab.horaAbertura.split(":").map(Number)
  const [eFeH, eFeM] = configEstab.horaFechamento.split(":").map(Number)
  const estabAbMin = eAbH * 60 + eAbM
  const estabFeMin = eFeH * 60 + eFeM

  let aberturaMin = estabAbMin
  let fechamentoMin = estabFeMin

  if (configProf && configProf.ativo) {
    const [pAbH, pAbM] = configProf.horaAbertura.split(":").map(Number)
    const [pFeH, pFeM] = configProf.horaFechamento.split(":").map(Number)
    aberturaMin = Math.max(estabAbMin, pAbH * 60 + pAbM)
    fechamentoMin = Math.min(estabFeMin, pFeH * 60 + pFeM)
  }

  if (horaMinutos < aberturaMin || horaMinutos >= fechamentoMin) {
    return NextResponse.json({ error: "Horário fora do expediente" }, { status: 400 })
  }

  const idsUnicos = Array.from(new Set(servicoIds))
  const links = await prisma.profissionalServico.findMany({
    where: {
      profissionalId,
      ativo: true,
      servicoId: { in: idsUnicos },
      servico: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    },
    include: { servico: true },
  })
  if (links.length === 0) {
    return NextResponse.json({ error: "Este profissional não oferece os serviços selecionados" }, { status: 400 })
  }
  if (links.length !== idsUnicos.length) {
    return NextResponse.json({ error: "Um ou mais serviços não são oferecidos por este profissional" }, { status: 400 })
  }

  // Preço e duração efetivos: customizado do profissional ou o padrão do serviço.
  const itensServico = links.map((l) => ({
    servicoId: l.servicoId,
    preco: Number(l.precoCustomizado ?? l.servico.preco),
    duracaoMinutos: l.duracaoCustomizada ?? l.servico.duracaoMinutos,
  }))

  const duracaoTotal = itensServico.reduce((sum, i) => sum + i.duracaoMinutos, 0)
  const valorTotal = itensServico.reduce((sum, i) => sum + i.preco, 0)

  const [horas, minutos] = hora.split(":").map(Number)
  const dataHoraInicio = new Date(data + "T12:00:00")
  dataHoraInicio.setHours(horas, minutos, 0, 0)
  const dataHoraFim = new Date(dataHoraInicio)
  dataHoraFim.setMinutes(dataHoraFim.getMinutes() + duracaoTotal)

  const fimMinutos = horaMinutos + duracaoTotal
  if (fimMinutos > fechamentoMin) {
    return NextResponse.json({ error: "O atendimento ultrapassa o horário de fechamento" }, { status: 400 })
  }

  const conflito = await prisma.agendamento.findFirst({
    where: {
      profissionalId,
      status: { notIn: ["CANCELADO", "NO_SHOW"] },
      OR: [
        { dataHoraInicio: { gte: dataHoraInicio, lt: dataHoraFim } },
        { dataHoraFim: { gt: dataHoraInicio, lte: dataHoraFim } },
        { AND: [{ dataHoraInicio: { lte: dataHoraInicio } }, { dataHoraFim: { gte: dataHoraFim } }] },
      ],
    },
  })
  if (conflito) {
    return NextResponse.json({ error: "Já existe um agendamento nesse horário para este profissional" }, { status: 409 })
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      clienteId, profissionalId, dataHoraInicio, dataHoraFim, valorTotal,
      status: "CONFIRMADO",
      observacoes: observacoes || null,
      servicos: {
        create: itensServico.map((i) => ({ servicoId: i.servicoId, preco: i.preco, duracaoMinutos: i.duracaoMinutos })),
      },
    },
    include: { cliente: { select: { nome: true } }, profissional: { select: { nome: true } } },
  })

  return NextResponse.json(agendamento, { status: 201 })
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { agendamentoId, status, formaPagamentoId } = body as { agendamentoId: string; status: string; formaPagamentoId?: string }

  if (!agendamentoId || !status) {
    return NextResponse.json({ error: "ID do agendamento e status são obrigatórios" }, { status: 400 })
  }

  const statusValidos = ["PENDENTE", "CONFIRMADO", "ATENDENDO", "CONCLUIDO", "CANCELADO", "NO_SHOW"]
  if (!statusValidos.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }

  const agendamento = await prisma.agendamento.findFirst({
    where: { id: agendamentoId, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!agendamento) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })

  const atualizado = await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: { status: status as StatusAgendamento },
    include: { cliente: { select: { nome: true } }, profissional: { select: { nome: true } } },
  })

  if (status === "CONCLUIDO" && agendamento.status !== "CONCLUIDO") {
    await atualizarCamposDenormalizados(agendamento.clienteId, agendamento.profissionalId)

    // Fidelidade: concede pontos (1 ponto por R$ 1) e recalcula o nível do cliente
    const pontosGanhos = Math.round(Number(agendamento.valorTotal))
    if (pontosGanhos > 0) {
      const fid = await prisma.fidelidade.upsert({
        where: { clienteId: agendamento.clienteId },
        update: { pontos: { increment: pontosGanhos } },
        create: { clienteId: agendamento.clienteId, pontos: pontosGanhos, nivel: "PRATA" },
      })
      const niveis = await prisma.configFidelidade.findMany({
        where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
        orderBy: { pontosMinimos: "desc" },
      })
      const nivelAlcancado = niveis.find((n) => fid.pontos >= n.pontosMinimos)?.nivel
      if (nivelAlcancado && nivelAlcancado !== fid.nivel) {
        await prisma.fidelidade.update({ where: { clienteId: agendamento.clienteId }, data: { nivel: nivelAlcancado } })
      }
    }

    // Conversão de campanha: cliente que recebeu uma campanha e voltou conta como conversão
    const campanhasPendentes = await prisma.campanhaCliente.findMany({
      where: {
        clienteId: agendamento.clienteId,
        enviado: true,
        convertido: false,
        campanha: { estabelecimentoId: usuario.estabelecimentoId, status: { in: ["ATIVA", "CONCLUIDA"] } },
      },
      select: { id: true, campanhaId: true },
    })
    for (const cc of campanhasPendentes) {
      await prisma.campanhaCliente.update({ where: { id: cc.id }, data: { convertido: true } })
      await prisma.campanha.update({ where: { id: cc.campanhaId }, data: { totalConvertidos: { increment: 1 } } })
    }

    const existePagamento = await prisma.pagamento.findUnique({ where: { agendamentoId } })
    if (!existePagamento) {
      // Forma de pagamento escolhida (com taxa e prazo de recebimento). Sem forma → padrão pago à vista.
      const forma = formaPagamentoId
        ? await prisma.formaPagamento.findFirst({ where: { id: formaPagamentoId, estabelecimentoId: usuario.estabelecimentoId } })
        : null

      const valorBruto = Number(agendamento.valorTotal)
      const taxaPct = forma ? Number(forma.taxaPercentual) : 0
      const taxaValor = Math.round(valorBruto * (taxaPct / 100) * 100) / 100
      const valorLiquido = valorBruto - taxaValor
      const dias = forma ? forma.diasRecebimento : 0
      const aVista = dias <= 0

      const pagamento = await prisma.pagamento.create({
        data: {
          agendamentoId,
          valor: agendamento.valorTotal,
          tipoPagamento: forma ? forma.tipo : "PIX",
          formaPagamentoId: forma?.id ?? null,
          taxaValor: taxaValor > 0 ? taxaValor : null,
          valorLiquido,
          status: aVista ? "PAGO" : "PENDENTE",
          pagoEm: aVista ? new Date() : null,
        },
      })

      // Receita bruta reconhecida no atendimento
      await prisma.transacao.create({
        data: {
          estabelecimentoId: usuario.estabelecimentoId,
          pagamentoId: pagamento.id,
          tipo: "RECEITA",
          valor: agendamento.valorTotal,
          descricao: `Atendimento - ${atualizado.cliente.nome}`,
        },
      })

      // Taxa da maquininha/gateway entra como despesa
      if (taxaValor > 0) {
        await prisma.transacao.create({
          data: {
            estabelecimentoId: usuario.estabelecimentoId,
            tipo: "DESPESA",
            categoria: "Taxa de pagamento",
            descricao: `Taxa ${forma?.nome ?? "cartão"} - ${atualizado.cliente.nome}`,
            valor: taxaValor,
          },
        })
      }

      // Recebimento futuro (ex.: cartão de crédito D+30) vira Conta a Receber
      if (!aVista) {
        const dataPrevista = new Date()
        dataPrevista.setDate(dataPrevista.getDate() + dias)
        await prisma.contaReceber.create({
          data: {
            estabelecimentoId: usuario.estabelecimentoId,
            clienteId: agendamento.clienteId,
            pagamentoId: pagamento.id,
            descricao: `${forma?.nome ?? "Cartão"} - ${atualizado.cliente.nome}`,
            valor: valorBruto,
            valorLiquido,
            dataPrevista,
            origem: "CARTAO",
            status: "PENDENTE",
          },
        })
      }
    }

    const existeComissao = await prisma.comissao.findUnique({ where: { agendamentoId } })
    if (!existeComissao) {
      const profissional = await prisma.profissional.findUnique({
        where: { id: agendamento.profissionalId },
        select: { comissaoPadrao: true },
      })
      const pct = Number(profissional?.comissaoPadrao ?? 0)
      if (pct > 0) {
        const valorComissao = Number(agendamento.valorTotal) * (pct / 100)
        await prisma.comissao.create({
          data: {
            agendamentoId,
            profissionalId: agendamento.profissionalId,
            valorBase: agendamento.valorTotal,
            percentual: pct,
            valorComissao,
          },
        })
      }
    }
  }

  return NextResponse.json(atualizado)
}

async function atualizarCamposDenormalizados(clienteId: string, profissionalId: string) {
  const agendamentosCliente = await prisma.agendamento.findMany({
    where: { clienteId, status: "CONCLUIDO" },
    select: { valorTotal: true, dataHoraInicio: true },
    orderBy: { dataHoraInicio: "desc" },
  })

  const totalVisitas = agendamentosCliente.length
  const totalGasto = agendamentosCliente.reduce((sum, a) => sum + Number(a.valorTotal), 0)
  const ticketMedio = totalVisitas > 0 ? totalGasto / totalVisitas : 0
  const ultimaVisita = agendamentosCliente.length > 0 ? agendamentosCliente[0].dataHoraInicio : null
  const diasDesdeUltimaVisita = diasDesdeVisita(ultimaVisita)
  const { riscoChurn, scoreChurn } = calcularRisco(diasDesdeUltimaVisita)

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { totalVisitas, totalGasto, ticketMedio, ultimaVisita, diasDesdeUltimaVisita, riscoChurn, scoreChurn },
  })

  const agendamentosProf = await prisma.agendamento.findMany({
    where: { profissionalId, status: "CONCLUIDO" },
    select: { valorTotal: true },
  })

  await prisma.profissional.update({
    where: { id: profissionalId },
    data: {
      totalAtendimentos: agendamentosProf.length,
      receitaTotal: agendamentosProf.reduce((sum, a) => sum + Number(a.valorTotal), 0),
    },
  })
}
