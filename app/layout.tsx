import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@auth0/nextjs-auth0/client"
import { AppShell } from "@/components/layout/app-shell"
import { ScrollFade } from "@/components/layout/scroll-fade"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/ui/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SaaS Studio — Inteligência Operacional para Salões e Clínicas",
  description: "Plataforma de agendamento, retenção e gestão inteligente para profissionais de beleza e saúde.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <UserProvider>
          <ThemeProvider>
            <ToastProvider>
              <ScrollFade />
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}
