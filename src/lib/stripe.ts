import Stripe from "stripe"

import { type BillingCycle, type PlanCode } from "@/lib/plans"

let _stripe: Stripe | null = null

export function stripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. Agrega la variable en Vercel."
    )
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  })
  return _stripe
}

// ============================================================
// Mapping plan + cycle → Stripe Price ID
// Configurado vía env vars (STRIPE_PRICE_{PLAN}_{CYCLE}).
// ============================================================
export function stripePriceId(
  plan: PlanCode,
  cycle: BillingCycle
): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Falta ${key} en variables de entorno. Crea el precio en Stripe Dashboard y pega el price_id.`
    )
  }
  return value
}
