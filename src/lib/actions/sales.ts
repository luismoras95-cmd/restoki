"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

// ============================================================
// Tipos compartidos con los componentes de /ventas
// ============================================================

/** Fila cruda que viene del CSV del punto de venta. */
export type SalesCsvRow = {
  name: string
  qty: number
}

/** Platillo del CSV que sí existe en Recetas. */
export type MatchedDish = {
  dish_id: string
  /** Nombre oficial del platillo en Restoki. */
  name: string
  qty: number
  /** false = el platillo no tiene ingredientes → no descontará insumos. */
  has_recipe: boolean
}

export type SalesPreviewResult =
  | { status: "error"; message: string }
  | {
      status: "ok"
      matched: MatchedDish[]
      unmatched: { name: string; qty: number }[]
    }

/** Renglón de auditoría por insumo, como lo devuelve apply_sales_report. */
export type SalesAuditItem = {
  product_id: string
  name: string
  unit: string
  before: number
  consumed: number
  after: number
  deficit: boolean
}

export type SalesAuditSummary = {
  items: SalesAuditItem[]
  deficit_count: number
  total_dishes_sold: number
}

export type ApplySalesResult =
  | { status: "error"; message: string }
  | { status: "ok"; report_id: string; audit: SalesAuditSummary }

// ============================================================
// Helpers
// ============================================================

/**
 * Normaliza nombres de platillo para el match CSV ↔ Recetas:
 * trim, minúsculas, espacios colapsados y sin acentos.
 */
function normalizeDishName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

const CsvRowsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(200),
      qty: z.number().positive().finite(),
    })
  )
  .min(1, "El archivo no tiene filas válidas.")
  .max(2000, "Máximo 2000 filas por carga.")

const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .nullable()
  .optional()

const ApplySchema = z
  .object({
    location_id: z.string().uuid("Selecciona la sucursal."),
    label: z
      .string()
      .trim()
      .min(1, "Escribe la etiqueta del periodo (ej. 'Semana 24').")
      .max(120, "La etiqueta es demasiado larga."),
    period_start: DateSchema,
    period_end: DateSchema,
    items: z
      .array(
        z.object({
          dish_id: z.string().uuid(),
          dish_name: z.string().trim().min(1).max(200),
          quantity: z.number().positive().finite(),
        })
      )
      .min(1, "No hay platillos con receta para aplicar.")
      .max(2000, "Máximo 2000 platillos por reporte."),
  })
  .refine(
    (v) =>
      !v.period_start || !v.period_end || v.period_end >= v.period_start,
    { message: "La fecha fin no puede ser antes de la fecha inicio." }
  )

export type ApplySalesInput = z.infer<typeof ApplySchema>

function parseAudit(data: unknown): SalesAuditSummary | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.items)) return null
  return {
    items: (obj.items as SalesAuditItem[]).map((it) => ({
      product_id: String(it.product_id),
      name: String(it.name),
      unit: String(it.unit),
      before: Number(it.before),
      consumed: Number(it.consumed),
      after: Number(it.after),
      deficit: Boolean(it.deficit),
    })),
    deficit_count: Number(obj.deficit_count ?? 0),
    total_dishes_sold: Number(obj.total_dishes_sold ?? 0),
  }
}

// ============================================================
// Preview: match de platillos del CSV contra Recetas
// ============================================================

