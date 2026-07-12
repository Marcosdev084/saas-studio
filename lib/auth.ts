import { NextResponse } from "next/server"
import { getUsuarioLogado, UserSession } from "@/lib/session"

type Permissao = "ADMIN" | "GERENTE" | "PROFISSIONAL" | "RECEPCIONISTA"

const hierarquia: Record<Permissao, number> = {
  ADMIN: 4,
  GERENTE: 3,
  PROFISSIONAL: 2,
  RECEPCIONISTA: 1,
}

export async function requireAuth(): Promise<
  { usuario: UserSession; error?: never } | { usuario?: never; error: NextResponse }
> {
  const usuario = await getUsuarioLogado()
  if (!usuario) {
    return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) }
  }
  return { usuario }
}

export async function requirePermissao(...niveis: Permissao[]): Promise<
  { usuario: UserSession; error?: never } | { usuario?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  const userNivel = result.usuario.permissao as Permissao
  const minNivel = Math.min(...niveis.map((n) => hierarquia[n]))

  if ((hierarquia[userNivel] ?? 0) < minNivel) {
    return { error: NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 }) }
  }

  return result
}

export async function requireAdmin(): Promise<
  { usuario: UserSession; error?: never } | { usuario?: never; error: NextResponse }
> {
  return requirePermissao("ADMIN")
}
