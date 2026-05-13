import { NextResponse, type NextRequest } from "next/server"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { csvResponse, toCSV, todayStamp } from "@/lib/csv"
import type { Enums } from "@/types/db"

const MOVEMENT_LABELS: Record<Enums<"movement_type">, string> = {
  purchase: "Compra",
  sale: "Venta",
  adjustment: "Ajuste",
  waste: "Merma",
  transfer_in: "Entrada transferencia",
  transfer_out: "Salida transferencia",
}

export async function GET(request: NextRequest) {
  const { org } = await requireOrg()
  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const supabase = await createClient()
  let query = supabase
    .from("inventory_movements")
    .select(
      "id, type, quantity, unit_cost, notes, reference_id, created_at, location:locations(id, name), product:products(id, name, sku, base_unit)"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5000)

  if (from) query = query.gte("created_at", from)
  if (to) {
    // Inclusivo del día completo: sumamos 23:59:59
    query = query.lte("created_at", `${to}T23:59:59.999Z`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    "Fecha",
    "Tipo",
    "Producto",
    "SKU",
    "Sucursal",
    "Cantidad",
    "Unidad",
    "Costo unitario",
    "Valor",
    "Notas",
    "Ref ID",
  ]

  const rows = (data ?? []).map((m) => {
    const qty = Number(m.quantity ?? 0)
    const cost = Number(m.unit_cost ?? 0)
    return [
      m.created_at ?? "",
      MOVEMENT_LABELS[m.type!] ?? m.type,
      m.product?.name ?? "",
      m.product?.sku ?? "",
      m.location?.name ?? "",
      qty,
      m.product?.base_unit ?? "",
      m.unit_cost != null ? cost : "",
      m.unit_cost != null ? qty * cost : "",
      m.notes ?? "",
      m.reference_id ?? "",
    ] as const
  })

  const csv = toCSV(headers, rows)
  const range =
    from && to ? `${from}_a_${to}` : from ? `desde-${from}` : todayStamp()
  return csvResponse(`restoki-movimientos-${range}.csv`, csv)
}
