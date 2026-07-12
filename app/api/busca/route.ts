import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json([], { status: 200 })
  const estabId = usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  const [clientes, servicos] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        estabelecimentoId: estabId,
        ativo: true,
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { telefone: { contains: q } },
        ],
      },
      select: { id: true, nome: true, email: true, telefone: true },
      take: 8,
    }),
    prisma.servico.findMany({
      where: {
        estabelecimentoId: estabId,
        ativo: true,
        nome: { contains: q, mode: "insensitive" },
      },
      select: { id: true, nome: true, categoria: true, preco: true },
      take: 5,
    }),
  ])

  const results = [
    ...clientes.map((c) => ({
      type: "cliente" as const,
      id: c.id,
      nome: c.nome,
      extra: c.email ?? c.telefone ?? undefined,
    })),
    ...servicos.map((s) => ({
      type: "servico" as const,
      id: s.id,
      nome: s.nome,
      extra: `${s.categoria ?? "Serviço"} • R$ ${Number(s.preco).toFixed(0)}`,
    })),
  ]

  return NextResponse.json(results)
}
