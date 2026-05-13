import { NextResponse, type NextRequest } from "next/server"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { csvResponse, toCSV, todayStamp } from "@/lib/csv"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  in_transit: "En tránsito",
  received: "Recibida",
  cancelled: "Cancelada",
}

export async function GET(request: NextRequest) {
  const { org } = await requireOrg()
  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const supabase = await createClient()
  let query = supabase
    .from("transfers")
    .select(
      "id, status, notes, shipped_at, received_at, created_at, from_location:locations!from_location_id(id, name), to_location:locations!to_location_id(id, name)"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })

  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`)

  const { data: transfers, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transferIds = (transfers ?? []).map((t) => t.id)
  const itemsRes =
    transferIds.length > 0
      ? await supabase
          .from("transfer_items")
          .select(
            "transfer_id, quantity, unit_cost, product:products(id, name, sku, base_unit)"
          )
          .in("transfer_id", transferIds)
      : { data: [], error: null }

  const items = itemsRes.data ?? []

  const headers = [
    "ID corto",
    "Fecha creación",
    "Estado",
    "Origen",
    "Destino",
    "Enviada en",
    "Recibida en",
    "Notas",
    "Producto",
    "SKU",
    "Cantidad",
    "Unidad",
    "Costo unit. (al envío)",
    "Valor línea",
  ]

  const rows: unknown[][] = []
  for (const t of transfers ?? []) {
    const lines = items.filter((i) => i.transfer_id === t.id)
    if (lines.length === 0) {
      rows.push([
        t.id.slice(0, 8),
        t.created_at ?? "",
        STATUS_LABELS[t.status!] ?? t.status,
        t.from_location?.name ?? "",
        t.to_location?.name ?? "",
        t.shipped_at ?? "",
        t.received_at ?? "",
        t.notes ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    } else {
      for (const line of lines) {
        const qty = Number(line.quantity ?? 0)
        const cost = Number(line.unit_cost ?? 0)
        rows.push([
          t.id.slice(0, 8),
          t.created_at ?? "",
          STATUS_LABELS[t.status!] ?? t.status,
          t.from_location?.name ?? "",
          t.to_location?.name ?? "",
          t.shipped_at ?? "",
          t.received_at ?? "",
          t.notes ?? "",
          line.product?.name ?? "",
          line.product?.sku ?? "",
          qty,
          line.product?.base_unit ?? "",
          line.unit_cost != null ? cost : "",
          line.unit_cost != null ? qty * cost : "",
        ])
      }
    }
  }

  const csv = toCSV(headers, rows)
  const range =
    from && to ? `${from}_a_${to}` : from ? `desde-${from}` : todayStamp()
  return csvResponse(`restoki-transferencias-${range}.csv`, csv)
}
