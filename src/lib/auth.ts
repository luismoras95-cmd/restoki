import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import type { Tables, Enums } from "@/types/db"

export const SELECTED_ORG_COOKIE = "restoki_selected_org"

export type OrgWithRole = Tables<"organizations"> & {
  role: Enums<"member_role">
}

/**
 * Devuelve el usuario autenticado o null.
 * Cacheado por request para evitar fetches duplicados.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Lista todas las orgs del usuario actual con su role.
 * Cacheado por request.
 */
export const getUserOrgs = cache(async (): Promise<OrgWithRole[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error || !data) return []

  return data
    .filter((row) => row.organization !== null)
    .map((row) => ({
      ...(row.organization as Tables<"organizations">),
      role: row.role,
    }))
})

/**
 * Devuelve la org "activa" del usuario:
 * 1. Si tiene cookie `restoki_selected_org` válida → esa.
 * 2. Si no, la primera org (orden de creación).
 * 3. Si no tiene ninguna → null.
 */
export const getCurrentOrg = cache(async (): Promise<OrgWithRole | null> => {
  const orgs = await getUserOrgs()
  if (orgs.length === 0) return null

  const cookieStore = await cookies()
  const selectedId = cookieStore.get(SELECTED_ORG_COOKIE)?.value

  if (selectedId) {
    const match = orgs.find((o) => o.id === selectedId)
    if (match) return match
  }

  return orgs[0]
})

/**
 * Variante "estricta" — redirige a /login si no hay user.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

/**
 * Variante "estricta" — redirige a /login si no hay user
 * o a /onboarding si el user no tiene org.
 */
export async function requireOrg(): Promise<{ user: User; org: OrgWithRole }> {
  const user = await requireUser()
  const org = await getCurrentOrg()
  if (!org) redirect("/onboarding")
  return { user, org }
}

/**
 * Set de location_ids accesibles por el usuario actual.
 * Para miembros con location_id NULL (owner/admin/manager) devuelve TODAS
 * las locations de sus orgs. Para staff scoped, solo su location asignada.
 *
 * Útil para filtrar dropdowns de "Sucursal" en pages donde queremos que el
 * staff solo vea su sucursal. Cacheado por request.
 */
export const getAccessibleLocationIds = cache(
  async (): Promise<Set<string>> => {
    const supabase = await createClient()
    const { data } = await supabase.rpc("user_location_ids")
    return new Set(data ?? [])
  }
)

// ============================================================
// Subscription access control
// ============================================================

export type SubscriptionAccess = {
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "missing"
  canWrite: boolean
  inTrial: boolean
  trialDaysLeft: number | null
  trialEndsAt: string | null
  reason: string | null
}

/**
 * Determina si la org del usuario actual puede escribir (crear POs,
 * mover inventario, etc.) según su suscripción.
 *
 * Lógica:
 *   - trialing + trial_ends_at > now → canWrite=true
 *   - trialing + trial_ends_at <= now → canWrite=false (trial expirado)
 *   - active → canWrite=true (mientras stripe diga active)
 *   - past_due → canWrite=true por 7 días desde current_period_end,
 *     después false (grace period)
 *   - canceled / incomplete → canWrite=false
 *   - missing (no row) → tratado como trialing fresh (defensa en depth)
 */
export const getSubscriptionAccess = cache(
  async (): Promise<SubscriptionAccess> => {
    const org = await getCurrentOrg()
    if (!org) {
      return {
        status: "missing",
        canWrite: false,
        inTrial: false,
        trialDaysLeft: null,
        trialEndsAt: null,
        reason: "Sin organización",
      }
    }

    const supabase = await createClient()
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, trial_ends_at, current_period_end")
      .eq("organization_id", org.id)
      .maybeSingle()

    if (!sub) {
      return {
        status: "missing",
        canWrite: true,
        inTrial: false,
        trialDaysLeft: null,
        trialEndsAt: null,
        reason: null,
      }
    }

    const now = Date.now()
    const trialEnd = sub.trial_ends_at
      ? new Date(sub.trial_ends_at).getTime()
      : null
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).getTime()
      : null

    const trialDaysLeft = trialEnd
      ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
      : null

    switch (sub.status) {
      case "trialing": {
        const inTrial = trialEnd ? trialEnd > now : true
        return {
          status: "trialing",
          canWrite: inTrial,
          inTrial,
          trialDaysLeft,
          trialEndsAt: sub.trial_ends_at,
          reason: inTrial
            ? null
            : "Tu prueba gratuita terminó. Agrega un plan para seguir.",
        }
      }
      case "active":
        return {
          status: "active",
          canWrite: true,
          inTrial: false,
          trialDaysLeft: null,
          trialEndsAt: null,
          reason: null,
        }
      case "past_due": {
        // grace period de 7 días desde el último period end
        const gracePeriodMs = 7 * 24 * 60 * 60 * 1000
        const inGrace = periodEnd ? periodEnd + gracePeriodMs > now : false
        return {
          status: "past_due",
          canWrite: inGrace,
          inTrial: false,
          trialDaysLeft: null,
          trialEndsAt: null,
          reason: inGrace
            ? null
            : "Tu último cobro falló y el período de gracia terminó. Actualiza tu tarjeta.",
        }
      }
      case "canceled":
        return {
          status: "canceled",
          canWrite: false,
          inTrial: false,
          trialDaysLeft: null,
          trialEndsAt: null,
          reason: "Tu suscripción está cancelada. Reactívala para seguir.",
        }
      case "incomplete":
      default:
        return {
          status: "incomplete",
          canWrite: false,
          inTrial: false,
          trialDaysLeft: null,
          trialEndsAt: null,
          reason: "Tu suscripción está incompleta. Termina el checkout para activar.",
        }
    }
  }
)

/**
 * Variante "estricta" para server actions de escritura. Lanza si el
 * usuario no tiene permiso de escritura.
 */
export async function requireWriteAccess(): Promise<{
  user: User
  org: OrgWithRole
  access: SubscriptionAccess
}> {
  const { user, org } = await requireOrg()
  const access = await getSubscriptionAccess()
  if (!access.canWrite) {
    throw new Error(
      access.reason ??
        "Tu organización no tiene una suscripción activa. Ve a Configuración → Billing."
    )
  }
  return { user, org, access }
}
