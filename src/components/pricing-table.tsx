"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Check, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLANS, TRIAL_DAYS, currency, pricePerMonth, type BillingCycle } from "@/lib/plans"

interface PricingTableProps {
  authed?: boolean
  defaultCycle?: BillingCycle
}

export function PricingTable({
  authed = false,
  defaultCycle = "monthly",
}: PricingTableProps) {
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 p-1 text-sm">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-md px-4 py-1.5 font-medium transition-colors",
              cycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={cn(
              "rounded-md px-4 py-1.5 font-medium transition-colors",
              cycle === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              -10%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const monthlyEquivalent = pricePerMonth(plan, cycle)
          const isPopular = plan.popular

          return (
            <div
              key={plan.code}
              className={cn(
                "relative flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm",
                isPopular &&
                  "border-primary/40 shadow-lg ring-1 ring-primary/20"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Más popular
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight">
                    {plan.name}
                  </h3>
                  {plan.ai && (
                    <Sparkles
                      className="size-4 text-primary"
                      aria-label="Con IA incluida"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums">
                    {currency.format(monthlyEquivalent)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                {cycle === "annual" ? (
                  <p className="text-xs text-muted-foreground">
                    {currency.format(plan.annual)} al año (IVA incluido)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Facturación mensual · IVA incluido
                  </p>
                )}
              </div>

              <Link
                href={authed ? `/configuracion?tab=billing&plan=${plan.code}&cycle=${cycle}` : "/signup"}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: isPopular ? "default" : "outline",
                  }),
                  "w-full"
                )}
              >
                {authed
                  ? "Cambiar a este plan"
                  : `Empezar ${TRIAL_DAYS} días gratis`}
                <ArrowRight className="size-4" />
              </Link>

              <ul className="flex flex-col gap-2.5 text-sm">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Todos los planes incluyen {TRIAL_DAYS} días de prueba gratis. Sin tarjeta
        para empezar. Cancela cuando quieras sin penalización.
      </p>
    </div>
  )
}
