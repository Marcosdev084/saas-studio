import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const profissionais = await prisma.profissional.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    select: { id: true, nome: true, email: true, telefone: true, especialidade: true, cor: true, comissaoPadrao: true, totalAtendimentos: true, receitaTotal: true, avaliacaoMedia: true },
    orderBy: { receitaTotal: "desc" },
  })

  const resultado = profissionais.map((p) => {
    const comissaoValor = Number(p.receitaTotal) * (Number(p.comissaoPadrao) / 100)
    const ocupacao = Math.min(100, Math.round((p.totalAtendimentos / 35) * 100))
    return { ...p, receitaTotal: Number(p.receitaTotal), comissaoPadrao: Number(p.comissaoPadrao), avaliacaoMedia: Number(p.avaliacaoMedia), comissaoValor: Math.round(comissaoValor), ocupacao }
  })

  const totalReceita = resultado.reduce((a, p) => a + p.receitaTotal, 0)
  const totalAtendimentos = resultado.reduce((a, p) => a + p.totalAtendimentos, 0)
  const totalComissoes = resultado.reduce((a, p) => a + p.comissaoValor, 0)
  const avgOcupacao = resultado.length > 0 ? Math.round(resultado.reduce((a, p) => a + p.ocupacao, 0) / resultado.length) : 0

  return NextResponse.json({ profissionais: resultado, totais: { receita: totalReceita, atendimentos: totalAtendimentos, comissoes: totalComissoes, ocupacaoMedia: avgOcupacao } })
}

export async function POST(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const { nome, email, telefone, especialidade, cor, comissaoPadrao } = body

  if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const profissional = await prisma.profissional.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      nome,
      email: email || null,
      telefone: telefone || null,
      especialidade: especialidade || null,
      cor: cor || "#105a73",
      comissaoPadrao: comissaoPadrao ? Number(comissaoPadrao) : 40,
    },
  })

  return NextResponse.json(profissional, { status: 201 })
}
