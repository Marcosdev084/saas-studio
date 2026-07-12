import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"
import { requirePermissao } from "@/lib/auth"

export async function GET() {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const estabId = usuario.estabelecimentoId

  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { id: estabId },
    include: { assinatura: true, configHorarios: { where: { profissionalId: null }, orderBy: { diaSemana: "asc" } } },
  })
  if (!estabelecimento) return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 })

  const servicos = await prisma.servico.findMany({ where: { estabelecimentoId: estabId, ativo: true }, orderBy: { categoria: "asc" } })
  const usuarios = await prisma.usuario.findMany({ where: { estabelecimentoId: estabId, ativo: true }, select: { id: true, nome: true, email: true, permissao: true }, orderBy: { permissao: "asc" } })
  const profissionais = await prisma.profissional.findMany({ where: { estabelecimentoId: estabId, ativo: true }, select: { id: true, nome: true, email: true, especialidade: true, cor: true } })

  const equipe = [
    ...usuarios.map((u) => ({ id: u.id, nome: u.nome, email: u.email, role: u.permissao === "ADMIN" ? "Administrador" : u.permissao === "GERENTE" ? "Gerente" : "Recepcionista", tipo: "usuario" as const })),
    ...profissionais.filter((p) => !usuarios.some((u) => u.email === p.email)).map((p) => ({ id: p.id, nome: p.nome, email: p.email ?? "", role: "Profissional", tipo: "profissional" as const })),
  ]

  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const horarios = diasSemana.map((dia, i) => {
    const config = estabelecimento.configHorarios.find((h) => h.diaSemana === i)
    return { dia, diaSemana: i, ativo: !!config?.ativo, abertura: config?.horaAbertura ?? "—", fechamento: config?.horaFechamento ?? "—" }
  })

  return NextResponse.json({
    estabelecimento: { id: estabelecimento.id, nome: estabelecimento.nome, cnpj: estabelecimento.cnpj, telefone: estabelecimento.telefone, email: estabelecimento.email, endereco: estabelecimento.endereco, cidade: estabelecimento.cidade, estado: estabelecimento.estado, cep: estabelecimento.cep, tipoNegocio: estabelecimento.tipoNegocio },
    assinatura: estabelecimento.assinatura ? { plano: estabelecimento.assinatura.plano, status: estabelecimento.assinatura.status, valorMensal: Number(estabelecimento.assinatura.valorMensal), dataRenovacao: estabelecimento.assinatura.dataRenovacao } : null,
    servicos: servicos.map((s) => ({ id: s.id, nome: s.nome, categoria: s.categoria, duracaoMinutos: s.duracaoMinutos, preco: Number(s.preco) })),
    horarios, equipe,
  })
}

export async function PATCH(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (body.estabelecimento) {
    const { nome, cnpj, telefone, email, endereco, cidade, estado, cep } = body.estabelecimento
    await prisma.estabelecimento.update({
      where: { id: estabId },
      data: {
        ...(nome !== undefined && { nome }),
        ...(cnpj !== undefined && { cnpj: cnpj || null }),
        ...(telefone !== undefined && { telefone: telefone || null }),
        ...(email !== undefined && { email }),
        ...(endereco !== undefined && { endereco: endereco || null }),
        ...(cidade !== undefined && { cidade: cidade || null }),
        ...(estado !== undefined && { estado: estado || null }),
        ...(cep !== undefined && { cep: cep || null }),
      },
    })
    return NextResponse.json({ ok: true })
  }

  const { horarios } = body

  if (!horarios || !Array.isArray(horarios)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  for (const h of horarios) {
    const existing = await prisma.configHorario.findFirst({
      where: { estabelecimentoId: estabId, profissionalId: null, diaSemana: h.diaSemana },
    })

    if (h.ativo) {
      if (existing) {
        await prisma.configHorario.update({
          where: { id: existing.id },
          data: { ativo: true, horaAbertura: h.abertura, horaFechamento: h.fechamento },
        })
      } else {
        await prisma.configHorario.create({
          data: { estabelecimentoId: estabId, diaSemana: h.diaSemana, ativo: true, horaAbertura: h.abertura, horaFechamento: h.fechamento },
        })
      }
    } else {
      if (existing) {
        await prisma.configHorario.update({
          where: { id: existing.id },
          data: { ativo: false },
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
