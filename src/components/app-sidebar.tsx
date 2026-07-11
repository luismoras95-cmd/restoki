"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"

import { APP_NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  onNavigate?: () => void
  /** Cuando true, todo queda bloqueado salvo Configuración (paywall). */
  blocked?: boolean
}

export function AppSidebar({ onNavigate, blocked = false }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-3">
      {APP_NAV.map((item) => {
        const Icon = item.icon
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const locked = blocked && item.href !== "/configuracion"

        if (locked) {
          return (
            <div
              key={item.href}
              title="Agrega un plan para desbloquear esta función"
              aria-disabled
              className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/40"
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              <Lock className="ml-auto size-3.5" />
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
