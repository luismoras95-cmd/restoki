import { NextResponse, type NextRequest } from "next/server"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { csvResponse, toCSV, todayStamp } from "@/lib/csv"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
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
    .from("purchase_orders")
    .select(
      "id, status, total, notes, received_at, created_at, location:locations(id, name), supplier:suppliers(id, name)"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })

  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`)

  const { data: pos, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // También sacamos las líneas para una segunda sección detallada
  const poIds = (pos ?? []).map((p) => p.id)
  const itemsRes =
    poIds.length > 0
      ? await supabase
          .from("purchase_order_items")
          .select(
            "purchase_order_id, quantity, unit_cost, subtotal, product:products(id, name, sku, base_unit)"
          )
          .in("purchase_order_id", poIds)
      : { data: [], error: null }

  const items = itemsRes.data ?? []

  const headers = [
    "ID corto",
    "Fecha creación",
    "Estado",
    "Sucursal",
    "Proveedor",
    "Total",
    "Recibida en",
    "Notas",
    "Producto",
    "SKU",
    "Cantidad",
    "Unidad",
    "Costo unitario",
    "Subtotal línea",
  ]

  // Si una PO no tiene líneas, igual aparece una fila vacía con sus datos.
  const rows: unknown[][] = []
  for (const po of pos ?? []) {
    const lines = items.filter((i) => i.purchase_order_id === po.id)
    if (lines.length === 0) {
      rows.push([
        po.id.slice(0, 8),
        po.created_at ?? "",
        STATUS_LABELS[po.status!] ?? po.status,
        po.location?.name ?? "",
        po.supplier?.name ?? "",
        Number(po.total ?? 0),
        po.received_at ?? "",
        po.notes ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    } else {
      for (const line of lines) {
        rows.push([
          po.id.slice(0, 8),
          po.created_at ?? "",
          STATUS_LABELS[po.status!] ?? po.status,
          po.location?.name ?? "",
          po.supplier?.name ?? "",
          Number(po.total ?? 0),
          po.received_at ?? "",
          po.notes ?? "",
          line.product?.name ?? "",
          line.product?.sku ?? "",
          Number(line.quantity ?? 0),
          line.product?.base_unit ?? "",
          Number(line.unit_cost ?? 0),
          Number(line.subtotal ?? 0),
        ])
      }
    }
  }

  const csv = toCSV(headers, rows)
  const range =
    from && to ? `${from}_a_${to}` : from ? `desde-${from}` : todayStamp()
  return csvResponse(`restoki-compras-${range}.csv`, csv)
}
