import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const profissional = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    include: {
      servicos: { include: { servico: { select: { nome: true, preco: true, categoria: true } } }, where: { ativo: true } },
      comissoes: { orderBy: { criadoEm: "desc" }, take: 20, select: { id: true, valorBase: true, percentual: true, valorComissao: true, pago: true, criadoEm: true } },
      agendamentos: { where: { status: "CONCLUIDO" }, select: { id: true, dataHoraInicio: true, valorTotal: true, cliente: { select: { nome: true } }, servicos: { include: { servico: { select: { nome: true } } } } }, orderBy: { dataHoraInicio: "desc" }, take: 10 },
    },
  })

  if (!profissional) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  const receitaTotal = Number(profissional.receitaTotal)
  const comissaoPadrao = Number(profissional.comissaoPadrao)
  const comissaoValor = Math.round(receitaTotal * (comissaoPadrao / 100))
  const ocupacao = Math.min(100, Math.round((profissional.totalAtendimentos / 35) * 100))
  const clientesUnicos = await prisma.agendamento.groupBy({ by: ["clienteId"], where: { profissionalId: params.id, status: "CONCLUIDO" } })
  const cancelamentos = await prisma.agendamento.count({ where: { profissionalId: params.id, status: "CANCELADO" } })
  const noShows = await prisma.agendamento.count({ where: { profissionalId: params.id, status: "NO_SHOW" } })
  const ticketMedio = profissional.totalAtendimentos > 0 ? Math.round(receitaTotal / profissional.totalAtendimentos) : 0
  const topServicos = profissional.servicos.map((ps) => ({ nome: ps.servico.nome, preco: Number(ps.precoCustomizado ?? ps.servico.preco), categoria: ps.servico.categoria }))

  return NextResponse.json({
    id: profissional.id, nome: profissional.nome, email: profissional.email, telefone: profissional.telefone,
    especialidade: profissional.especialidade, cor: profissional.cor, criadoEm: profissional.criadoEm,
    stats: { atendimentos: profissional.totalAtendimentos, receita: receitaTotal, ocupacao, ticketMedio, avaliacaoMedia: Number(profissional.avaliacaoMedia), comissaoPadrao, comissaoValor, clientesUnicos: clientesUnicos.length, cancelamentos, noShows },
    servicos: topServicos, ultimosAtendimentos: profissional.agendamentos, comissoes: profissional.comissoes,
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: auth.usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const { nome, email, telefone, especialidade, cor, comissaoPadrao } = body

  const updated = await prisma.profissional.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email: email || null }),
      ...(telefone !== undefined && { telefone: telefone || null }),
      ...(especialidade !== undefined && { especialidade: especialidade || null }),
      ...(cor !== undefined && { cor }),
      ...(comissaoPadrao !== undefined && { comissaoPadrao: Number(comissaoPadrao) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: auth.usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  await prisma.profissional.update({
    where: { id: params.id },
    data: { ativo: false },
  })

  return NextResponse.json({ ok: true })
}
