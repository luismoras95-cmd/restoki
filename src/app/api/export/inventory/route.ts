import { NextResponse } from "next/server"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { csvResponse, toCSV, todayStamp } from "@/lib/csv"

export async function GET() {
  const { org } = await requireOrg()
  const supabase = await createClient()

  const [productsRes, locationsRes, inventoryRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, base_unit, min_stock, is_active")
      .eq("organization_id", org.id),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id),
    supabase
      .from("inventory")
      .select("location_id, product_id, quantity, average_cost")
      .eq("organization_id", org.id),
  ])

  if (productsRes.error || locationsRes.error || inventoryRes.error) {
    return NextResponse.json(
      { error: "No se pudo generar el reporte." },
      { status: 500 }
    )
  }

  const products = productsRes.data ?? []
  const locations = locationsRes.data ?? []
  const inventory = inventoryRes.data ?? []

  const productById = new Map(products.map((p) => [p.id, p]))
  const locationById = new Map(locations.map((l) => [l.id, l.name]))

  const headers = [
    "SKU",
    "Producto",
    "Sucursal",
    "Unidad base",
    "Stock",
    "Stock mínimo",
    "Costo promedio",
    "Valor",
    "Producto activo",
  ]

  const rows = inventory
    .map((row) => {
      const p = productById.get(row.product_id)
      if (!p) return null
      const qty = Number(row.quantity ?? 0)
      const cost = Number(row.average_cost ?? 0)
      return [
        p.sku ?? "",
        p.name,
        locationById.get(row.location_id) ?? "",
        p.base_unit,
        qty,
        Number(p.min_stock ?? 0),
        cost,
        qty * cost,
        p.is_active ? "Sí" : "No",
      ] as const
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const csv = toCSV(headers, rows)
  return csvResponse(`restoki-inventario-${todayStamp()}.csv`, csv)
}
