-- CreateEnum
CREATE TYPE "OrigemReceber" AS ENUM ('CARTAO', 'FIADO', 'PACOTE', 'ASSINATURA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusReceber" AS ENUM ('PENDENTE', 'RECEBIDO', 'VENCIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN "formaPagamentoId" TEXT,
ADD COLUMN "taxaValor" DECIMAL(10,2),
ADD COLUMN "valorLiquido" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPagamento" NOT NULL DEFAULT 'PIX',
    "taxaPercentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "diasRecebimento" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "pagamentoId" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valorLiquido" DECIMAL(10,2) NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "origem" "OrigemReceber" NOT NULL DEFAULT 'CARTAO',
    "status" "StatusReceber" NOT NULL DEFAULT 'PENDENTE',
    "recebidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formas_pagamento_estabelecimentoId_idx" ON "formas_pagamento"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "contas_receber_pagamentoId_key" ON "contas_receber"("pagamentoId");

-- CreateIndex
CREATE INDEX "contas_receber_estabelecimentoId_idx" ON "contas_receber"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "contas_receber_status_idx" ON "contas_receber"("status");

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
