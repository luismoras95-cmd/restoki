import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function mapStripeStatusToDb(
  s: Stripe.Subscription.Status
): "trialing" | "active" | "past_due" | "canceled" | "incomplete" {
  switch (s) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
      return s
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "incomplete"
    default:
      return "incomplete"
  }
}

function planFromPriceId(priceId: string): {
  plan: string | null
  cycle: "monthly" | "annual" | null
} {
  const map: Record<string, { plan: string; cycle: "monthly" | "annual" }> = {
    [process.env.STRIPE_PRICE_SOLO_MONTHLY ?? ""]: {
      plan: "solo",
      cycle: "monthly",
    },
    [process.env.STRIPE_PRICE_SOLO_ANNUAL ?? ""]: {
      plan: "solo",
      cycle: "annual",
    },
    [process.env.STRIPE_PRICE_CADENA_MONTHLY ?? ""]: {
      plan: "cadena",
      cycle: "monthly",
    },
    [process.env.STRIPE_PRICE_CADENA_ANNUAL ?? ""]: {
      plan: "cadena",
      cycle: "annual",
    },
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? ""]: {
      plan: "enterprise",
      cycle: "monthly",
    },
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? ""]: {
      plan: "enterprise",
      cycle: "annual",
    },
  }
  const m = map[priceId]
  return m ?? { plan: null, cycle: null }
}

async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  organizationId: string
) {
  const supabase = createAdminClient()
  const item = stripeSubscription.items.data[0]
  const priceId = item?.price.id ?? ""
  const { plan, cycle } = planFromPriceId(priceId)

  // En Stripe SDK 22+ current_period_end vive en el subscription item
  const itemPeriodEnd = item?.current_period_end
  const currentPeriodEnd =
    typeof itemPeriodEnd === "number"
      ? new Date(itemPeriodEnd * 1000).toISOString()
      : null

  const trialEndsAt =
    typeof stripeSubscription.trial_end === "number"
      ? new Date(stripeSubscription.trial_end * 1000).toISOString()
      : null

  await supabase
    .from("subscriptions")
    .update({
      stripe_customer_id:
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      stripe_subscription_id: stripeSubscription.id,
      status: mapStripeStatusToDb(stripeSubscription.status),
      plan,
      billing_cycle: cycle,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !whSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    )
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, sig, whSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json(
      { error: `Signature verification failed: ${msg}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId =
          session.client_reference_id ??
          (session.metadata?.organization_id as string | undefined)

        if (!orgId || !session.subscription) break

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id

        const fullSubscription =
          await stripe().subscriptions.retrieve(subscriptionId)
        await syncSubscriptionFromStripe(fullSubscription, orgId)
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.organization_id as
          | string
          | undefined
        if (!orgId) {
          // Si no hay metadata, intenta buscar por stripe_subscription_id
          const supabase = createAdminClient()
          const { data } = await supabase
            .from("subscriptions")
            .select("organization_id")
            .eq("stripe_subscription_id", subscription.id)
            .single()
          if (data?.organization_id) {
            await syncSubscriptionFromStripe(subscription, data.organization_id)
          }
          break
        }
        await syncSubscriptionFromStripe(subscription, orgId)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        // En SDK 22+ subscription vive en parent.subscription_details
        const parent = invoice.parent
        if (parent?.type !== "subscription_details") break
        const subId = parent.subscription_details?.subscription
        if (!subId) break
        const subscriptionId = typeof subId === "string" ? subId : subId.id
        const supabase = createAdminClient()
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)
        break
      }

      default:
        // No-op para eventos que no manejamos
        break
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json(
      { error: `Handler error: ${msg}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
