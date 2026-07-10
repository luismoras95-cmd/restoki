"use client"

import { useEffect, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Header sticky del marketing site. Solo agrega una sombra suave al hacer
 * scroll — el contenido (logo, MarketingNav) llega como children desde el
 * layout de servidor.
 */
export function SiteHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/80 backdrop-blur transition-shadow duration-300",
        scrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      {children}
    </header>
  )
}
