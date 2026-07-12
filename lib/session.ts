import { getSession } from "@auth0/nextjs-auth0"

export interface UserSession {
  userId: string
  estabelecimentoId: string
  estabelecimentoNome: string
  permissao: string
  email: string
  nome: string
}

export async function getUsuarioLogado(): Promise<UserSession | null> {
  const session = await getSession()

  if (!session?.user) return null
  if (session.user.semAcesso) return null
  if (!session.user.estabelecimentoId) return null

  return {
    userId: session.user.userId,
    estabelecimentoId: session.user.estabelecimentoId,
    estabelecimentoNome: session.user.estabelecimentoNome,
    permissao: session.user.permissao,
    email: session.user.email,
    nome: session.user.name ?? session.user.email,
  }
}
