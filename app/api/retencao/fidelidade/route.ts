import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

const NIVEIS_VALIDOS = ["PRATA", "OURO", "PLATINA"] as const
type Nivel = (typeof NIVEIS_VALIDOS)[number]

// PUT — configura os níveis do programa de fidelidade do estabelecimento
export async function PUT(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { niveis } = body as {
    niveis: { nivel: Nivel; pontosMinimos: number; beneficio: string; desconto: number | null }[]
  }
  if (!niveis || !Array.isArray(niveis)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  for (const n of niveis) {
    if (!NIVEIS_VALIDOS.includes(n.nivel)) continue
    const pontos = Math.max(0, Math.round(Number(n.pontosMinimos) || 0))
    const descNum = Number(n.desconto)
    const desconto = n.desconto != null && !isNaN(descNum) && descNum >= 0 ? descNum : null
    const beneficio = (n.beneficio ?? "").trim() || "—"

    await prisma.configFidelidade.upsert({
      where: { estabelecimentoId_nivel: { estabelecimentoId: estabId, nivel: n.nivel } },
      update: { pontosMinimos: pontos, descricaoBeneficio: beneficio, percentualDesconto: desconto, ativo: true },
      create: { estabelecimentoId: estabId, nivel: n.nivel, pontosMinimos: pontos, descricaoBeneficio: beneficio, percentualDesconto: desconto, ativo: true },
    })
  }

  return NextResponse.json({ ok: true })
}
