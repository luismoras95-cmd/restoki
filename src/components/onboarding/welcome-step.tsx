import Link from "next/link"
import { PartyPopper, ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WelcomeStepProps {
  orgName: string
}

export function WelcomeStep({ orgName }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <PartyPopper className="size-7" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          ¡Listo, {orgName}!
        </h2>
        <p className="text-sm text-muted-foreground">
          Ya puedes empezar a usar Restoki. Te dejamos algunas ideas para los
          primeros pasos.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2 rounded-lg border bg-muted/30 p-4 text-left text-sm">
        <li className="flex gap-2">
          <span className="text-primary">1.</span>
          <span>Sube tus productos más usados (catálogo).</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary">2.</span>
          <span>Crea tu primer proveedor.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary">3.</span>
          <span>Registra la primera compra y verás stock al instante.</span>
        </li>
      </ul>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        Ir al dashboard
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
