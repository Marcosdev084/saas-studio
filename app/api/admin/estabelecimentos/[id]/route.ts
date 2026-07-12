import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const { nome, cnpj, email, telefone, endereco, cidade, estado, cep, tipoNegocio, ativo, plano, valorMensal, statusPlano } = body

  const estab = await prisma.estabelecimento.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(cnpj !== undefined && { cnpj }),
      ...(email !== undefined && { email }),
      ...(telefone !== undefined && { telefone }),
      ...(endereco !== undefined && { endereco }),
      ...(cidade !== undefined && { cidade }),
      ...(estado !== undefined && { estado }),
      ...(cep !== undefined && { cep }),
      ...(tipoNegocio !== undefined && { tipoNegocio }),
      ...(ativo !== undefined && { ativo }),
    },
  })

  if (plano || valorMensal || statusPlano) {
    await prisma.assinatura.upsert({
      where: { estabelecimentoId: params.id },
      update: {
        ...(plano && { plano }),
        ...(valorMensal && { valorMensal }),
        ...(statusPlano && { status: statusPlano }),
      },
      create: {
        estabelecimentoId: params.id,
        plano: plano || "STARTER",
        status: statusPlano || "ATIVA",
        valorMensal: valorMensal || 97,
      },
    })
  }

  return NextResponse.json(estab)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const estab = await prisma.estabelecimento.update({
    where: { id: params.id },
    data: { ativo: false },
  })

  return NextResponse.json({ message: "Estabelecimento desativado", id: estab.id })
}
