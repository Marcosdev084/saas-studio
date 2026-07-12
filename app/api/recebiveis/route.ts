import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

const ORIGEM_LABEL: Record<string, string> = {
  CARTAO: "Cartão de crédito", FIADO: "Fiado", PACOTE: "Pacote", ASSINATURA: "Assinatura", OUTRO: "Outro",
}

// GET — contas a receber (recebíveis futuros: cartão D+30, fiado, etc.)
export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const contas = await prisma.contaReceber.findMany({
    where: { estabelecimentoId: estabId, status: { in: ["PENDENTE", "VENCIDO"] } },
    orderBy: { dataPrevista: "asc" },
    include: { cliente: { select: { nome: true } } },
  })

  const agora = Date.now()
  const lista = contas.map((c) => {
    const prevista = new Date(c.dataPrevista)
    const vencido = prevista.getTime() < agora
    return {
      id: c.id,
      descricao: c.descricao,
      cliente: c.cliente?.nome ?? null,
      valor: Number(c.valor),
      valorLiquido: Number(c.valorLiquido),
      dataPrevista: c.dataPrevista,
      origem: c.origem,
      origemLabel: ORIGEM_LABEL[c.origem] ?? c.origem,
      vencido,
    }
  })

  const totalPendente = lista.reduce((s, c) => s + c.valorLiquido, 0)
  const totalVencido = lista.filter((c) => c.vencido).reduce((s, c) => s + c.valorLiquido, 0)

  return NextResponse.json({
    recebiveis: lista,
    stats: { totalPendente, totalVencido, quantidade: lista.length },
  })
}

// PATCH — marca um recebível como recebido
export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { id } = body
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const conta = await prisma.contaReceber.findFirst({ where: { id, estabelecimentoId: estabId } })
  if (!conta) return NextResponse.json({ error: "Recebível não encontrado" }, { status: 404 })

  await prisma.contaReceber.update({ where: { id }, data: { status: "RECEBIDO", recebidoEm: new Date() } })

  // Se houver pagamento vinculado ainda pendente, marca como pago
  if (conta.pagamentoId) {
    await prisma.pagamento.updateMany({
      where: { id: conta.pagamentoId, status: "PENDENTE" },
      data: { status: "PAGO", pagoEm: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
