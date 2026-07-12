import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"
import { getUsuarioLogado } from "@/lib/session"

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, canal, mensagem, clienteIds } = body

  if (!nome?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: "Nome e mensagem são obrigatórios" }, { status: 400 })
  }

  const campanha = await prisma.campanha.create({
    data: {
      estabelecimentoId: auth.usuario.estabelecimentoId,
      nome: nome.trim(),
      canal: canal || "WHATSAPP",
      mensagem: mensagem.trim(),
      status: "RASCUNHO",
      ...(clienteIds?.length ? {
        clientes: {
          create: clienteIds.map((clienteId: string) => ({ clienteId })),
        },
      } : {}),
    },
  })

  return NextResponse.json(campanha, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 })

  const statusValidos = ["RASCUNHO", "ATIVA", "PAUSADA", "CONCLUIDA", "CANCELADA"]
  if (!statusValidos.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }

  const campanha = await prisma.campanha.findFirst({
    where: { id, estabelecimentoId: auth.usuario.estabelecimentoId },
  })
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

  let extra: { dataEnvio?: Date; totalEnviados?: number } = {}
  // Ao ativar pela primeira vez, registra o disparo aos destinatários
  if (status === "ATIVA" && !campanha.dataEnvio) {
    const now = new Date()
    await prisma.campanhaCliente.updateMany({
      where: { campanhaId: id, enviado: false },
      data: { enviado: true, enviadoEm: now },
    })
    const totalDestinatarios = await prisma.campanhaCliente.count({ where: { campanhaId: id } })
    extra = { dataEnvio: now, totalEnviados: totalDestinatarios }
  }

  const updated = await prisma.campanha.update({
    where: { id },
    data: { status, ...extra },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const campanha = await prisma.campanha.findFirst({
    where: { id, estabelecimentoId: auth.usuario.estabelecimentoId },
  })
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

  await prisma.campanhaCliente.deleteMany({ where: { campanhaId: id } })
  await prisma.campanha.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
