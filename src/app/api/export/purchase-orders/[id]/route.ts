import { NextResponse, type NextRequest } from "next/server"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { csvResponse, toCSV } from "@/lib/csv"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { org } = await requireOrg()
  const { id } = await params
  const supabase = await createClient()

  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "id, status, total, notes, received_at, created_at, location:locations(name), supplier:suppliers(name, contact_name, phone, email)"
      )
      .eq("id", id)
      .eq("organization_id", org.id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select(
        "quantity, unit_cost, subtotal, product:products(name, sku, base_unit)"
      )
      .eq("purchase_order_id", id),
  ])

  if (poRes.error || !poRes.data) {
    return NextResponse.json(
      { error: "Orden no encontrada." },
      { status: 404 }
    )
  }

  const po = poRes.data
  const items = itemsRes.data ?? []

  const summaryHeaders = ["Campo", "Valor"]
  const summaryRows: unknown[][] = [
    ["Folio", po.id.slice(0, 8)],
    ["Fecha creación", po.created_at ?? ""],
    ["Estado", STATUS_LABELS[po.status!] ?? po.status],
    ["Sucursal destino", po.location?.name ?? ""],
    ["Proveedor", po.supplier?.name ?? ""],
    ["Contacto proveedor", po.supplier?.contact_name ?? ""],
    ["Teléfono proveedor", po.supplier?.phone ?? ""],
    ["Email proveedor", po.supplier?.email ?? ""],
    ["Recibida en", po.received_at ?? ""],
    ["Notas", po.notes ?? ""],
    ["Total final", Number(po.total ?? 0)],
  ]

  const itemHeaders = [
    "Producto",
    "SKU",
    "Cantidad",
    "Unidad",
    "Costo unitario",
    "Subtotal",
  ]
  const itemRows = items.map((it) => [
    it.product?.name ?? "",
    it.product?.sku ?? "",
    Number(it.quantity ?? 0),
    it.product?.base_unit ?? "",
    Number(it.unit_cost ?? 0),
    Number(it.subtotal ?? 0),
  ])

  const csv =
    toCSV(summaryHeaders, summaryRows) +
    "\r\n\r\n" +
    toCSV(itemHeaders, itemRows)

  return csvResponse(`restoki-PO-${po.id.slice(0, 8)}.csv`, csv)
}
