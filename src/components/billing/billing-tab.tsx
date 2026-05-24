"use client"

import { useEffect, useState, useTransition } from "react"
import { ArrowRight, CreditCard, ExternalLink, Globe, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { openBillingPortal, startCheckout } from "@/lib/actions/billing"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PricingTable } from "@/components/pricing-table"
import { isNativeApp } from "@/lib/native"
import { cn } from "@/lib/utils"
import {
  PLANS,
  currency,
  pricePerMonth,
  planByCode,
  type BillingCycle,
  type PlanCode,
} from "@/lib/plans"

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  trialing: {
    label: "Prueba",
    tone: "bg-primary/10 text-primary",
  },
  active: {
    label: "Activa",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  past_due: {
    label: "Pago atrasado",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  canceled: {
    label: "Cancelada",
    tone: "bg-muted text-muted-foreground",
  },
  incomplete: {
    label: "Incompleta",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
}

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

interface BillingTabProps {
  subscription: {
    status: string | null
    plan: string | null
    billing_cycle: string | null
    trial_ends_at: string | null
    current_period_end: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
  } | null
  canManage: boolean
}

export function BillingTab({ subscription, canManage }: BillingTabProps) {
  // En la app nativa NO se puede mostrar checkout/portal de pago (las
  // tiendas lo prohíben). Solo lectura del estado + mensaje para gestionar
  // en la web.
  const [native, setNative] = useState(false)
  useEffect(() => {
    setNative(isNativeApp())
  }, [])

  const status = subscription?.status ?? "trialing"
  const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL.trialing!
  const isTrialing = status === "trialing"
  const hasActiveSubscription = !!subscription?.stripe_subscription_id

  const currentPlan =
    subscription?.plan && ["solo", "cadena", "enterprise"].includes(subscription.plan)
      ? planByCode(subscription.plan as PlanCode)
      : null

  const cycle = (subscription?.billing_cycle as BillingCycle) ?? "monthly"

  const trialEndDate = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null
  const trialDaysLeft = trialEndDate
    ? Math.max(
        0,
        Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : 0

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Current status card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                {currentPlan ? (
                  <>
                    Plan {currentPlan.name}
                    {currentPlan.ai && (
                      <Sparkles className="size-4 text-primary" />
                    )}
                  </>
                ) : (
                  "Prueba gratuita"
                )}
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    statusInfo.tone
                  )}
                >
                  {statusInfo.label}
                </span>
              </CardTitle>
              <CardDescription>
                {isTrialing && trialEndDate ? (
                  <>
                    Tu prueba termina el{" "}
                    <span className="font-medium text-foreground">
                      {dateFmt.format(trialEndDate)}
                    </span>{" "}
                    ({trialDaysLeft} días restantes).
                  </>
                ) : status === "active" && periodEnd && currentPlan ? (
                  <>
                    Próximo cobro el{" "}
                    <span className="font-medium text-foreground">
                      {dateFmt.format(periodEnd)}
                    </span>{" "}
                    por{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {currency.format(pricePerMonth(currentPlan, cycle))}
                    </span>
                    /mes ({cycle === "annual" ? "facturación anual" : "facturación mensual"}).
                  </>
                ) : status === "past_due" ? (
                  "Tu último cobro falló. Actualiza tu tarjeta en el portal de billing."
                ) : status === "canceled" ? (
                  "Tu suscripción está cancelada."
                ) : (
                  "Elige un plan para empezar a operar sin límites."
                )}
              </CardDescription>
            </div>
            {canManage && hasActiveSubscription && !native && (
              <form action={openBillingPortal}>
                <Button type="submit" variant="outline">
                  <ExternalLink className="size-4" />
                  Gestionar billing
                </Button>
              </form>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* En la app nativa: NO checkout. Mensaje para gestionar en la web. */}
      {native ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4" />
              Gestiona tu suscripción en la web
            </CardTitle>
            <CardDescription>
              Para elegir o cambiar tu plan, actualizar tu método de pago o ver
              tus facturas, entra a{" "}
              <span className="font-medium text-foreground">restoki.mx</span>{" "}
              desde el navegador de tu computadora o celular. Tu suscripción se
              gestiona fuera de la app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Inicia sesión en{" "}
              <span className="font-medium text-foreground">restoki.mx</span>{" "}
              con el mismo correo y contraseña que usas aquí. Todo tu inventario
              y datos son los mismos.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Plan picker (solo web) */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {currentPlan ? "Cambiar de plan" : "Elige tu plan"}
                </CardTitle>
                <CardDescription>
                  {currentPlan
                    ? "El cambio se aplica de inmediato. Stripe prorrate el costo."
                    : "Elige el plan que mejor se ajuste a tu operación. Puedes cambiar después."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <PlanPickerInline currentPlan={currentPlan?.code ?? null} />
              </CardContent>
            </Card>
          )}

          {/* Detalle de planes para users sin plan (solo web) */}
          {!currentPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Detalle de los planes
                </CardTitle>
                <CardDescription>
                  Click en cualquier plan para empezar el checkout con tarjeta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingTable authed defaultCycle="monthly" />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function PlanPickerInline({ currentPlan }: { currentPlan: PlanCode | null }) {
  const [pending, startTransition] = useTransition()

  function handleSelect(planCode: PlanCode, cycle: BillingCycle) {
    if (pending) return
    startTransition(async () => {
      try {
        await startCheckout(planCode, cycle)
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
          throw e
        }
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.code
        return (
          <div
            key={plan.code}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4",
              isCurrent
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card",
              plan.popular && !isCurrent && "border-primary/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{plan.name}</span>
                {plan.ai && <Sparkles className="size-3.5 text-primary" />}
              </div>
              {isCurrent && (
                <Badge variant="default" className="text-xs">
                  Actual
                </Badge>
              )}
              {plan.popular && !isCurrent && (
                <Badge variant="outline" className="border-primary/40 text-xs text-primary">
                  Popular
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{plan.tagline}</p>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">
                  {currency.format(plan.monthly)}
                </span>
                <span className="text-xs text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                o {currency.format(plan.annual)}/año (-10%)
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={isCurrent ? "outline" : "default"}
                disabled={pending || isCurrent}
                onClick={() => handleSelect(plan.code, "monthly")}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    {isCurrent ? "Plan actual (mensual)" : "Pago mensual"}
                    {!isCurrent && <ArrowRight className="size-3.5" />}
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || isCurrent}
                onClick={() => handleSelect(plan.code, "annual")}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    Pago anual (-10%)
                    {!isCurrent && <ArrowRight className="size-3.5" />}
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
