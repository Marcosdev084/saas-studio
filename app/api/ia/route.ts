import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const sugestoes = await prisma.sugestaoIA.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId },
    orderBy: [{ status: "asc" }, { prioridade: "asc" }, { criadoEm: "desc" }],
    take: 20,
  })

  const pendentes = sugestoes.filter((s) => s.status === "PENDENTE").length
  const executadas = sugestoes.filter((s) => s.status === "EXECUTADA").length

  return NextResponse.json({ sugestoes, pendentes, executadas })
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { id, status } = body

  const sugestao = await prisma.sugestaoIA.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!sugestao) return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 })

  const updated = await prisma.sugestaoIA.update({
    where: { id },
    data: { status, ...(status === "EXECUTADA" ? { executadoEm: new Date() } : {}) },
  })
  return NextResponse.json(updated)
}
