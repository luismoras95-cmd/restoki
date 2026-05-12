"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const CategorySchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(80),
})

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export async function createCategory(name: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear categorías.")
  }

  const parsed = CategorySchema.safeParse({ name })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
    })
    .select("id, name")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/productos")
  return data
}

export async function renameCategory(id: string, name: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para editar categorías.")
  }

  const parsed = CategorySchema.safeParse({ name })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/productos")
}

export async function deleteCategory(id: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para borrar categorías.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/productos")
}
