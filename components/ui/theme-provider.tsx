"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

export type Palette = "contrysk" | "safira" | "ametista" | "rosa" | "ambar"
export type ThemeMode = "claro" | "escuro"

interface ThemeContextValue {
  palette: Palette
  mode: ThemeMode
  setPalette: (p: Palette) => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: "contrysk",
  mode: "claro",
  setPalette: () => {},
  setMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export const palettes: { key: Palette; label: string; preview: string; gradient: string }[] = [
  { key: "contrysk", label: "Contrysk", preview: "#105a73", gradient: "from-accent-600 to-accent-400" },
  { key: "safira", label: "Safira", preview: "#2563eb", gradient: "from-blue-500 to-indigo-600" },
  { key: "ametista", label: "Ametista", preview: "#9333ea", gradient: "from-purple-500 to-fuchsia-600" },
  { key: "rosa", label: "Rosa", preview: "#ec4899", gradient: "from-pink-500 to-fuchsia-600" },
  { key: "ambar", label: "Âmbar", preview: "#d97706", gradient: "from-amber-500 to-orange-600" },
]

function applyTheme(palette: Palette, mode: ThemeMode) {
  const html = document.documentElement
  html.setAttribute("data-palette", palette === "contrysk" ? "" : palette)
  html.setAttribute("data-theme", mode === "escuro" ? "dark" : "light")

  if (palette === "contrysk") {
    html.removeAttribute("data-palette")
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>("contrysk")
  const [mode, setModeState] = useState<ThemeMode>("claro")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("saas-theme")
    if (saved) {
      try {
        const { palette: p, mode: m } = JSON.parse(saved)
        const validP = p === "esmeralda" ? "contrysk" : p
        if (validP) setPaletteState(validP)
        if (m) setModeState(m)
        applyTheme(validP ?? "contrysk", m ?? "claro")
      } catch {}
    }
    setMounted(true)
  }, [])

  const setPalette = useCallback((p: Palette) => {
    setPaletteState(p)
    applyTheme(p, mode)
    localStorage.setItem("saas-theme", JSON.stringify({ palette: p, mode }))
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    applyTheme(palette, m)
    localStorage.setItem("saas-theme", JSON.stringify({ palette, mode: m }))
  }, [palette])

  useEffect(() => {
    if (mounted) applyTheme(palette, mode)
  }, [palette, mode, mounted])

  return (
    <ThemeContext.Provider value={{ palette, mode, setPalette, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
