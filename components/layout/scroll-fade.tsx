"use client"

import { useEffect } from "react"

/**
 * Gerenciador global do efeito de rolagem (.scroll-fade-y).
 * Marca data-fade="on" enquanto há conteúdo abaixo e "off"
 * ao chegar no fim (ou quando não há scroll), fazendo o fade
 * cinza da borda inferior aparecer/sumir suavemente.
 * Detecta containers adicionados dinamicamente e mudanças de conteúdo.
 */
export function ScrollFade() {
  useEffect(() => {
    const els = new Set<HTMLElement>()

    const update = (el: HTMLElement) => {
      const scrollable = el.scrollHeight > el.clientHeight + 1
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 1
      el.dataset.fade = scrollable && !atBottom ? "on" : "off"
    }

    const onScroll = (e: Event) => update(e.currentTarget as HTMLElement)

    const register = (el: HTMLElement) => {
      if (els.has(el)) return
      els.add(el)
      el.addEventListener("scroll", onScroll, { passive: true })
      update(el)
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      document.querySelectorAll<HTMLElement>(".scroll-fade-y").forEach(register)
      els.forEach((el) => {
        if (!el.isConnected) { els.delete(el); return }
        update(el)
      })
    }
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 60)
    }

    refresh()
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true, subtree: true })
    window.addEventListener("resize", schedule)

    return () => {
      mo.disconnect()
      window.removeEventListener("resize", schedule)
      clearTimeout(timer)
      els.forEach((el) => el.removeEventListener("scroll", onScroll))
    }
  }, [])

  return null
}
