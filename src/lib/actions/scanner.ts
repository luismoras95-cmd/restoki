"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const BarcodeSchema = z
  .string()
  .trim()
  .min(2, "El código es muy corto")
  .max(64, "El código es muy largo")

const OPERATOR_ROLES = new Set(["owner", "admin", "manager", "staff"])
const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export type LookupResult =
  | {
      status: "found"
      product: {
        id: string
        name: string
        sku: string | null
        base_unit: string
        barcode: string
      }
    }
  | { status: "not_found"; barcode: string }
  | { status: "error"; message: string }

export async function lookupByBarcode(rawCode: string): Promise<LookupResult> {
  const { org } = await requireOrg()
  if (!OPERATOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = BarcodeSchema.safeParse(rawCode)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Código inválido",
    }
  }

  const code = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, base_unit, barcode")
    .eq("organization_id", org.id)
    .eq("barcode", code)
    .eq("is_active", true)
    .maybeSingle()

  if (error) return { status: "error", message: error.message }

  if (!data) return { status: "not_found", barcode: code }

  return {
    status: "found",
    product: {
      id: data.id,
      name: data.name,
      sku: data.sku,
      base_unit: data.base_unit,
      barcode: data.barcode!,
    },
  }
}

export async function associateBarcode(productId: string, rawCode: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para asociar códigos.")
  }

  const parsed = BarcodeSchema.safeParse(rawCode)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Código inválido")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({
      barcode: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("organization_id", org.id)

  if (error) throw new Error(error.message)

  revalidatePath("/escaner")
  revalidatePath("/productos")
}

const ScanAddSchema = z.object({
  product_id: z.string().uuid("Producto inválido"),
  location_id: z.string().uuid("Sucursal inválida"),
  quantity: z
    .number()
    .refine((n) => Number.isFinite(n) && n !== 0, {
      message: "La cantidad no puede ser cero",
    }),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
})

export async function scanAddToInventory(args: {
  product_id: string
  location_id: string
  quantity: number
  notes?: string
}) {
  const { org } = await requireOrg()
  if (!OPERATOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const parsed = ScanAddSchema.safeParse(args)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("apply_inventory_movement", {
    p_location_id: parsed.data.location_id,
    p_product_id: parsed.data.product_id,
    p_type: "adjustment",
    p_quantity: parsed.data.quantity,
    p_notes: parsed.data.notes || "Escaneo",
  })

  if (error) throw new Error(error.message)

  revalidatePath("/escaner")
  revalidatePath("/inventario")
  revalidatePath("/dashboard")
  void org
}

export async function createProductFromScan(args: {
  name: string
  base_unit: string
  barcode: string
}) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear productos.")
  }

  const NameSchema = z.string().trim().min(2).max(120)
  const UnitSchema = z.enum(["kg", "g", "l", "ml", "pieza"])
  const parsedName = NameSchema.safeParse(args.name)
  const parsedUnit = UnitSchema.safeParse(args.base_unit)
  const parsedBarcode = BarcodeSchema.safeParse(args.barcode)

  if (!parsedName.success) throw new Error("Nombre inválido (2-120 chars).")
  if (!parsedUnit.success) throw new Error("Unidad base inválida.")
  if (!parsedBarcode.success) throw new Error("Código inválido.")

  const supabase = await createClient()

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
  const sku = `P-${String((count ?? 0) + 1).padStart(4, "0")}`

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: org.id,
      name: parsedName.data,
      base_unit: parsedUnit.data,
      barcode: parsedBarcode.data,
      sku,
      min_stock: 0,
    })
    .select("id, name, base_unit, barcode, sku")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/escaner")
  revalidatePath("/productos")
  return data
}
