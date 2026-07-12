import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUsuarioLogado } from "@/lib/session"

export async function GET(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profId = searchParams.get("profissional")

  // Filtrado por profissional: retorna apenas os serviços que ele oferece,
  // com preço e duração efetivos (customizado do profissional ou o padrão do serviço).
  if (profId) {
    const links = await prisma.profissionalServico.findMany({
      where: {
        profissionalId: profId,
        ativo: true,
        servico: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      },
      include: { servico: { select: { id: true, nome: true, categoria: true, duracaoMinutos: true, preco: true } } },
    })

    const servicos = links
      .map((l) => ({
        id: l.servico.id,
        nome: l.servico.nome,
        categoria: l.servico.categoria,
        duracaoMinutos: l.duracaoCustomizada ?? l.servico.duracaoMinutos,
        preco: Number(l.precoCustomizado ?? l.servico.preco),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    return NextResponse.json(servicos)
  }

  const servicos = await prisma.servico.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    select: { id: true, nome: true, categoria: true, duracaoMinutos: true, preco: true },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json(servicos.map((s) => ({ ...s, preco: Number(s.preco) })))
}

export async function POST(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await request.json()
  const { nome, categoria, duracaoMinutos, preco } = body

  if (!nome || !duracaoMinutos || !preco) {
    return NextResponse.json({ error: "Nome, duração e preço são obrigatórios" }, { status: 400 })
  }

  const duracao = parseInt(duracaoMinutos, 10)
  const valor = parseFloat(preco)
  if (isNaN(duracao) || duracao <= 0) return NextResponse.json({ error: "Duração inválida" }, { status: 400 })
  if (isNaN(valor) || valor <= 0) return NextResponse.json({ error: "Preço inválido" }, { status: 400 })

  const servico = await prisma.servico.create({
    data: {
      estabelecimentoId: usuario.estabelecimentoId,
      nome: nome.trim(),
      categoria: categoria?.trim() || null,
      duracaoMinutos: duracao,
      preco: valor,
    },
  })

  return NextResponse.json({ ...servico, preco: Number(servico.preco) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const body = await request.json()
  const servico = await prisma.servico.findFirst({ where: { id, estabelecimentoId: usuario.estabelecimentoId } })
  if (!servico) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

  const updated = await prisma.servico.update({
    where: { id },
    data: {
      ...(body.nome && { nome: body.nome.trim() }),
      ...(body.categoria !== undefined && { categoria: body.categoria?.trim() || null }),
      ...(body.duracaoMinutos && { duracaoMinutos: Number(body.duracaoMinutos) }),
      ...(body.preco && { preco: Number(body.preco) }),
    },
  })

  return NextResponse.json({ ...updated, preco: Number(updated.preco) })
}

export async function DELETE(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const servico = await prisma.servico.findFirst({ where: { id, estabelecimentoId: usuario.estabelecimentoId } })
  if (!servico) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

  await prisma.servico.update({ where: { id }, data: { ativo: false } })

  return NextResponse.json({ ok: true })
}
