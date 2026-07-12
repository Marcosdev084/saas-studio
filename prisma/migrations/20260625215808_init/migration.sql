-- CreateEnum
CREATE TYPE "TipoNegocio" AS ENUM ('SALAO_BELEZA', 'BARBEARIA', 'CLINICA_ESTETICA', 'CLINICA_ODONTO', 'ESPACO_BELEZA', 'OUTRO');

-- CreateEnum
CREATE TYPE "PlanoAssinatura" AS ENUM ('STARTER', 'PRO', 'STUDIO', 'CLINICA');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVA', 'CANCELADA', 'INADIMPLENTE', 'TRIAL');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'ATENDENDO', 'CONCLUIDO', 'CANCELADO', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'VOUCHER');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "NivelPermissao" AS ENUM ('ADMIN', 'GERENTE', 'PROFISSIONAL', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "TipoSugestaoIA" AS ENUM ('RETENCAO', 'OPORTUNIDADE', 'INSIGHT', 'ALERTA');

-- CreateEnum
CREATE TYPE "StatusSugestaoIA" AS ENUM ('PENDENTE', 'EXECUTADA', 'IGNORADA');

-- CreateEnum
CREATE TYPE "PrioridadeSugestao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "RiscoChurn" AS ENUM ('ALTO', 'MEDIO', 'BAIXO');

-- CreateEnum
CREATE TYPE "NivelFidelidade" AS ENUM ('PRATA', 'OURO', 'PLATINA');

