"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { isNativeApp } from "@/lib/native"

/**
 * Cumplimiento App Store (Guideline 3.1.1):
 * dentro de la app NATIVA no se debe mostrar registro de cuentas, precios ni
 * CTAs de prueba/suscripción. Este gate envuelve esas páginas: en la app
 * nativa redirige a la pantalla indicada (login por defecto) y NO renderiza
 * el contenido. En la web no hace nada (muestra los children normal).
 */
export function NativeAuthGate({
  children,
  to = "/login",
}: {
  children: React.ReactNode
  to?: string
}) {
  const router = useRouter()
  // Inicializador síncrono: en el webview nativo Capacitor ya está disponible,
  // así no se alcanza a "parpadear" el contenido de marketing.
  const [native] = useState(() => isNativeApp())

  useEffect(() => {
    if (isNativeApp()) router.replace(to)
  }, [router, to])

  if (native) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background" />
    )
  }

  return <>{children}</>
}
