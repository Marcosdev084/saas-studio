"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@auth0/nextjs-auth0/client"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

const publicPages = ["/login", "/sem-acesso"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && user?.semAcesso && pathname !== "/sem-acesso") {
      router.push("/sem-acesso")
    }
  }, [user, isLoading, pathname, router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (publicPages.includes(pathname)) {
    return <>{children}</>
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/portal")) {
    return <>{children}</>
  }

  return (
    <div className="h-screen overflow-hidden app-ambient flex">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <Topbar
          onMobileOpen={() => setMobileOpen(true)}
        />
        <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-10">
          <div key={pathname} className="animate-page-in max-w-[1440px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