-- CreateEnum
CREATE TYPE "StatusCampanha" AS ENUM ('RASCUNHO', 'ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CanalCampanha" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA', 'COMISSAO', 'ESTORNO');

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "tipoNegocio" "TipoNegocio" NOT NULL DEFAULT 'SALAO_BELEZA',
    "logoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "plano" "PlanoAssinatura" NOT NULL DEFAULT 'STARTER',
    "status" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
    "valorMensal" DECIMAL(10,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRenovacao" TIMESTAMP(3),
    "dataCancelamento" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "auth0Id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "avatarUrl" TEXT,
    "permissao" "NivelPermissao" NOT NULL DEFAULT 'PROFISSIONAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "especialidade" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "cor" TEXT DEFAULT '#0D9488',
    "comissaoPadrao" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "totalAtendimentos" INTEGER NOT NULL DEFAULT 0,
    "receitaTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avaliacaoMedia" DECIMAL(3,2) NOT NULL DEFAULT 0,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissional_servicos" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "precoCustomizado" DECIMAL(10,2),
    "duracaoCustomizada" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profissional_servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "totalVisitas" INTEGER NOT NULL DEFAULT 0,
    "ticketMedio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalGasto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ultimaVisita" TIMESTAMP(3),
    "diasDesdeUltimaVisita" INTEGER,
    "riscoChurn" "RiscoChurn" NOT NULL DEFAULT 'BAIXO',
    "scoreChurn" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferencias_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_servicos" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,

    CONSTRAINT "agendamento_servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipoPagamento" "TipoPagamento" NOT NULL DEFAULT 'PIX',
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "pagamentoId" TEXT,
    "tipo" "TipoTransacao" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "dataTransacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "valorBase" DECIMAL(10,2) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valorComissao" DECIMAL(10,2) NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fidelidade" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "nivel" "NivelFidelidade" NOT NULL DEFAULT 'PRATA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fidelidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_fidelidade" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nivel" "NivelFidelidade" NOT NULL,
    "pontosMinimos" INTEGER NOT NULL,
    "descricaoBeneficio" TEXT NOT NULL,
    "percentualDesconto" DECIMAL(5,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "config_fidelidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusCampanha" NOT NULL DEFAULT 'RASCUNHO',
    "canal" "CanalCampanha" NOT NULL DEFAULT 'WHATSAPP',
    "mensagem" TEXT NOT NULL,
    "dataEnvio" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "totalEnviados" INTEGER NOT NULL DEFAULT 0,
    "totalAbertos" INTEGER NOT NULL DEFAULT 0,
    "totalConvertidos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanha_clientes" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "aberto" BOOLEAN NOT NULL DEFAULT false,
    "convertido" BOOLEAN NOT NULL DEFAULT false,
    "enviadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campanha_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugestoes_ia" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "tipo" "TipoSugestaoIA" NOT NULL,
    "prioridade" "PrioridadeSugestao" NOT NULL DEFAULT 'MEDIA',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "acaoSugerida" TEXT NOT NULL,
    "status" "StatusSugestaoIA" NOT NULL DEFAULT 'PENDENTE',
    "metadados" JSONB,
    "expiradoEm" TIMESTAMP(3),
    "executadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sugestoes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_horarios" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "diaSemana" INTEGER NOT NULL,
    "horaAbertura" TEXT NOT NULL,
    "horaFechamento" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "config_horarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_cnpj_key" ON "estabelecimentos"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_email_key" ON "estabelecimentos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_estabelecimentoId_key" ON "assinaturas"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_auth0Id_key" ON "usuarios"("auth0Id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_estabelecimentoId_idx" ON "usuarios"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_usuarioId_key" ON "profissionais"("usuarioId");

-- CreateIndex
CREATE INDEX "profissionais_estabelecimentoId_idx" ON "profissionais"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "servicos_estabelecimentoId_idx" ON "servicos"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "profissional_servicos_profissionalId_servicoId_key" ON "profissional_servicos"("profissionalId", "servicoId");

-- CreateIndex
CREATE INDEX "clientes_estabelecimentoId_idx" ON "clientes"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "clientes_riscoChurn_idx" ON "clientes"("riscoChurn");

-- CreateIndex
CREATE INDEX "preferencias_cliente_clienteId_idx" ON "preferencias_cliente"("clienteId");

-- CreateIndex
CREATE INDEX "agendamentos_estabelecimentoId_idx" ON "agendamentos"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "agendamentos_profissionalId_idx" ON "agendamentos"("profissionalId");

-- CreateIndex
CREATE INDEX "agendamentos_clienteId_idx" ON "agendamentos"("clienteId");

-- CreateIndex
CREATE INDEX "agendamentos_dataHoraInicio_idx" ON "agendamentos"("dataHoraInicio");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_agendamentoId_key" ON "pagamentos"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_pagamentoId_key" ON "transacoes"("pagamentoId");

-- CreateIndex
CREATE INDEX "transacoes_estabelecimentoId_idx" ON "transacoes"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "transacoes_dataTransacao_idx" ON "transacoes"("dataTransacao");

-- CreateIndex
CREATE INDEX "transacoes_tipo_idx" ON "transacoes"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "comissoes_agendamentoId_key" ON "comissoes"("agendamentoId");

-- CreateIndex
CREATE INDEX "comissoes_profissionalId_idx" ON "comissoes"("profissionalId");

-- CreateIndex
CREATE INDEX "comissoes_pago_idx" ON "comissoes"("pago");

-- CreateIndex
CREATE UNIQUE INDEX "fidelidade_clienteId_key" ON "fidelidade"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "config_fidelidade_estabelecimentoId_nivel_key" ON "config_fidelidade"("estabelecimentoId", "nivel");

-- CreateIndex
CREATE INDEX "campanhas_estabelecimentoId_idx" ON "campanhas"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "campanha_clientes_campanhaId_clienteId_key" ON "campanha_clientes"("campanhaId", "clienteId");

-- CreateIndex
CREATE INDEX "sugestoes_ia_estabelecimentoId_idx" ON "sugestoes_ia"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "sugestoes_ia_status_idx" ON "sugestoes_ia"("status");

-- CreateIndex
CREATE INDEX "sugestoes_ia_tipo_idx" ON "sugestoes_ia"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "config_horarios_estabelecimentoId_profissionalId_diaSemana_key" ON "config_horarios"("estabelecimentoId", "profissionalId", "diaSemana");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_cliente" ADD CONSTRAINT "preferencias_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_servicos" ADD CONSTRAINT "agendamento_servicos_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_servicos" ADD CONSTRAINT "agendamento_servicos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fidelidade" ADD CONSTRAINT "fidelidade_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_fidelidade" ADD CONSTRAINT "config_fidelidade_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha_clientes" ADD CONSTRAINT "campanha_clientes_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha_clientes" ADD CONSTRAINT "campanha_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestoes_ia" ADD CONSTRAINT "sugestoes_ia_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_horarios" ADD CONSTRAINT "config_horarios_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_horarios" ADD CONSTRAINT "config_horarios_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
