"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const LocationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  address: z.string().trim().max(280).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
})

export type LocationActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export async function createLocation(
  _prev: LocationActionState,
  formData: FormData
): Promise<LocationActionState> {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para crear sucursales." }
  }

  const parsed = LocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("locations").insert({
    organization_id: org.id,
    name: parsed.data.name,
    address: parsed.data.address || null,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath("/sucursales")
  return { status: "success", message: "Sucursal creada." }
}

export async function updateLocation(
  id: string,
  _prev: LocationActionState,
  formData: FormData
): Promise<LocationActionState> {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para editar." }
  }

  const parsed = LocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) return { status: "error", message: error.message }

  revalidatePath("/sucursales")
  return { status: "success", message: "Cambios guardados." }
}

export async function toggleLocationActive(id: string, isActive: boolean) {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para editar sucursales.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("locations")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/sucursales")
}
