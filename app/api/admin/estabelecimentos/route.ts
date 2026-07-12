import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const estabelecimentos = await prisma.estabelecimento.findMany({
    include: {
      assinatura: { select: { plano: true, status: true, valorMensal: true, dataRenovacao: true } },
      _count: { select: { profissionais: true, clientes: true, usuarios: true } },
    },
    orderBy: { criadoEm: "desc" },
  })

  return NextResponse.json(estabelecimentos.map((e) => ({
    id: e.id,
    nome: e.nome,
    cnpj: e.cnpj,
    email: e.email,
    telefone: e.telefone,
    cidade: e.cidade,
    estado: e.estado,
    tipoNegocio: e.tipoNegocio,
    ativo: e.ativo,
    criadoEm: e.criadoEm,
    plano: e.assinatura?.plano ?? "SEM PLANO",
    statusPlano: e.assinatura?.status ?? "—",
    valorMensal: e.assinatura ? Number(e.assinatura.valorMensal) : 0,
    totalProfissionais: e._count.profissionais,
    totalClientes: e._count.clientes,
    totalUsuarios: e._count.usuarios,
  })))
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, cnpj, email, telefone, endereco, cidade, estado, cep, tipoNegocio, plano, valorMensal, adminNome, adminEmail } = body

  if (!nome || !email || !adminEmail || !adminNome) {
    return NextResponse.json({ error: "Nome, e-mail do estabelecimento, nome e e-mail do admin são obrigatórios" }, { status: 400 })
  }

  const existente = await prisma.estabelecimento.findFirst({
    where: { OR: [{ email }, ...(cnpj ? [{ cnpj }] : [])] },
  })
  if (existente) {
    return NextResponse.json({ error: "Já existe um estabelecimento com esse e-mail ou CNPJ" }, { status: 409 })
  }

  const userExistente = await prisma.usuario.findFirst({ where: { email: adminEmail } })
  if (userExistente) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail" }, { status: 409 })
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const estab = await tx.estabelecimento.create({
      data: {
        nome,
        cnpj: cnpj || null,
        email,
        telefone: telefone || null,
        endereco: endereco || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
        tipoNegocio: tipoNegocio || "SALAO_BELEZA",
      },
    })

    const planoMap: Record<string, number> = { STARTER: 97, PRO: 197, STUDIO: 397, CLINICA: 597 }
    await tx.assinatura.create({
      data: {
        estabelecimentoId: estab.id,
        plano: plano || "STARTER",
        status: "ATIVA",
        valorMensal: valorMensal ?? planoMap[plano] ?? 97,
        dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const usuario = await tx.usuario.create({
      data: {
        estabelecimentoId: estab.id,
        auth0Id: `pending_${Date.now()}`,
        nome: adminNome,
        email: adminEmail,
        permissao: "ADMIN",
      },
    })

    for (let dia = 1; dia <= 6; dia++) {
      await tx.configHorario.create({
        data: {
          estabelecimentoId: estab.id,
          diaSemana: dia,
          horaAbertura: "08:00",
          horaFechamento: dia === 5 ? "20:00" : dia === 6 ? "16:00" : "18:00",
        },
      })
    }

    await tx.configFidelidade.createMany({
      data: [
        { estabelecimentoId: estab.id, nivel: "PRATA", pontosMinimos: 0, descricaoBeneficio: "5% de desconto", percentualDesconto: 5 },
        { estabelecimentoId: estab.id, nivel: "OURO", pontosMinimos: 200, descricaoBeneficio: "10% de desconto + escova grátis", percentualDesconto: 10 },
        { estabelecimentoId: estab.id, nivel: "PLATINA", pontosMinimos: 500, descricaoBeneficio: "15% de desconto + tratamento grátis", percentualDesconto: 15 },
      ],
    })

    return { estabelecimento: estab, usuario }
  })

  return NextResponse.json(resultado, { status: 201 })
}
