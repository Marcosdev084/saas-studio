-- AlterEnum
ALTER TYPE "RiscoChurn" ADD VALUE 'CRITICO';

-- CreateIndex
CREATE INDEX "agendamento_servicos_agendamentoId_idx" ON "agendamento_servicos"("agendamentoId");

-- CreateIndex
CREATE INDEX "agendamento_servicos_servicoId_idx" ON "agendamento_servicos"("servicoId");
