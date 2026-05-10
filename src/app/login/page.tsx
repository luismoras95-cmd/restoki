import Link from "next/link"
import { ChefHat } from "lucide-react"

import { UnderConstruction } from "@/components/under-construction"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-base font-semibold tracking-tight"
      >
        <ChefHat className="size-5 text-primary" />
        <span>Restoki</span>
      </Link>
      <UnderConstruction
        title="Inicio de sesión"
        description="El login con magic link estará disponible en Fase 2."
      />
    </div>
  )
}
