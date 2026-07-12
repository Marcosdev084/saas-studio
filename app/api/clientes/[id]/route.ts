import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    include: {
      preferencias: { orderBy: { criadoEm: "desc" } },
      fidelidade: true,
      agendamentos: {
        include: {
          profissional: { select: { nome: true } },
          servicos: { include: { servico: { select: { nome: true } } } },
        },
        orderBy: { dataHoraInicio: "desc" },
        take: 10,
      },
    },
  })

  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  const profissionalFavorito = await prisma.agendamento.groupBy({
    by: ["profissionalId"],
    where: { clienteId: params.id, status: "CONCLUIDO" },
    _count: { profissionalId: true },
    orderBy: { _count: { profissionalId: "desc" } },
    take: 1,
  })

  let favProfNome = "—"
  if (profissionalFavorito.length > 0) {
    const prof = await prisma.profissional.findUnique({
      where: { id: profissionalFavorito[0].profissionalId },
      select: { nome: true },
    })
    favProfNome = prof?.nome ?? "—"
  }

  const proximoNivel = await prisma.configFidelidade.findFirst({
    where: {
      estabelecimentoId: usuario.estabelecimentoId,
      pontosMinimos: { gt: cliente.fidelidade?.pontos ?? 0 },
    },
    orderBy: { pontosMinimos: "asc" },
  })

  return NextResponse.json({ ...cliente, favProfissional: favProfNome, proximoNivel })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await request.json()
  const { descricao } = body

  if (!descricao?.trim()) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 })
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  const preferencia = await prisma.preferenciaCliente.create({
    data: { clienteId: params.id, descricao: descricao.trim() },
  })

  return NextResponse.json(preferencia, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const prefId = searchParams.get("prefId")
  if (!prefId) return NextResponse.json({ error: "ID da preferência é obrigatório" }, { status: 400 })

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  await prisma.preferenciaCliente.deleteMany({
    where: { id: prefId, clienteId: params.id },
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await request.json()
  const { nome, email, telefone, observacoes, ativo, prefId, descricao } = body

  if (prefId && descricao !== undefined) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
      select: { id: true },
    })
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

    const updated = await prisma.preferenciaCliente.updateMany({
      where: { id: prefId, clienteId: params.id },
      data: { descricao: descricao.trim() },
    })
    return NextResponse.json({ updated: updated.count })
  }

  const cliente = await prisma.cliente.updateMany({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    data: {
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email }),
      ...(telefone !== undefined && { telefone }),
      ...(observacoes !== undefined && { observacoes }),
      ...(ativo !== undefined && { ativo }),
    },
  })

  return NextResponse.json({ updated: cliente.count })
}
