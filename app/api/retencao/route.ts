import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { recalcularChurnEstabelecimento } from "@/lib/churn"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  // Mantém o risco de churn atualizado em relação à data atual (sem depender de job agendado)
  await recalcularChurnEstabelecimento(estabId)

  const clientesEmRisco = await prisma.cliente.findMany({
    where: { estabelecimentoId: estabId, riscoChurn: { in: ["CRITICO", "ALTO", "MEDIO"] }, ativo: true },
    select: { id: true, nome: true, telefone: true, riscoChurn: true, scoreChurn: true, ultimaVisita: true, diasDesdeUltimaVisita: true, ticketMedio: true, totalVisitas: true },
    orderBy: { scoreChurn: "desc" },
  })

  const clientesComDetalhes = await Promise.all(clientesEmRisco.map(async (c) => {
    const ult = await prisma.agendamento.findFirst({ where: { clienteId: c.id, status: "CONCLUIDO" }, orderBy: { dataHoraInicio: "desc" }, include: { profissional: { select: { nome: true } }, servicos: { include: { servico: { select: { nome: true } } } } } })
    return { ...c, ticketMedio: Number(c.ticketMedio), ultimoServico: ult?.servicos.map((s) => s.servico.nome).join(" + ") ?? "—", profissional: ult?.profissional.nome ?? "—" }
  }))

  const campanhasRaw = await prisma.campanha.findMany({ where: { estabelecimentoId: estabId }, orderBy: { criadoEm: "desc" }, take: 10, select: { id: true, nome: true, status: true, canal: true, dataEnvio: true, totalEnviados: true, totalAbertos: true, totalConvertidos: true, _count: { select: { clientes: true } } } })
  const campanhas = campanhasRaw.map((c) => ({ id: c.id, nome: c.nome, status: c.status, canal: c.canal, dataEnvio: c.dataEnvio, totalEnviados: c.totalEnviados, totalAbertos: c.totalAbertos, totalConvertidos: c.totalConvertidos, destinatarios: c._count.clientes }))

  const niveisFidelidade = await prisma.configFidelidade.findMany({ where: { estabelecimentoId: estabId, ativo: true }, orderBy: { pontosMinimos: "asc" } })
  const clientesPorNivel = await prisma.fidelidade.groupBy({ by: ["nivel"], where: { cliente: { estabelecimentoId: estabId } }, _count: { nivel: true } })
  const fidelidade = niveisFidelidade.map((n) => ({ nivel: n.nivel, pontosMinimos: n.pontosMinimos, beneficio: n.descricaoBeneficio, desconto: Number(n.percentualDesconto ?? 0), clientes: clientesPorNivel.find((c) => c.nivel === n.nivel)?._count.nivel ?? 0 }))

  const totalEmRisco = clientesEmRisco.length
  const avgRisk = totalEmRisco > 0 ? Math.round(clientesEmRisco.reduce((a, c) => a + c.scoreChurn, 0) / totalEmRisco) : 0
  const receitaEmRisco = clientesComDetalhes.reduce((a, c) => a + c.ticketMedio, 0)
  const taxaRetorno = campanhas.length > 0 ? Math.round((campanhas.reduce((a, c) => a + c.totalConvertidos, 0) / Math.max(1, campanhas.reduce((a, c) => a + c.totalEnviados, 0))) * 100) : 0

  return NextResponse.json({ stats: { totalEmRisco, avgRisk, receitaEmRisco, taxaRetorno }, clientesEmRisco: clientesComDetalhes, campanhas, fidelidade })
}
