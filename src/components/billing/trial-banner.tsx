import Link from "next/link"
import { AlertCircle, ArrowRight, Clock, XCircle } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SubscriptionAccess } from "@/lib/auth"

interface TrialBannerProps {
  access: SubscriptionAccess
  canManageBilling: boolean
}

export function TrialBanner({ access, canManageBilling }: TrialBannerProps) {
  // Sin banner si la suscripción está activa
  if (access.status === "active") return null

  // Suscripción cancelada o sin acceso de escritura
  if (!access.canWrite) {
    return (
      <div className="flex items-start gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm md:px-6">
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium text-destructive">
            {access.status === "trialing"
              ? "Tu prueba gratuita terminó"
              : access.status === "canceled"
                ? "Tu suscripción está cancelada"
                : access.status === "past_due"
                  ? "Pago atrasado"
                  : "Suscripción inactiva"}
          </p>
          <p className="text-xs text-muted-foreground">
            {access.reason ??
              "Necesitas un plan activo para crear, modificar o recibir órdenes. Puedes seguir viendo tu información."}
          </p>
        </div>
        {canManageBilling && (
          <Link
            href="/configuracion?tab=billing"
            className={buttonVariants({ size: "sm" })}
          >
            Agregar tarjeta
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    )
  }

  // En trial — mostrar countdown con tono según urgencia
  if (access.status === "trialing" && access.trialDaysLeft !== null) {
    const days = access.trialDaysLeft
    const urgent = days <= 3

    return (
      <div
        className={cn(
          "flex items-center gap-3 border-b px-4 py-2 text-sm md:px-6",
          urgent
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-primary/20 bg-primary/5"
        )}
      >
        {urgent ? (
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Clock className="size-4 shrink-0 text-primary" />
        )}
        <p
          className={cn(
            "flex-1 text-xs",
            urgent
              ? "text-amber-700 dark:text-amber-400"
              : "text-foreground"
          )}
        >
          <span className="font-medium">
            {days === 0
              ? "Tu prueba termina hoy"
              : days === 1
                ? "Tu prueba termina mañana"
                : `Quedan ${days} días de prueba gratuita`}
          </span>
          {" — "}
          <span className="text-muted-foreground">
            agrega un plan antes para no perder acceso de escritura.
          </span>
        </p>
        {canManageBilling && (
          <Link
            href="/configuracion?tab=billing"
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium hover:underline",
              urgent ? "text-amber-700 dark:text-amber-400" : "text-primary"
            )}
          >
            Elegir plan
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    )
  }

  // past_due en grace period
  if (access.status === "past_due") {
    return (
      <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm md:px-6">
        <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">
          <span className="font-medium">Tu último cobro falló.</span>{" "}
          <span className="text-muted-foreground">
            Actualiza tu tarjeta antes de que se suspenda el servicio.
          </span>
        </p>
        {canManageBilling && (
          <Link
            href="/configuracion?tab=billing"
            className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Actualizar tarjeta →
          </Link>
        )}
      </div>
    )
  }

  return null
}
