import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { criarToken, portalCookieHeader, portalLogoutCookieHeader, getPortalSession } from "@/lib/portal-auth"

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  if (action === "register") {
    const { nome, email, telefone, senha } = body
    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    const existing = await prisma.contaCliente.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado" }, { status: 409 })
    }

    const senhaHash = await bcrypt.hash(senha, 10)
    const conta = await prisma.contaCliente.create({
      data: {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        telefone: telefone?.trim() || null,
        senhaHash,
      },
    })

    const token = await criarToken({ contaClienteId: conta.id, nome: conta.nome, email: conta.email })
    const res = NextResponse.json({ ok: true, nome: conta.nome })
    res.headers.set("Set-Cookie", portalCookieHeader(token))
    return res
  }

  if (action === "login") {
    const { email, senha } = body
    if (!email?.trim() || !senha) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 })
    }

    const conta = await prisma.contaCliente.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!conta || !conta.ativo) {
      return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 })
    }

    const valid = await bcrypt.compare(senha, conta.senhaHash)
    if (!valid) {
      return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 })
    }

    const token = await criarToken({ contaClienteId: conta.id, nome: conta.nome, email: conta.email })
    const res = NextResponse.json({ ok: true, nome: conta.nome })
    res.headers.set("Set-Cookie", portalCookieHeader(token))
    return res
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true })
    res.headers.set("Set-Cookie", portalLogoutCookieHeader())
    return res
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}

export async function GET() {
  const session = await getPortalSession()
  if (!session) return NextResponse.json({ authenticated: false })
  return NextResponse.json({ authenticated: true, ...session })
}
