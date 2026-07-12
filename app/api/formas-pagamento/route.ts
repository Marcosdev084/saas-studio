import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

const PADROES = [
  { nome: "Dinheiro", tipo: "DINHEIRO" as const, taxaPercentual: 0, diasRecebimento: 0 },
  { nome: "Pix", tipo: "PIX" as const, taxaPercentual: 0, diasRecebimento: 0 },
  { nome: "Cartão de débito", tipo: "DEBITO" as const, taxaPercentual: 2.0, diasRecebimento: 1 },
  { nome: "Cartão de crédito", tipo: "CREDITO" as const, taxaPercentual: 3.5, diasRecebimento: 30 },
]

// GET — lista as formas de pagamento (cria as padrão na primeira vez)
export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  let formas = await prisma.formaPagamento.findMany({
    where: { estabelecimentoId: estabId },
    orderBy: { criadoEm: "asc" },
  })

  if (formas.length === 0) {
    await prisma.formaPagamento.createMany({
      data: PADROES.map((p) => ({ ...p, estabelecimentoId: estabId })),
    })
    formas = await prisma.formaPagamento.findMany({
      where: { estabelecimentoId: estabId },
      orderBy: { criadoEm: "asc" },
    })
  }

  return NextResponse.json(formas.map((f) => ({
    id: f.id,
    nome: f.nome,
    tipo: f.tipo,
    taxaPercentual: Number(f.taxaPercentual),
    diasRecebimento: f.diasRecebimento,
    ativo: f.ativo,
  })))
}

// PUT — atualiza/cria as formas de pagamento em lote
export async function PUT(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { formas } = body as {
    formas: { id?: string; nome: string; tipo: string; taxaPercentual: number; diasRecebimento: number; ativo: boolean }[]
  }
  if (!formas || !Array.isArray(formas)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const tiposValidos = ["DINHEIRO", "PIX", "CREDITO", "DEBITO", "VOUCHER"]

  for (const f of formas) {
    if (!f.nome?.trim() || !tiposValidos.includes(f.tipo)) continue
    const taxa = Math.max(0, Number(f.taxaPercentual) || 0)
    const dias = Math.max(0, Math.round(Number(f.diasRecebimento) || 0))
    const dados = { nome: f.nome.trim(), tipo: f.tipo as any, taxaPercentual: taxa, diasRecebimento: dias, ativo: f.ativo !== false }

    if (f.id) {
      const existe = await prisma.formaPagamento.findFirst({ where: { id: f.id, estabelecimentoId: estabId }, select: { id: true } })
      if (existe) await prisma.formaPagamento.update({ where: { id: f.id }, data: dados })
    } else {
      await prisma.formaPagamento.create({ data: { ...dados, estabelecimentoId: estabId } })
    }
  }

  return NextResponse.json({ ok: true })
}
