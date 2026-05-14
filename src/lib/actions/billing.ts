"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"
import { stripe, stripePriceId } from "@/lib/stripe"
import type { BillingCycle, PlanCode } from "@/lib/plans"
import { planByCode } from "@/lib/plans"

const EDITOR_ROLES = new Set(["owner", "admin"])

async function getOrigin(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "restoki.mx"}`
  )
}

/**
 * Crea una Stripe Checkout Session para suscribirse a un plan + ciclo.
 * Si la org ya tiene stripe_customer_id, lo reusa. Si no, Stripe crea uno.
 * Redirige al usuario a la página de checkout de Stripe.
 */
export async function startCheckout(
  planCode: PlanCode,
  cycle: BillingCycle
): Promise<void> {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error(
      "Solo dueños y administradores pueden cambiar la suscripción."
    )
  }

  // Valida que el plan existe
  planByCode(planCode)

  const supabase = await createClient()
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("organization_id", org.id)
    .single()

  const origin = await getOrigin()
  const priceId = stripePriceId(planCode, cycle)

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: sub?.stripe_customer_id ?? undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email,
    client_reference_id: org.id,
    subscription_data: {
      metadata: {
        organization_id: org.id,
        plan_code: planCode,
        billing_cycle: cycle,
      },
    },
    metadata: {
      organization_id: org.id,
      plan_code: planCode,
      billing_cycle: cycle,
    },
    success_url: `${origin}/configuracion?tab=billing&checkout=success`,
    cancel_url: `${origin}/configuracion?tab=billing&checkout=cancel`,
    allow_promotion_codes: true,
    locale: "es-419",
    billing_address_collection: "auto",
  })

  if (!session.url) {
    throw new Error("Stripe no devolvió URL de checkout.")
  }

  redirect(session.url)
}

/**
 * Abre el Stripe Customer Portal para que el user gestione su suscripción
 * (cambiar plan, actualizar tarjeta, cancelar).
 */
export async function openBillingPortal(): Promise<void> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Solo dueños y administradores pueden gestionar billing.")
  }

  const supabase = await createClient()
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", org.id)
    .single()

  if (!sub?.stripe_customer_id) {
    throw new Error(
      "Tu organización aún no tiene una suscripción activa. Elige un plan primero."
    )
  }

  const origin = await getOrigin()
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/configuracion?tab=billing`,
    locale: "es-419",
  })

  redirect(session.url)
}
