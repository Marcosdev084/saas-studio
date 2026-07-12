import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const estabelecimentoId = searchParams.get("estabelecimentoId")

  const usuarios = await prisma.usuario.findMany({
    where: estabelecimentoId ? { estabelecimentoId } : undefined,
    include: {
      estabelecimento: { select: { nome: true } },
    },
    orderBy: { criadoEm: "desc" },
  })

  return NextResponse.json(usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    permissao: u.permissao,
    ativo: u.ativo,
    criadoEm: u.criadoEm,
    estabelecimento: u.estabelecimento.nome,
    estabelecimentoId: u.estabelecimentoId,
    auth0Vinculado: !u.auth0Id.startsWith("pending_"),
  })))
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { estabelecimentoId, nome, email, telefone, permissao } = body

  if (!estabelecimentoId || !nome || !email) {
    return NextResponse.json({ error: "Estabelecimento, nome e e-mail são obrigatórios" }, { status: 400 })
  }

  const existente = await prisma.usuario.findFirst({ where: { email } })
  if (existente) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail" }, { status: 409 })
  }

  const usuario = await prisma.usuario.create({
    data: {
      estabelecimentoId,
      auth0Id: `pending_${Date.now()}`,
      nome,
      email,
      telefone: telefone || null,
      permissao: permissao || "PROFISSIONAL",
    },
  })

  return NextResponse.json(usuario, { status: 201 })
}
