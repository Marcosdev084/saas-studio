import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  const horarios = await prisma.configHorario.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId: params.id },
    orderBy: { diaSemana: "asc" },
  })

  const configEstab = await prisma.configHorario.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId: null },
    orderBy: { diaSemana: "asc" },
  })

  return NextResponse.json({ horarios, configEstab })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { dias } = body as {
    dias: { diaSemana: number; ativo: boolean; horaAbertura: string; horaFechamento: string }[]
  }

  if (!dias || !Array.isArray(dias)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const configEstab = await prisma.configHorario.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId: null },
  })

  for (const dia of dias) {
    const estab = configEstab.find((c) => c.diaSemana === dia.diaSemana)

    if (!estab || !estab.ativo) {
      dia.ativo = false
    }

    if (dia.ativo && estab) {
      if (dia.horaAbertura < estab.horaAbertura) dia.horaAbertura = estab.horaAbertura
      if (dia.horaFechamento > estab.horaFechamento) dia.horaFechamento = estab.horaFechamento
      if (dia.horaAbertura >= dia.horaFechamento) {
        dia.horaAbertura = estab.horaAbertura
        dia.horaFechamento = estab.horaFechamento
      }
    }

    await prisma.configHorario.upsert({
      where: {
        estabelecimentoId_profissionalId_diaSemana: {
          estabelecimentoId: usuario.estabelecimentoId,
          profissionalId: params.id,
          diaSemana: dia.diaSemana,
        },
      },
      update: {
        ativo: dia.ativo,
        horaAbertura: dia.horaAbertura,
        horaFechamento: dia.horaFechamento,
      },
      create: {
        estabelecimentoId: usuario.estabelecimentoId,
        profissionalId: params.id,
        diaSemana: dia.diaSemana,
        ativo: dia.ativo,
        horaAbertura: dia.horaAbertura,
        horaFechamento: dia.horaFechamento,
      },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  await prisma.configHorario.deleteMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, profissionalId: params.id },
  })

  return NextResponse.json({ ok: true })
}
