import { prisma } from "@/lib/prisma"

export type RiscoChurn = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO"

// Dias corridos desde a última visita até hoje (null se o cliente nunca teve visita concluída)
export function diasDesdeVisita(ultimaVisita: Date | null): number | null {
  if (!ultimaVisita) return null
  return Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24))
}

// Fonte única de verdade para o cálculo de risco de churn a partir dos dias de ausência.
export function calcularRisco(diasDesde: number | null): { riscoChurn: RiscoChurn; scoreChurn: number } {
  if (diasDesde === null) return { riscoChurn: "BAIXO", scoreChurn: 0 }
  if (diasDesde > 90) return { riscoChurn: "CRITICO", scoreChurn: 90 }
  if (diasDesde > 60) return { riscoChurn: "ALTO", scoreChurn: 70 }
  if (diasDesde > 30) return { riscoChurn: "MEDIO", scoreChurn: 40 }
  return { riscoChurn: "BAIXO", scoreChurn: 10 }
}

// Recalcula, com base na data atual, os dias de ausência e o risco de todos os clientes
// do estabelecimento que já tiveram ao menos uma visita concluída. Persiste apenas o que mudou.
// Isso mantém a Retenção "viva" sem depender de um job agendado.
export async function recalcularChurnEstabelecimento(estabelecimentoId: string): Promise<void> {
  const clientes = await prisma.cliente.findMany({
    where: { estabelecimentoId, ativo: true, ultimaVisita: { not: null } },
    select: { id: true, ultimaVisita: true, diasDesdeUltimaVisita: true, riscoChurn: true, scoreChurn: true },
  })

  await Promise.all(
    clientes.map(async (c) => {
      const dias = diasDesdeVisita(c.ultimaVisita)
      const { riscoChurn, scoreChurn } = calcularRisco(dias)
      if (dias !== c.diasDesdeUltimaVisita || riscoChurn !== c.riscoChurn || scoreChurn !== c.scoreChurn) {
        await prisma.cliente.update({
          where: { id: c.id },
          data: { diasDesdeUltimaVisita: dias, riscoChurn, scoreChurn },
        })
      }
    })
  )
}
