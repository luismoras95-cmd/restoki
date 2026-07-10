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

// ============================================================
// Importación masiva de recetas desde CSV/Excel
// ============================================================

export type ImportDishRow = {
  platillo: string
  precio_venta: string
  insumo: string
  cantidad: string
}

export type ImportDishesResult = {
  status: "ok" | "error"
  createdDishes: number
  skippedDishes: number
  missingProducts: { name: string; dishes: string[] }[]
  errors: { row: number; message: string }[]
  message: string
}

/**
 * Normaliza nombres para hacer match: trim, minúsculas, colapsa espacios y
 * quita acentos ("Café con leche" === "cafe  con leche").
 */
function normalizeName(raw: string): string {
  return raw
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
}

/** Nombre "bonito" para mostrar: trim + colapsa espacios, conserva acentos. */
function displayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

/**
 * Parsea números del CSV. Acepta "1,5" como decimal (coma decimal) y
 * "1,200.50" con coma de miles.
 */
function parseCsvNumber(raw: string): number {
  const v = raw.trim()
  if (v === "") return NaN
  if (/^\d+,\d+$/.test(v)) return Number(v.replace(",", "."))
  return Number(v.replace(/,/g, ""))
}

const IMPORT_ERROR = (message: string): ImportDishesResult => ({
  status: "error",
  createdDishes: 0,
  skippedDishes: 0,
  missingProducts: [],
  errors: [],
  message,
})

