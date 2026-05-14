"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getSubscriptionAccess, requireOrg } from "@/lib/auth"

async function assertCanWrite(): Promise<void> {
  const access = await getSubscriptionAccess()
  if (!access.canWrite) {
    throw new Error(
      access.reason ??
        "Tu suscripción no permite editar recetas. Ve a Configuración → Billing."
    )
  }
}

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const DishSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  sale_price: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

const IngredientSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto"),
  quantity: z.number().positive("La cantidad debe ser positiva"),
})

export type DishActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

function num(v: FormDataEntryValue | null): number {
  if (v === null || v === "") return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function createDish(formData: FormData) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear platillos.")
  }
  await assertCanWrite()

  const salePriceRaw = formData.get("sale_price")
  const parsed = DishSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category_id: formData.get("category_id") ?? "",
    sale_price:
      salePriceRaw && salePriceRaw !== "" ? Number(salePriceRaw) : null,
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dishes")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category_id: parsed.data.category_id || null,
      sale_price: parsed.data.sale_price ?? null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un platillo activo con ese nombre.")
    }
    throw new Error(error.message)
  }
  if (!data) throw new Error("No se pudo crear el platillo.")

  revalidatePath("/recetas")
  redirect(`/recetas/${data.id}`)
}

export async function updateDish(
  dishId: string,
  _prev: DishActionState,
  formData: FormData
): Promise<DishActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const salePriceRaw = formData.get("sale_price")
  const parsed = DishSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category_id: formData.get("category_id") ?? "",
    sale_price:
      salePriceRaw && salePriceRaw !== "" ? Number(salePriceRaw) : null,
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("dishes")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category_id: parsed.data.category_id || null,
      sale_price: parsed.data.sale_price ?? null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dishId)
    .eq("organization_id", org.id)

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Ya existe otro platillo activo con ese nombre.",
      }
    }
    return { status: "error", message: error.message }
  }

  revalidatePath("/recetas")
  revalidatePath(`/recetas/${dishId}`)
  return { status: "success", message: "Cambios guardados." }
}

export async function toggleDishActive(dishId: string, active: boolean) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("dishes")
    .update({
      is_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dishId)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/recetas")
  revalidatePath(`/recetas/${dishId}`)
}

export async function deleteDish(dishId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("dishes")
    .delete()
    .eq("id", dishId)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/recetas")
  redirect("/recetas")
}

export async function addDishIngredient(
  dishId: string,
  _prev: DishActionState,
  formData: FormData
): Promise<DishActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = IngredientSchema.safeParse({
    product_id: formData.get("product_id"),
    quantity: num(formData.get("quantity")),
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()

  const { data: dish } = await supabase
    .from("dishes")
    .select("id, organization_id")
    .eq("id", dishId)
    .eq("organization_id", org.id)
    .single()
  if (!dish) return { status: "error", message: "Platillo no encontrado." }

  const { error } = await supabase.from("dish_ingredients").insert({
    dish_id: dishId,
    product_id: parsed.data.product_id,
    quantity: parsed.data.quantity,
  })

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Este producto ya está en la receta. Edita la cantidad existente.",
      }
    }
    return { status: "error", message: error.message }
  }

  revalidatePath(`/recetas/${dishId}`)
  revalidatePath("/recetas")
  return { status: "success", message: "Ingrediente agregado." }
}

export async function updateDishIngredient(
  dishId: string,
  ingredientId: string,
  quantity: number
) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Cantidad inválida.")
  }

  const supabase = await createClient()

  const { data: dish } = await supabase
    .from("dishes")
    .select("id")
    .eq("id", dishId)
    .eq("organization_id", org.id)
    .single()
  if (!dish) throw new Error("Platillo no encontrado.")

  const { error } = await supabase
    .from("dish_ingredients")
    .update({ quantity })
    .eq("id", ingredientId)
    .eq("dish_id", dishId)

  if (error) throw new Error(error.message)

  revalidatePath(`/recetas/${dishId}`)
  revalidatePath("/recetas")
}

export async function removeDishIngredient(
  dishId: string,
  ingredientId: string
) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()

  const { data: dish } = await supabase
    .from("dishes")
    .select("id")
    .eq("id", dishId)
    .eq("organization_id", org.id)
    .single()
  if (!dish) throw new Error("Platillo no encontrado.")

  const { error } = await supabase
    .from("dish_ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("dish_id", dishId)

  if (error) throw new Error(error.message)

  revalidatePath(`/recetas/${dishId}`)
  revalidatePath("/recetas")
}
