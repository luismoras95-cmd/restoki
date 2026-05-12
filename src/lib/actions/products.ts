"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const BASE_UNITS = ["kg", "g", "l", "ml", "pieza"] as const

const ProductSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  default_supplier_id: z.string().uuid().optional().or(z.literal("")),
  base_unit: z.enum(BASE_UNITS),
  purchase_unit: z.string().trim().max(40).optional().or(z.literal("")),
  units_per_purchase: z
    .number()
    .positive("El factor debe ser positivo")
    .optional()
    .or(z.literal(0))
    .or(z.nan()),
  min_stock: z.number().min(0).optional().or(z.nan()),
})

export type ProductActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

function parseNumber(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return NaN
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function parse(formData: FormData) {
  return ProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") ?? "",
    category_id: formData.get("category_id") ?? "",
    default_supplier_id: formData.get("default_supplier_id") ?? "",
    base_unit: formData.get("base_unit") ?? "pieza",
    purchase_unit: formData.get("purchase_unit") ?? "",
    units_per_purchase: parseNumber(formData.get("units_per_purchase")),
    min_stock: parseNumber(formData.get("min_stock")),
  })
}

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para crear productos." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const data = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from("products").insert({
    organization_id: org.id,
    name: data.name,
    sku: data.sku || null,
    category_id: data.category_id || null,
    default_supplier_id: data.default_supplier_id || null,
    base_unit: data.base_unit,
    purchase_unit: data.purchase_unit || null,
    units_per_purchase:
      Number.isFinite(data.units_per_purchase) && data.units_per_purchase! > 0
        ? data.units_per_purchase
        : null,
    min_stock: Number.isFinite(data.min_stock) ? data.min_stock : 0,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath("/productos")
  revalidatePath("/inventario")
  return { status: "success", message: "Producto creado." }
}

export async function updateProduct(
  id: string,
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para editar productos." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const data = parsed.data
  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      sku: data.sku || null,
      category_id: data.category_id || null,
      default_supplier_id: data.default_supplier_id || null,
      base_unit: data.base_unit,
      purchase_unit: data.purchase_unit || null,
      units_per_purchase:
        Number.isFinite(data.units_per_purchase) && data.units_per_purchase! > 0
          ? data.units_per_purchase
          : null,
      min_stock: Number.isFinite(data.min_stock) ? data.min_stock : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) return { status: "error", message: error.message }

  revalidatePath("/productos")
  revalidatePath("/inventario")
  return { status: "success", message: "Cambios guardados." }
}

export async function toggleProductActive(id: string, isActive: boolean) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para editar productos.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/productos")
  revalidatePath("/inventario")
}
