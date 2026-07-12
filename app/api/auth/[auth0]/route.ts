import { handleAuth, handleCallback, handleLogin } from "@auth0/nextjs-auth0"
import { prisma } from "@/lib/prisma"

export const GET = handleAuth({
  login: handleLogin({
    returnTo: "/dashboard",
  }),
  callback: handleCallback({
    afterCallback: async (req, session) => {
      const email = session.user.email

      if (!email) return session

      // Buscar usuário no banco pelo e-mail
      const usuario = await prisma.usuario.findFirst({
        where: { email, ativo: true },
        include: {
          estabelecimento: { select: { id: true, nome: true, ativo: true } },
        },
      })

      if (!usuario) {
        // Usuário não cadastrado no sistema — redireciona para tela de sem acesso
        return {
          ...session,
          user: {
            ...session.user,
            semAcesso: true,
          },
        }
      }

      if (!usuario.estabelecimento.ativo) {
        return {
          ...session,
          user: {
            ...session.user,
            semAcesso: true,
            motivo: "estabelecimento_inativo",
          },
        }
      }

      // Vincular auth0Id se ainda está pendente
      if (usuario.auth0Id.startsWith("pending_")) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { auth0Id: session.user.sub },
        })
      }

      // Enriquecer a sessão com dados do sistema
      return {
        ...session,
        user: {
          ...session.user,
          userId: usuario.id,
          estabelecimentoId: usuario.estabelecimento.id,
          estabelecimentoNome: usuario.estabelecimento.nome,
          permissao: usuario.permissao,
        },
      }
    },
  }),
})
