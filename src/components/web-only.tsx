"use client"

import { useState } from "react"

import { isNativeApp } from "@/lib/native"

/**
 * Renderiza sus children SOLO en la web. En la app nativa (iOS/Android) no
 * los muestra. Útil para ocultar enlaces de registro / precios / prueba que
 * App Review no permite dentro de la app (Guideline 3.1.1).
 */
export function WebOnly({ children }: { children: React.ReactNode }) {
  const [native] = useState(() => isNativeApp())
  if (native) return null
  return <>{children}</>
}