export async function previewSalesReport(
  rows: SalesCsvRow[]
): Promise<SalesPreviewResult> {
  const { org } = await requireOrg()

  const parsed = CsvRowsSchema.safeParse(rows)
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "El archivo tiene datos inválidos.",
    }
  }

  // Agrega cantidades por nombre normalizado (el POS puede repetir platillos).
  const aggregated = new Map<string, { name: string; qty: number }>()
  for (const row of parsed.data) {
    const key = normalizeDishName(row.name)
    const prev = aggregated.get(key)
    if (prev) {
      prev.qty += row.qty
    } else {
      aggregated.set(key, { name: row.name.trim(), qty: row.qty })
    }
  }

  const supabase = await createClient()
  const { data: dishes, error } = await supabase
    .from("dishes")
    .select("id, name")
    .eq("organization_id", org.id)

  if (error) {
    return { status: "error", message: error.message }
  }

  // Nombre normalizado → dish (el primero gana si hay duplicados).
  const dishByName = new Map<string, { id: string; name: string }>()
  for (const dish of dishes ?? []) {
    const key = normalizeDishName(dish.name)
    if (!dishByName.has(key)) dishByName.set(key, dish)
  }

  const matched: MatchedDish[] = []
  const unmatched: { name: string; qty: number }[] = []

  for (const [key, row] of aggregated) {
    const dish = dishByName.get(key)
    if (dish) {
      matched.push({
        dish_id: dish.id,
        name: dish.name,
        qty: row.qty,
        has_recipe: false, // se completa abajo
      })
    } else {
      unmatched.push(row)
    }
  }

  // ¿Cuáles platillos matched tienen receta (dish_ingredients)?
  if (matched.length > 0) {
    const { data: ingredients, error: ingError } = await supabase
      .from("dish_ingredients")
      .select("dish_id")
      .in(
        "dish_id",
        matched.map((m) => m.dish_id)
      )

    if (ingError) {
      return { status: "error", message: ingError.message }
    }

    const withRecipe = new Set((ingredients ?? []).map((i) => i.dish_id))
    for (const m of matched) {
      m.has_recipe = withRecipe.has(m.dish_id)
    }
  }

  matched.sort((a, b) => a.name.localeCompare(b.name, "es"))
  unmatched.sort((a, b) => a.name.localeCompare(b.name, "es"))

  return { status: "ok", matched, unmatched }
}

// ============================================================
// Aplicar: crea el reporte + items y ejecuta apply_sales_report
// ============================================================

export async function applySalesReport(
  input: ApplySalesInput
): Promise<ApplySalesResult> {
  const { org, user } = await requireOrg()

  const parsed = ApplySchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    }
  }
  const { location_id, label, period_start, period_end, items } = parsed.data

  const supabase = await createClient()

  // Defensa extra: los platillos deben pertenecer a la org actual.
  const dishIds = [...new Set(items.map((i) => i.dish_id))]
  const { data: orgDishes, error: dishError } = await supabase
    .from("dishes")
    .select("id")
    .eq("organization_id", org.id)
    .in("id", dishIds)

  if (dishError) {
    return { status: "error", message: dishError.message }
  }
  if ((orgDishes ?? []).length !== dishIds.length) {
    return {
      status: "error",
      message:
        "Algunos platillos ya no existen en Recetas. Vuelve a subir el archivo.",
    }
  }

  // 1. Encabezado del reporte (pending). RLS valida acceso a la sucursal.
  const { data: report, error: reportError } = await supabase
    .from("sales_reports")
    .insert({
      organization_id: org.id,
      location_id,
      label,
      period_start: period_start ?? null,
      period_end: period_end ?? null,
      user_id: user.id,
    })
    .select("id")
    .single()

  if (reportError || !report) {
    return {
      status: "error",
      message:
        reportError?.message ??
        "No se pudo crear el reporte. ¿Tienes acceso a esa sucursal?",
    }
  }

  // Si algo falla después de aquí, borramos el reporte para no dejarlo
  // colgado en 'pending' (el cascade elimina también los items).
  async function rollback() {
    await supabase.from("sales_reports").delete().eq("id", report!.id)
  }

  // 2. Items (platillo × cantidad vendida)
  const { error: itemsError } = await supabase.from("sales_report_items").insert(
    items.map((i) => ({
      report_id: report.id,
      dish_id: i.dish_id,
      dish_name: i.dish_name,
      quantity: i.quantity,
    }))
  )

  if (itemsError) {
    await rollback()
    return { status: "error", message: itemsError.message }
  }

  // 3. RPC: descuenta insumos y devuelve la auditoría
  const { data: auditData, error: rpcError } = await supabase.rpc(
    "apply_sales_report",
    { p_report_id: report.id }
  )

  if (rpcError) {
    await rollback()
    return { status: "error", message: rpcError.message }
  }

  const audit = parseAudit(auditData)
  if (!audit) {
    // El RPC aplicó pero devolvió algo inesperado; no revertimos inventario,
    // solo avisamos. La auditoría quedó guardada en el reporte.
    revalidatePath("/ventas")
    revalidatePath("/inventario")
    revalidatePath("/dashboard")
    return {
      status: "ok",
      report_id: report.id,
      audit: { items: [], deficit_count: 0, total_dishes_sold: 0 },
    }
  }

  revalidatePath("/ventas")
  revalidatePath("/inventario")
  revalidatePath("/dashboard")

  return { status: "ok", report_id: report.id, audit }
}
