"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { isNativeApp } from "@/lib/native"

/**
 * Navegación del sitio de marketing. En la app NATIVA oculta los accesos a
 * Precios y a registro ("Empezar gratis") para cumplir Guideline 3.1.1;
 * deja solo "Iniciar sesión" (o "Ir al dashboard" si hay sesión).
 */
export function MarketingNav({ authed }: { authed: boolean }) {
  const [native] = useState(() => isNativeApp())

  return (
    <nav className="flex items-center gap-2">
      {!native && (
        <Link
          href="/precios"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Precios
        </Link>
      )}
      {authed ? (
        <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
          Ir al dashboard
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Iniciar sesión
          </Link>
          {!native && (
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Empezar gratis
            </Link>
          )}
        </>
      )}
    </nav>
  )
}
