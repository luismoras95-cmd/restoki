"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getSubscriptionAccess, requireOrg } from "@/lib/auth"
import type { TablesInsert } from "@/types/db"

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
  default_cost: z.number().min(0).optional().or(z.nan()),
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
    default_cost: parseNumber(formData.get("default_cost")),
  })
}

async function nextAutoSku(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<string> {
  // Estrategia: contar productos de la org y usar count + 1 con padding.
  // Si colisiona con un SKU manual existente, reintenta hasta 5 veces.
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)

  let n = (count ?? 0) + 1
  for (let attempt = 0; attempt < 5; attempt++) {
    const sku = `P-${String(n).padStart(4, "0")}`
    const { data: exists } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", orgId)
      .eq("sku", sku)
      .maybeSingle()
    if (!exists) return sku
    n++
  }
  // Fallback: timestamp si por alguna razón no encontramos hueco
  return `P-${Date.now().toString(36).toUpperCase()}`
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
  const sku = data.sku && data.sku.trim() !== ""
    ? data.sku
    : await nextAutoSku(supabase, org.id)

  const insertRow = {
    organization_id: org.id,
    name: data.name,
    sku,
    category_id: data.category_id || null,
    default_supplier_id: data.default_supplier_id || null,
    base_unit: data.base_unit,
    purchase_unit: data.purchase_unit || null,
    units_per_purchase:
      Number.isFinite(data.units_per_purchase) && data.units_per_purchase! > 0
        ? data.units_per_purchase
        : null,
    min_stock: Number.isFinite(data.min_stock) ? data.min_stock : 0,
    default_cost: Number.isFinite(data.default_cost)
      ? data.default_cost
      : null,
  }

  const { error } = await supabase.from("products").insert(insertRow)

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
  const updateRow = {
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
    default_cost: Number.isFinite(data.default_cost)
      ? data.default_cost
      : null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from("products")
    .update(updateRow)
    .eq("id", id)
    .eq("organization_id", org.id)

  if (error) return { status: "error", message: error.message }

  revalidatePath("/productos")
  revalidatePath("/inventario")
  return { status: "success", message: "Cambios guardados." }
}

// ============================================================
// Importación masiva desde CSV/Excel
// ============================================================

export type ImportProductRow = {
  nombre: string
  unidad_base: string
  categoria?: string
  costo_estimado?: number | null
  stock_minimo?: number | null
  unidad_compra?: string
  unidades_por_compra?: number | null
  codigo_barras?: string
  sku?: string
}

export type ImportResult = {
  status: "ok" | "error"
  created: number
  skipped: number
  errors: { row: number; message: string }[]
  message: string
}

const UNIT_ALIASES: Record<string, (typeof BASE_UNITS)[number]> = {
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  g: "g",
  gr: "g",
  gramo: "g",
  gramos: "g",
  l: "l",
  lt: "l",
  litro: "l",
  litros: "l",
  ml: "ml",
  mililitro: "ml",
  mililitros: "ml",
  pieza: "pieza",
  piezas: "pieza",
  pza: "pieza",
  pz: "pieza",
  unidad: "pieza",
  pieces: "pieza",
}

function normalizeUnit(raw: string): (typeof BASE_UNITS)[number] | null {
  const key = raw.trim().toLowerCase()
  return UNIT_ALIASES[key] ?? null
}

export async function importProducts(
  rows: ImportProductRow[]
): Promise<ImportResult> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return {
      status: "error",
      created: 0,
      skipped: 0,
      errors: [],
      message: "Sin permiso para importar productos.",
    }
  }

  const access = await getSubscriptionAccess()
  if (!access.canWrite) {
    return {
      status: "error",
      created: 0,
      skipped: 0,
      errors: [],
      message: access.reason ?? "Suscripción inactiva.",
    }
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      status: "error",
      created: 0,
      skipped: 0,
      errors: [],
      message: "No se recibieron filas para importar.",
    }
  }

  if (rows.length > 1000) {
    return {
      status: "error",
      created: 0,
      skipped: 0,
      errors: [],
      message: "Máximo 1000 productos por importación. Divide tu archivo.",
    }
  }

  const supabase = await createClient()

  // Mapa de categorías existentes (nombre normalizado → id)
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", org.id)
  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  )

  // SKUs y nombres existentes para evitar duplicados
  const { data: existing } = await supabase
    .from("products")
    .select("name, sku")
    .eq("organization_id", org.id)
  const existingNames = new Set(
    (existing ?? []).map((p) => p.name.trim().toLowerCase())
  )
  const existingSkus = new Set(
    (existing ?? []).map((p) => (p.sku ?? "").trim().toLowerCase()).filter(Boolean)
  )

  const errors: { row: number; message: string }[] = []
  const toInsert: TablesInsert<"products">[] = []
  let autoSkuCounter = (existing?.length ?? 0) + 1

  rows.forEach((row, i) => {
    const rowNum = i + 2 // +2 porque fila 1 es header y los humanos cuentan desde 1
    const name = (row.nombre ?? "").trim()

    if (!name || name.length < 2) {
      errors.push({ row: rowNum, message: "Nombre vacío o muy corto" })
      return
    }
    if (existingNames.has(name.toLowerCase())) {
      errors.push({ row: rowNum, message: `"${name}" ya existe, se omite` })
      return
    }

    const unit = normalizeUnit(row.unidad_base ?? "")
    if (!unit) {
      errors.push({
        row: rowNum,
        message: `Unidad "${row.unidad_base}" no válida (usa kg, g, l, ml o pieza)`,
      })
      return
    }

    // SKU: usar el del archivo o autogenerar
    let sku = (row.sku ?? "").trim()
    if (sku && existingSkus.has(sku.toLowerCase())) {
      errors.push({ row: rowNum, message: `SKU "${sku}" duplicado, se omite` })
      return
    }
    if (!sku) {
      sku = `P-${String(autoSkuCounter).padStart(4, "0")}`
      autoSkuCounter++
    }

    // Categoría: match por nombre si viene
    let categoryId: string | null = null
    if (row.categoria && row.categoria.trim()) {
      categoryId = categoryMap.get(row.categoria.trim().toLowerCase()) ?? null
    }

    const cost =
      row.costo_estimado != null && Number.isFinite(row.costo_estimado)
        ? Number(row.costo_estimado)
        : null
    const minStock =
      row.stock_minimo != null && Number.isFinite(row.stock_minimo)
        ? Number(row.stock_minimo)
        : 0
    const unitsPerPurchase =
      row.unidades_por_compra != null &&
      Number.isFinite(row.unidades_por_compra) &&
      Number(row.unidades_por_compra) > 0
        ? Number(row.unidades_por_compra)
        : null

    // Marca nombre/sku como usados para detectar duplicados DENTRO del archivo
    existingNames.add(name.toLowerCase())
    existingSkus.add(sku.toLowerCase())

    toInsert.push({
      organization_id: org.id,
      name,
      sku,
      base_unit: unit,
      category_id: categoryId,
      default_cost: cost,
      min_stock: minStock,
      purchase_unit: (row.unidad_compra ?? "").trim() || null,
      units_per_purchase: unitsPerPurchase,
      barcode: (row.codigo_barras ?? "").trim() || null,
    })
  })

  let created = 0
  if (toInsert.length > 0) {
    // Insertar en lotes de 200 para no exceder límites
    for (let i = 0; i < toInsert.length; i += 200) {
      const batch = toInsert.slice(i, i + 200)
      const { error } = await supabase.from("products").insert(batch)
      if (error) {
        return {
          status: "error",
          created,
          skipped: errors.length,
          errors,
          message: `Error al insertar: ${error.message}`,
        }
      }
      created += batch.length
    }
  }

  revalidatePath("/productos")
  revalidatePath("/inventario")

  return {
    status: "ok",
    created,
    skipped: errors.length,
    errors,
    message:
      created > 0
        ? `${created} productos importados.${errors.length > 0 ? ` ${errors.length} omitidos (ver detalle).` : ""}`
        : "Ningún producto importado. Revisa los errores.",
  }
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
