"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export type SupplierActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

function parse(formData: FormData) {
  return SupplierSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  })
}

export async function createSupplier(
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para crear proveedores." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").insert({
    organization_id: org.id,
    name: parsed.data.name,
    contact_name: parsed.data.contact_name || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath("/proveedores")
  return { status: "success", message: "Proveedor creado." }
}

export async function updateSupplier(
  id: string,
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para editar." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contact_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) return { status: "error", message: error.message }

  revalidatePath("/proveedores")
  return { status: "success", message: "Cambios guardados." }
}

export async function deleteSupplier(id: string) {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para borrar proveedores.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/proveedores")
}
