import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profissionalId = searchParams.get("profissionalId")
  const mes = searchParams.get("mes") // YYYY-MM
  const status = searchParams.get("status") || "all" // pendente | pago | all

  const where: any = {
    profissional: { estabelecimentoId: usuario.estabelecimentoId },
  }

  if (profissionalId) {
    where.profissionalId = profissionalId
  }

  if (mes) {
    const [ano, mesNum] = mes.split("-").map(Number)
    const inicio = new Date(ano, mesNum - 1, 1)
    const fim = new Date(ano, mesNum, 1)
    where.agendamento = { dataHoraInicio: { gte: inicio, lt: fim } }
  }

  if (status === "pendente") {
    where.pago = false
  } else if (status === "pago") {
    where.pago = true
  }

  const comissoes = await prisma.comissao.findMany({
    where,
    include: {
      agendamento: {
        select: {
          dataHoraInicio: true,
          valorTotal: true,
          cliente: { select: { id: true, nome: true } },
          servicos: {
            select: {
              servico: { select: { id: true, nome: true } },
              preco: true,
            },
          },
        },
      },
      profissional: {
        select: {
          id: true,
          nome: true,
          modeloComissao: true,
          comissaoPadrao: true,
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  })

  // Agrupar por profissional
  const porProfissional: Record<string, any> = {}

  for (const c of comissoes) {
    const pid = c.profissionalId
    if (!porProfissional[pid]) {
      porProfissional[pid] = {
        profissional: c.profissional,
        comissoes: [],
        totalComissao: 0,
        totalPago: 0,
        totalPendente: 0,
      }
    }
    const grupo = porProfissional[pid]
    const valor = Number(c.valorComissao)
    grupo.comissoes.push({
      id: c.id,
      agendamentoId: c.agendamentoId,
      modelo: c.modelo,
      valorBase: Number(c.valorBase),
      percentual: Number(c.percentual),
      valorComissao: valor,
      pago: c.pago,
      pagoEm: c.pagoEm,
      criadoEm: c.criadoEm,
      dataAgendamento: c.agendamento.dataHoraInicio,
      clienteNome: c.agendamento.cliente.nome,
      servicos: c.agendamento.servicos.map((s: any) => ({
        nome: s.servico.nome,
        preco: Number(s.preco),
      })),
    })
    grupo.totalComissao += valor
    if (c.pago) {
      grupo.totalPago += valor
    } else {
      grupo.totalPendente += valor
    }
  }

  const resultado = Object.values(porProfissional)

  const totais = {
    totalGeral: resultado.reduce((a: number, g: any) => a + g.totalComissao, 0),
    totalPago: resultado.reduce((a: number, g: any) => a + g.totalPago, 0),
    totalPendente: resultado.reduce((a: number, g: any) => a + g.totalPendente, 0),
  }

  return NextResponse.json({ profissionais: resultado, totais })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const usuario = auth.usuario

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { ids } = body
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids é obrigatório e deve ser um array não vazio" }, { status: 400 })
  }

  // Garantir que as comissões pertencem ao estabelecimento
  const comissoes = await prisma.comissao.findMany({
    where: {
      id: { in: ids },
      profissional: { estabelecimentoId: usuario.estabelecimentoId },
    },
  })

  if (comissoes.length !== ids.length) {
    return NextResponse.json({ error: "Algumas comissões não foram encontradas" }, { status: 404 })
  }

  const atualizadas = await prisma.comissao.updateMany({
    where: {
      id: { in: ids },
      profissional: { estabelecimentoId: usuario.estabelecimentoId },
    },
    data: {
      pago: true,
      pagoEm: new Date(),
    },
  })

  return NextResponse.json({ atualizadas: atualizadas.count })
}
