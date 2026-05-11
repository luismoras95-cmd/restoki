"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const UpdateOrgSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  rfc: z.string().trim().max(13).optional().or(z.literal("")),
  address: z.string().trim().max(280).optional().or(z.literal("")),
})

export type UpdateOrgState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin"])

export async function updateOrganization(
  _prev: UpdateOrgState,
  formData: FormData
): Promise<UpdateOrgState> {
  const { org } = await requireOrg()

  if (!EDITOR_ROLES.has(org.role)) {
    return {
      status: "error",
      message: "Solo dueños y administradores pueden editar la organización.",
    }
  }

  const parsed = UpdateOrgSchema.safeParse({
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
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      rfc: parsed.data.rfc || null,
      address: parsed.data.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id)

  if (error) {
    return { status: "error", message: error.message }
  }

  revalidatePath("/configuracion")
  revalidatePath("/", "layout")
  return { status: "success", message: "Cambios guardados." }
}
