import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalSession } from "@/lib/portal-auth"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const estabelecimentoId = searchParams.get("estabelecimentoId")
  const profissionalId = searchParams.get("profissionalId")
  const data = searchParams.get("data")
  const step = searchParams.get("step")

  if (!estabelecimentoId) {
    return NextResponse.json({ error: "Estabelecimento obrigatório" }, { status: 400 })
  }

  if (step === "profissionais") {
    const profissionais = await prisma.profissional.findMany({
      where: { estabelecimentoId, ativo: true },
      select: { id: true, nome: true, especialidade: true, cor: true, avatarUrl: true, avaliacaoMedia: true },
      orderBy: { nome: "asc" },
    })
    return NextResponse.json(profissionais)
  }

  if (step === "servicos") {
    // Com profissional selecionado, retorna só os serviços que ele oferece,
    // com preço e duração efetivos (customizado do profissional ou o padrão do serviço).
    if (profissionalId) {
      const links = await prisma.profissionalServico.findMany({
        where: {
          profissionalId,
          ativo: true,
          servico: { estabelecimentoId, ativo: true },
        },
        include: { servico: { select: { id: true, nome: true, categoria: true, duracaoMinutos: true, preco: true } } },
      })

      const servicos = links
        .map((l) => ({
          id: l.servico.id,
          nome: l.servico.nome,
          categoria: l.servico.categoria,
          duracaoMinutos: l.duracaoCustomizada ?? l.servico.duracaoMinutos,
          preco: Number(l.precoCustomizado ?? l.servico.preco),
        }))
        .sort((a, b) => (a.categoria ?? "").localeCompare(b.categoria ?? "") || a.nome.localeCompare(b.nome))

      return NextResponse.json(servicos)
    }

    const servicos = await prisma.servico.findMany({
      where: { estabelecimentoId, ativo: true },
      select: { id: true, nome: true, categoria: true, duracaoMinutos: true, preco: true },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    })
    return NextResponse.json(servicos.map((s) => ({ ...s, preco: Number(s.preco) })))
  }

  if (step === "horarios" && profissionalId && data) {
    const dataSel = new Date(data + "T12:00:00")
    const diaSemana = dataSel.getDay()

    const horarioEstab = await prisma.configHorario.findFirst({
      where: { estabelecimentoId, profissionalId: null, diaSemana },
    })

    if (!horarioEstab || !horarioEstab.ativo) {
      return NextResponse.json({ aberto: false, horarios: [] })
    }

    const horarioProf = await prisma.configHorario.findFirst({
      where: { estabelecimentoId, profissionalId, diaSemana },
    })

    if (horarioProf && !horarioProf.ativo) {
      return NextResponse.json({ aberto: false, horarios: [] })
    }

    const abertura = horarioProf?.horaAbertura ?? horarioEstab.horaAbertura
    const fechamento = horarioProf?.horaFechamento ?? horarioEstab.horaFechamento

    const abMin = toMin(abertura)
    const feMin = toMin(fechamento)

    const inicioDay = new Date(data + "T00:00:00")
    const fimDay = new Date(data + "T23:59:59")

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        dataHoraInicio: { gte: inicioDay, lte: fimDay },
        status: { notIn: ["CANCELADO", "NO_SHOW"] },
      },
      select: { dataHoraInicio: true, dataHoraFim: true },
    })

    const ocupados = agendamentos.map((a) => ({
      inicio: a.dataHoraInicio.getHours() * 60 + a.dataHoraInicio.getMinutes(),
      fim: a.dataHoraFim.getHours() * 60 + a.dataHoraFim.getMinutes(),
    }))

    return NextResponse.json({ aberto: true, abertura, fechamento, ocupados, abMin, feMin })
  }

  return NextResponse.json({ error: "Step inválido" }, { status: 400 })
}

export async function POST(request: Request) {
  const session = await getPortalSession()
  if (!session) {
    return NextResponse.json({ error: "Faça login para agendar" }, { status: 401 })
  }

  const body = await request.json()
  const { estabelecimentoId, profissionalId, servicoIds, data, hora, observacoes } = body

  if (!estabelecimentoId || !profissionalId || !servicoIds?.length || !data || !hora) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const idsUnicos = Array.from(new Set<string>(servicoIds))
  const links = await prisma.profissionalServico.findMany({
    where: {
      profissionalId,
      ativo: true,
      servicoId: { in: idsUnicos },
      servico: { estabelecimentoId, ativo: true },
    },
    include: { servico: true },
  })

  if (links.length !== idsUnicos.length) {
    return NextResponse.json({ error: "Este profissional não oferece os serviços selecionados" }, { status: 400 })
  }

  // Preço e duração efetivos: customizado do profissional ou o padrão do serviço.
  const itensServico = links.map((l) => ({
    servicoId: l.servicoId,
    preco: Number(l.precoCustomizado ?? l.servico.preco),
    duracaoMinutos: l.duracaoCustomizada ?? l.servico.duracaoMinutos,
  }))

  const duracaoTotal = itensServico.reduce((sum, i) => sum + i.duracaoMinutos, 0)
  const valorTotal = itensServico.reduce((sum, i) => sum + i.preco, 0)

  const [h, m] = hora.split(":").map(Number)
  const inicio = new Date(`${data}T${hora}:00`)
  const fim = new Date(inicio.getTime() + duracaoTotal * 60000)

  let cliente = await prisma.cliente.findFirst({
    where: { estabelecimentoId, contaClienteId: session.contaClienteId, ativo: true },
  })

  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        estabelecimentoId,
        contaClienteId: session.contaClienteId,
        nome: session.nome,
        email: session.email,
      },
    })
    await prisma.fidelidade.create({
      data: { clienteId: cliente.id, pontos: 0, nivel: "PRATA" },
    })
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      estabelecimentoId,
      clienteId: cliente.id,
      profissionalId,
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      valorTotal,
      observacoes: observacoes?.trim() || null,
      status: "PENDENTE",
      servicos: {
        create: itensServico.map((i) => ({
          servicoId: i.servicoId,
          preco: i.preco,
          duracaoMinutos: i.duracaoMinutos,
        })),
      },
    },
  })

  return NextResponse.json({ id: agendamento.id }, { status: 201 })
}

function toMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}
