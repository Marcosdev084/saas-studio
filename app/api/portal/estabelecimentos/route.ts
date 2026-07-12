import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()

  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: {
      ativo: true,
      ...(q ? { nome: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: {
      id: true,
      nome: true,
      tipoNegocio: true,
      cidade: true,
      estado: true,
      telefone: true,
      _count: { select: { profissionais: { where: { ativo: true } } } },
    },
    orderBy: { nome: "asc" },
    take: 20,
  })

  return NextResponse.json(estabelecimentos)
}
