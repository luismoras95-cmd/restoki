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