export async function importDishes(
  rows: ImportDishRow[]
): Promise<ImportDishesResult> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return IMPORT_ERROR("Sin permiso para importar recetas.")
  }

  const access = await getSubscriptionAccess()
  if (!access.canWrite) {
    return IMPORT_ERROR(access.reason ?? "Suscripción inactiva.")
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return IMPORT_ERROR("No se recibieron filas para importar.")
  }
  if (rows.length > 1500) {
    return IMPORT_ERROR(
      "Máximo 1500 filas por importación. Divide tu archivo."
    )
  }

  const supabase = await createClient()

  // Productos de la org (para hacer match de insumos por nombre)
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name")
    .eq("organization_id", org.id)
  if (productsError) {
    return IMPORT_ERROR(`Error al leer productos: ${productsError.message}`)
  }
  const productMap = new Map(
    (products ?? []).map((p) => [normalizeName(p.name), p.id])
  )

  // Platillos existentes (para omitir duplicados)
  const { data: existingDishes, error: dishesError } = await supabase
    .from("dishes")
    .select("name")
    .eq("organization_id", org.id)
  if (dishesError) {
    return IMPORT_ERROR(`Error al leer platillos: ${dishesError.message}`)
  }
  const existingDishNames = new Set(
    (existingDishes ?? []).map((d) => normalizeName(d.name))
  )

  const errors: { row: number; message: string }[] = []

  // Agrupa filas por platillo (nombre normalizado), en orden de aparición.
  type DishGroup = {
    firstRow: number
    name: string
    salePrice: number | null
    hasRowErrors: boolean
    ingredients: { productId: string; quantity: number }[]
    seenIngredients: Set<string>
    missingIngredients: Set<string>
  }
  const groups = new Map<string, DishGroup>()
  // Insumos faltantes: nombre normalizado → { nombre bonito, platillos }
  const missing = new Map<string, { name: string; dishes: Set<string> }>()

  rows.forEach((row, i) => {
    const rowNum = i + 2 // fila 1 = encabezados; humanos cuentan desde 1
    const dishName = displayName(row.platillo ?? "")
    const dishKey = normalizeName(row.platillo ?? "")
    const ingredientName = displayName(row.insumo ?? "")
    const ingredientKey = normalizeName(row.insumo ?? "")

    if (!dishName) {
      errors.push({ row: rowNum, message: "Platillo vacío" })
      return
    }

    let group = groups.get(dishKey)
    if (!group) {
      group = {
        firstRow: rowNum,
        name: dishName,
        salePrice: null,
        hasRowErrors: false,
        ingredients: [],
        seenIngredients: new Set(),
        missingIngredients: new Set(),
      }
      groups.set(dishKey, group)
    }

    // Precio de venta: se toma el primero no vacío del platillo.
    const priceRaw = (row.precio_venta ?? "").trim()
    if (priceRaw !== "") {
      const price = parseCsvNumber(priceRaw)
      if (!Number.isFinite(price) || price < 0) {
        errors.push({
          row: rowNum,
          message: `Precio de venta "${priceRaw}" no válido en "${dishName}"`,
        })
        group.hasRowErrors = true
      } else if (group.salePrice === null) {
        group.salePrice = price
      }
    }

    if (!ingredientName) {
      errors.push({
        row: rowNum,
        message: `Insumo vacío en "${dishName}"`,
      })
      group.hasRowErrors = true
      return
    }

    if (group.seenIngredients.has(ingredientKey)) {
      errors.push({
        row: rowNum,
        message: `Insumo "${ingredientName}" repetido en "${dishName}"`,
      })
      group.hasRowErrors = true
      return
    }
    group.seenIngredients.add(ingredientKey)

    const quantity = parseCsvNumber(row.cantidad ?? "")
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push({
        row: rowNum,
        message: `Cantidad "${(row.cantidad ?? "").trim()}" no válida para "${ingredientName}" (debe ser un número mayor a 0)`,
      })
      group.hasRowErrors = true
      return
    }

    const productId = productMap.get(ingredientKey)
    if (!productId) {
      group.missingIngredients.add(ingredientKey)
      let entry = missing.get(ingredientKey)
      if (!entry) {
        entry = { name: ingredientName, dishes: new Set() }
        missing.set(ingredientKey, entry)
      }
      entry.dishes.add(dishName)
      return
    }

    group.ingredients.push({ productId, quantity })
  })

  // Decide qué platillos se crean
  let skippedDishes = 0
  const toCreate: DishGroup[] = []

  for (const [dishKey, group] of groups) {
    if (existingDishNames.has(dishKey)) {
      skippedDishes++
      errors.push({
        row: group.firstRow,
        message: `"${group.name}" ya existe, se omite`,
      })
      continue
    }
    if (group.missingIngredients.size > 0) {
      // No se crea: tiene insumos no registrados (se reportan aparte).
      continue
    }
    if (group.hasRowErrors) {
      errors.push({
        row: group.firstRow,
        message: `"${group.name}" no se creó: corrige sus filas con error y vuelve a subir`,
      })
      continue
    }
    if (group.ingredients.length === 0) {
      errors.push({
        row: group.firstRow,
        message: `"${group.name}" no tiene ingredientes válidos, se omite`,
      })
      continue
    }
    toCreate.push(group)
  }

  // Inserta platillo por platillo (dish + sus ingredientes).
  let createdDishes = 0
  for (const group of toCreate) {
    const { data: dish, error: dishError } = await supabase
      .from("dishes")
      .insert({
        organization_id: org.id,
        name: group.name,
        sale_price: group.salePrice,
      })
      .select("id")
      .single()

    if (dishError || !dish) {
      errors.push({
        row: group.firstRow,
        message: `Error al crear "${group.name}": ${dishError?.message ?? "sin datos"}`,
      })
      continue
    }

    const { error: ingredientsError } = await supabase
      .from("dish_ingredients")
      .insert(
        group.ingredients.map((ing) => ({
          dish_id: dish.id,
          product_id: ing.productId,
          quantity: ing.quantity,
        }))
      )

    if (ingredientsError) {
      // Revertimos el platillo para no dejar recetas a medias.
      await supabase
        .from("dishes")
        .delete()
        .eq("id", dish.id)
        .eq("organization_id", org.id)
      errors.push({
        row: group.firstRow,
        message: `Error al guardar ingredientes de "${group.name}": ${ingredientsError.message}`,
      })
      continue
    }

    createdDishes++
  }

  const missingProducts = Array.from(missing.values())
    .map((m) => ({ name: m.name, dishes: Array.from(m.dishes) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))

  const dishesWithMissing = new Set(
    missingProducts.flatMap((m) => m.dishes)
  ).size

  if (createdDishes > 0) {
    revalidatePath("/recetas")
  }

  const parts: string[] = []
  if (createdDishes > 0) {
    parts.push(
      `${createdDishes} ${createdDishes === 1 ? "platillo importado" : "platillos importados"}.`
    )
  }
  if (dishesWithMissing > 0) {
    parts.push(
      `${dishesWithMissing} ${dishesWithMissing === 1 ? "platillo" : "platillos"} sin crear por insumos no registrados.`
    )
  }
  if (skippedDishes > 0) {
    parts.push(
      `${skippedDishes} ${skippedDishes === 1 ? "ya existía" : "ya existían"}, se ${skippedDishes === 1 ? "omitió" : "omitieron"}.`
    )
  }
  if (parts.length === 0) {
    parts.push("Ningún platillo importado. Revisa los errores.")
  }

  return {
    status: "ok",
    createdDishes,
    skippedDishes,
    missingProducts,
    errors,
    message: parts.join(" "),
  }
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
