import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const fornecedores = await prisma.fornecedor.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json(fornecedores)
}

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, cnpjCpf, telefone, email, observacoes } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  }

  const fornecedor = await prisma.fornecedor.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      nome: nome.trim(),
      cnpjCpf: cnpjCpf?.trim() || null,
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      observacoes: observacoes?.trim() || null,
    },
  })

  return NextResponse.json(fornecedor, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  const { nome, cnpjCpf, telefone, email, observacoes } = body

  const data: Record<string, unknown> = {}
  if (nome !== undefined) data.nome = nome.trim()
  if (cnpjCpf !== undefined) data.cnpjCpf = cnpjCpf?.trim() || null
  if (telefone !== undefined) data.telefone = telefone?.trim() || null
  if (email !== undefined) data.email = email?.trim() || null
  if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null

  const updated = await prisma.fornecedor.update({
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
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  })
  if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  await prisma.fornecedor.update({
    where: { id },
    data: { ativo: false },
  })

  return NextResponse.json({ ok: true })
}
