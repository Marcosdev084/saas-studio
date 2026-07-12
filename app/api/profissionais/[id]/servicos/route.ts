import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

// GET — lista todos os serviços ativos do estabelecimento com o vínculo (se houver) deste profissional
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: usuario.estabelecimentoId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  const servicos = await prisma.servico.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    orderBy: { nome: "asc" },
    include: { profissionais: { where: { profissionalId: params.id } } },
  })

  const result = servicos.map((s) => {
    const link = s.profissionais[0]
    return {
      servicoId: s.id,
      nome: s.nome,
      categoria: s.categoria,
      precoBase: Number(s.preco),
      duracaoBase: s.duracaoMinutos,
      vinculado: !!link && link.ativo,
      precoCustomizado: link?.precoCustomizado != null ? Number(link.precoCustomizado) : null,
      duracaoCustomizada: link?.duracaoCustomizada ?? null,
    }
  })

  return NextResponse.json({ servicos: result })
}

// PUT — define quais serviços este profissional oferece e com quais preços/durações
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const prof = await prisma.profissional.findFirst({
    where: { id: params.id, estabelecimentoId: estabId },
    select: { id: true },
  })
  if (!prof) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { servicos } = body as {
    servicos: { servicoId: string; vinculado: boolean; precoCustomizado: number | null; duracaoCustomizada: number | null }[]
  }
  if (!servicos || !Array.isArray(servicos)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  // Garante que só mexemos em serviços do próprio estabelecimento
  const ids = servicos.map((s) => s.servicoId)
  const validos = await prisma.servico.findMany({
    where: { id: { in: ids }, estabelecimentoId: estabId },
    select: { id: true },
  })
  const validSet = new Set(validos.map((v) => v.id))

  for (const item of servicos) {
    if (!validSet.has(item.servicoId)) continue

    if (item.vinculado) {
      const precoNum = Number(item.precoCustomizado)
      const preco = item.precoCustomizado != null && !isNaN(precoNum) && precoNum > 0 ? precoNum : null
      const durNum = Number(item.duracaoCustomizada)
      const duracao = item.duracaoCustomizada != null && !isNaN(durNum) && durNum > 0 ? Math.round(durNum) : null

      await prisma.profissionalServico.upsert({
        where: { profissionalId_servicoId: { profissionalId: params.id, servicoId: item.servicoId } },
        update: { ativo: true, precoCustomizado: preco, duracaoCustomizada: duracao },
        create: { profissionalId: params.id, servicoId: item.servicoId, ativo: true, precoCustomizado: preco, duracaoCustomizada: duracao },
      })
    } else {
      await prisma.profissionalServico.deleteMany({
        where: { profissionalId: params.id, servicoId: item.servicoId },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
