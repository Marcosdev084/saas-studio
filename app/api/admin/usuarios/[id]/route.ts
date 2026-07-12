import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, email, telefone, permissao, ativo } = body

  const usuario = await prisma.usuario.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email }),
      ...(telefone !== undefined && { telefone }),
      ...(permissao !== undefined && { permissao }),
      ...(ativo !== undefined && { ativo }),
    },
  })

  return NextResponse.json(usuario)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const usuario = await prisma.usuario.update({
    where: { id: params.id },
    data: { ativo: false },
  })
  return NextResponse.json({ message: "Usuário desativado", id: usuario.id })
}
