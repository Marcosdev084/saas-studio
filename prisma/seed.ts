import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed...")

  // ── ESTABELECIMENTO ──────────────────────────────────────────
  const estab = await prisma.estabelecimento.create({
    data: {
      nome: "Studio Beleza & Cia",
      cnpj: "12.345.678/0001-99",
      telefone: "(84) 3333-4444",
      email: "contato@studiobeleza.com",
      endereco: "Rua das Flores, 123",
      cidade: "Natal",
      estado: "RN",
      cep: "59000-000",
      tipoNegocio: "SALAO_BELEZA",
    },
  })
  console.log("✅ Estabelecimento criado:", estab.nome)

  // ── ASSINATURA ───────────────────────────────────────────────
  await prisma.assinatura.create({
    data: {
      estabelecimentoId: estab.id,
      plano: "PRO",
      status: "ATIVA",
      valorMensal: 197,
      dataRenovacao: new Date("2026-07-01"),
    },
  })
  console.log("✅ Assinatura Pro ativada")

  // ── USUÁRIO ADMIN ────────────────────────────────────────────
  const admin = await prisma.usuario.create({
    data: {
      estabelecimentoId: estab.id,
      auth0Id: "auth0|admin_placeholder",
      nome: "Dailton Lima",
      email: "dailton@studiobeleza.com",
      telefone: "(84) 99999-0000",
      permissao: "ADMIN",
    },
  })
  console.log("✅ Usuário admin criado:", admin.nome)

  // ── PROFISSIONAIS ────────────────────────────────────────────
  const ana = await prisma.profissional.create({
    data: {
      estabelecimentoId: estab.id,
      nome: "Ana Costa",
      email: "ana@studiobeleza.com",
      telefone: "(84) 99887-1234",
      especialidade: "Cabeleireira Senior",
      cor: "#105a73",
      comissaoPadrao: 40,
      totalAtendimentos: 28,
      receitaTotal: 8400,
      avaliacaoMedia: 4.9,
    },
  })

  const carlos = await prisma.profissional.create({
    data: {
      estabelecimentoId: estab.id,
      nome: "Carlos Mendes",
      email: "carlos@studiobeleza.com",
      telefone: "(84) 99765-4321",
      especialidade: "Barbeiro",
      cor: "#F59E0B",
      comissaoPadrao: 35,
      totalAtendimentos: 22,
      receitaTotal: 5200,
      avaliacaoMedia: 4.7,
    },
  })

  const beatriz = await prisma.profissional.create({
    data: {
      estabelecimentoId: estab.id,
      nome: "Beatriz Lima",
      email: "beatriz@studiobeleza.com",
      telefone: "(84) 99654-8765",
      especialidade: "Manicure / Pedicure",
      cor: "#EC4899",
      comissaoPadrao: 35,
      totalAtendimentos: 18,
      receitaTotal: 3800,
      avaliacaoMedia: 4.8,
    },
  })
  console.log("✅ 3 profissionais criados")

  // ── SERVIÇOS ─────────────────────────────────────────────────
  const servicos = await Promise.all([
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Corte + Escova", categoria: "Cabelo", duracaoMinutos: 60, preco: 130 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Coloração", categoria: "Cabelo", duracaoMinutos: 120, preco: 180 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Tratamento Capilar", categoria: "Cabelo", duracaoMinutos: 90, preco: 150 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Corte Masculino", categoria: "Barbearia", duracaoMinutos: 45, preco: 70 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Barba", categoria: "Barbearia", duracaoMinutos: 30, preco: 50 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Corte + Barba", categoria: "Barbearia", duracaoMinutos: 60, preco: 110 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Manicure + Pedicure", categoria: "Unhas", duracaoMinutos: 120, preco: 120 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Unhas em Gel", categoria: "Unhas", duracaoMinutos: 120, preco: 250 } }),
    prisma.servico.create({ data: { estabelecimentoId: estab.id, nome: "Manicure", categoria: "Unhas", duracaoMinutos: 60, preco: 60 } }),
  ])
  console.log("✅ 9 serviços criados")

  // ── VÍNCULO PROFISSIONAL → SERVIÇO ───────────────────────────
  const [corteEscova, coloracao, tratamento, corteMasc, barba, corteBarba, maniPedi, gel, mani] = servicos

  await Promise.all([
    prisma.profissionalServico.create({ data: { profissionalId: ana.id, servicoId: corteEscova.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: ana.id, servicoId: coloracao.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: ana.id, servicoId: tratamento.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: carlos.id, servicoId: corteMasc.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: carlos.id, servicoId: barba.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: carlos.id, servicoId: corteBarba.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: beatriz.id, servicoId: maniPedi.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: beatriz.id, servicoId: gel.id } }),
    prisma.profissionalServico.create({ data: { profissionalId: beatriz.id, servicoId: mani.id } }),
  ])
  console.log("✅ Vínculos profissional-serviço criados")

  // ── CLIENTES ─────────────────────────────────────────────────
  const clientesData = [
    { nome: "Carla Souza", email: "carla.souza@email.com", telefone: "(84) 99876-5432", totalVisitas: 14, ticketMedio: 165, totalGasto: 2310, riscoChurn: "ALTO" as const, scoreChurn: 92, ultimaVisita: new Date("2026-05-15"), diasDesdeUltimaVisita: 38 },
    { nome: "Maria Silva", email: "maria.silva@email.com", telefone: "(84) 99812-3456", totalVisitas: 22, ticketMedio: 140, totalGasto: 3080, riscoChurn: "BAIXO" as const, scoreChurn: 15, ultimaVisita: new Date("2026-06-22"), diasDesdeUltimaVisita: 0 },
    { nome: "João Mendes", email: "joao.mendes@email.com", telefone: "(84) 99811-1111", totalVisitas: 8, ticketMedio: 85, totalGasto: 680, riscoChurn: "BAIXO" as const, scoreChurn: 20, ultimaVisita: new Date("2026-06-20"), diasDesdeUltimaVisita: 2 },
    { nome: "Fernanda Costa", email: "fernanda.costa@email.com", telefone: "(84) 99822-2222", totalVisitas: 11, ticketMedio: 190, totalGasto: 2090, riscoChurn: "MEDIO" as const, scoreChurn: 65, ultimaVisita: new Date("2026-06-10"), diasDesdeUltimaVisita: 12 },
    { nome: "Pedro Lima", email: "pedro.lima@email.com", telefone: "(84) 99833-3333", totalVisitas: 6, ticketMedio: 70, totalGasto: 420, riscoChurn: "BAIXO" as const, scoreChurn: 25, ultimaVisita: new Date("2026-06-18"), diasDesdeUltimaVisita: 4 },
    { nome: "Lucia Alves", email: "lucia.alves@email.com", telefone: "(84) 99844-4444", totalVisitas: 9, ticketMedio: 120, totalGasto: 1080, riscoChurn: "MEDIO" as const, scoreChurn: 71, ultimaVisita: new Date("2026-06-05"), diasDesdeUltimaVisita: 17 },
    { nome: "Roberto Almeida", email: "roberto.almeida@email.com", telefone: "(84) 99855-5555", totalVisitas: 5, ticketMedio: 85, totalGasto: 425, riscoChurn: "MEDIO" as const, scoreChurn: 78, ultimaVisita: new Date("2026-05-28"), diasDesdeUltimaVisita: 25 },
    { nome: "Rita Oliveira", email: "rita.oliveira@email.com", telefone: "(84) 99866-6666", totalVisitas: 3, ticketMedio: 130, totalGasto: 390, riscoChurn: "BAIXO" as const, scoreChurn: 30, ultimaVisita: new Date("2026-06-15"), diasDesdeUltimaVisita: 7 },
  ]

  const clientes = await Promise.all(
    clientesData.map((c) =>
      prisma.cliente.create({
        data: { estabelecimentoId: estab.id, ...c },
      })
    )
  )
  console.log(`✅ ${clientes.length} clientes criados`)

  // ── PREFERÊNCIAS DA CARLA ────────────────────────────────────
  const carla = clientes[0]
  await Promise.all([
    prisma.preferenciaCliente.create({ data: { clienteId: carla.id, descricao: "Prefere franja mais curta, na altura da sobrancelha" } }),
    prisma.preferenciaCliente.create({ data: { clienteId: carla.id, descricao: "Produto X irritou a pele — nunca mais usar" } }),
    prisma.preferenciaCliente.create({ data: { clienteId: carla.id, descricao: "Gosta de música ambiente baixa durante o atendimento" } }),
    prisma.preferenciaCliente.create({ data: { clienteId: carla.id, descricao: "Sempre pede café com leite ao chegar" } }),
    prisma.preferenciaCliente.create({ data: { clienteId: carla.id, descricao: "Prefere tintura tom 7.1 (loiro acinzentado)" } }),
  ])
  console.log("✅ Preferências da Carla criadas")

  // ── FIDELIDADE ───────────────────────────────────────────────
  await Promise.all([
    prisma.fidelidade.create({ data: { clienteId: carla.id, pontos: 280, nivel: "OURO" } }),
    prisma.fidelidade.create({ data: { clienteId: clientes[1].id, pontos: 440, nivel: "PLATINA" } }),
    ...clientes.slice(2).map((c) =>
      prisma.fidelidade.create({ data: { clienteId: c.id, pontos: Math.floor(Math.random() * 200), nivel: "PRATA" } })
    ),
  ])
  console.log("✅ Fidelidade configurada")

  // ── CONFIG FIDELIDADE ────────────────────────────────────────
  await Promise.all([
    prisma.configFidelidade.create({ data: { estabelecimentoId: estab.id, nivel: "PRATA", pontosMinimos: 0, descricaoBeneficio: "5% de desconto", percentualDesconto: 5 } }),
    prisma.configFidelidade.create({ data: { estabelecimentoId: estab.id, nivel: "OURO", pontosMinimos: 200, descricaoBeneficio: "10% de desconto + escova grátis", percentualDesconto: 10 } }),
    prisma.configFidelidade.create({ data: { estabelecimentoId: estab.id, nivel: "PLATINA", pontosMinimos: 500, descricaoBeneficio: "15% de desconto + tratamento grátis", percentualDesconto: 15 } }),
  ])
  console.log("✅ Níveis de fidelidade configurados")

  // ── HORÁRIOS DE FUNCIONAMENTO ────────────────────────────────
  const horarios = [
    { dia: 1, abre: "08:00", fecha: "18:00" },
    { dia: 2, abre: "08:00", fecha: "18:00" },
    { dia: 3, abre: "08:00", fecha: "18:00" },
    { dia: 4, abre: "08:00", fecha: "18:00" },
    { dia: 5, abre: "08:00", fecha: "20:00" },
    { dia: 6, abre: "08:00", fecha: "16:00" },
  ]
  await Promise.all(
    horarios.map((h) =>
      prisma.configHorario.create({
        data: {
          estabelecimentoId: estab.id,
          diaSemana: h.dia,
          horaAbertura: h.abre,
          horaFechamento: h.fecha,
        },
      })
    )
  )
  console.log("✅ Horários de funcionamento configurados")

  // ── SUGESTÕES DA IA ──────────────────────────────────────────
  await Promise.all([
    prisma.sugestaoIA.create({
      data: {
        estabelecimentoId: estab.id,
        tipo: "RETENCAO",
        prioridade: "ALTA",
        titulo: "Carla Souza não vem há 38 dias",
        descricao: "Frequência habitual: 25 dias. Último serviço: Coloração (R$ 180). Risco de perda alto.",
        acaoSugerida: "Enviar mensagem personalizada",
      },
    }),
    prisma.sugestaoIA.create({
      data: {
        estabelecimentoId: estab.id,
        tipo: "OPORTUNIDADE",
        prioridade: "MEDIA",
        titulo: "2 horários vagos amanhã (14h e 15:30h)",
        descricao: "3 clientes costumam agendar nesse período. Posso avisá-los automaticamente.",
        acaoSugerida: "Notificar clientes",
      },
    }),
    prisma.sugestaoIA.create({
      data: {
        estabelecimentoId: estab.id,
        tipo: "INSIGHT",
        prioridade: "BAIXA",
        titulo: "Ana gerou 42% mais receita essa semana",
        descricao: "Motivo: 3 procedimentos de coloração premium. Priorize esses serviços na agenda dela.",
        acaoSugerida: "Ver detalhes",
      },
    }),
  ])
  console.log("✅ Sugestões da IA criadas")

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log(`   Estabelecimento: ${estab.nome}`)
  console.log(`   Profissionais: 3`)
  console.log(`   Serviços: 9`)
  console.log(`   Clientes: ${clientes.length}`)
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
