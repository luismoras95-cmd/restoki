"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  getCurrentOrg,
  requireOrg,
  requireUser,
  SELECTED_ORG_COOKIE,
} from "@/lib/auth"

const OrgSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  rfc: z.string().trim().max(13).optional().or(z.literal("")),
  address: z.string().trim().max(280).optional().or(z.literal("")),
})

const LocationsSchema = z.object({
  names: z
    .array(z.string().trim().min(1, "Nombre vacío").max(120))
    .min(1, "Agrega al menos una sucursal")
    .max(20),
})

const CategoriesSchema = z.object({
  names: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Selecciona o agrega al menos una categoría")
    .max(40),
})

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }

export async function createOrganization(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser()

  const parsed = OrgSchema.safeParse({
    name: formData.get("name"),
    rfc: formData.get("rfc") ?? "",
    address: formData.get("address") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { data: orgId, error } = await supabase.rpc(
    "create_organization_with_owner",
    {
      p_name: parsed.data.name,
      p_rfc: parsed.data.rfc || undefined,
      p_address: parsed.data.address || undefined,
    }
  )

  if (error || !orgId) {
    return {
      status: "error",
      message: error?.message ?? "No se pudo crear la organización",
    }
  }

  const cookieStore = await cookies()
  cookieStore.set(SELECTED_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })

  revalidatePath("/onboarding", "layout")
  redirect("/onboarding?step=2")
}

export async function addLocations(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { org } = await requireOrg()

  const rawNames = formData.getAll("name").map((v) => String(v))
  const names = rawNames.map((n) => n.trim()).filter((n) => n.length > 0)

  const parsed = LocationsSchema.safeParse({ names })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("locations").insert(
    parsed.data.names.map((name) => ({
      organization_id: org.id,
      name,
    }))
  )

  if (error) {
    return {
      status: "error",
      message: error.message,
    }
  }

  revalidatePath("/onboarding", "layout")
  redirect("/onboarding?step=3")
}

export async function addCategories(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { org } = await requireOrg()

  const rawNames = formData.getAll("name").map((v) => String(v))
  const names = Array.from(
    new Set(rawNames.map((n) => n.trim()).filter((n) => n.length > 0))
  )

  const parsed = CategoriesSchema.safeParse({ names })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("categories").insert(
    parsed.data.names.map((name) => ({
      organization_id: org.id,
      name,
    }))
  )

  if (error) {
    return {
      status: "error",
      message: error.message,
    }
  }

  revalidatePath("/onboarding", "layout")
  redirect("/onboarding?step=4")
}

export async function setSelectedOrg(orgId: string) {
  await requireUser()
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  revalidatePath("/", "layout")
}

/**
 * Útil para que el step 4 no se renderice si el user no tiene org.
 */
export async function ensureHasOrgForOnboarding() {
  const org = await getCurrentOrg()
  if (!org) redirect("/onboarding?step=1")
  return org
}
