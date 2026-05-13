import Link from "next/link"
import {
  ArrowRight,
  AlertTriangle,
  Boxes,
  Building2,
  History,
  PackageCheck,
  PackageMinus,
  ArrowRightLeft,
  ShoppingCart,
} from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Tables, Enums } from "@/types/db"

export const metadata = { title: "Dashboard" }

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

const MOVEMENT_LABELS: Record<Enums<"movement_type">, string> = {
  purchase: "Compra",
  sale: "Venta",
  adjustment: "Ajuste",
  waste: "Merma",
  transfer_in: "Entrada (transferencia)",
  transfer_out: "Salida (transferencia)",
}

const MOVEMENT_ICONS: Record<Enums<"movement_type">, typeof PackageCheck> = {
  purchase: ShoppingCart,
  sale: PackageMinus,
  adjustment: PackageCheck,
  waste: PackageMinus,
  transfer_in: ArrowRightLeft,
  transfer_out: ArrowRightLeft,
}

export default async function DashboardPage() {
  const { org } = await requireOrg()
  const supabase = await createClient()

  // Inventario completo de la org para calcular valor por sucursal y bajo mínimo
  const [inventoryRes, locationsRes, productsRes, movementsRes] =
    await Promise.all([
      supabase
        .from("inventory")
        .select("location_id, product_id, quantity, average_cost")
        .eq("organization_id", org.id),
      supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, base_unit, min_stock")
        .eq("organization_id", org.id)
        .eq("is_active", true),
      supabase
        .from("inventory_movements")
        .select(
          "id, type, quantity, unit_cost, created_at, location:locations(id, name), product:products(id, name, base_unit)"
        )
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ])

  const inventory = inventoryRes.data ?? []
  const locations = locationsRes.data ?? []
  const products = productsRes.data ?? []
  const movements = movementsRes.data ?? []

  // Valor por sucursal
  const valueByLocation = new Map<string, number>()
  let totalValue = 0
  for (const row of inventory) {
    const value = Number(row.quantity ?? 0) * Number(row.average_cost ?? 0)
    valueByLocation.set(
      row.location_id,
      (valueByLocation.get(row.location_id) ?? 0) + value
    )
    totalValue += value
  }

  // Productos bajo mínimo: comparar por (location, product) — un producto puede
  // estar OK en una sucursal y bajo mínimo en otra. Listamos las combinaciones.
  const productById = new Map(products.map((p) => [p.id, p]))
  const locationById = new Map(locations.map((l) => [l.id, l.name]))
  const inventoryByPair = new Map<
    string,
    { qty: number; productId: string; locationId: string }
  >()
  for (const r of inventory) {
    inventoryByPair.set(`${r.location_id}:${r.product_id}`, {
      qty: Number(r.quantity ?? 0),
      productId: r.product_id,
      locationId: r.location_id,
    })
  }

  type BelowMin = {
    product: Pick<Tables<"products">, "id" | "name" | "base_unit" | "min_stock">
    locationName: string
    locationId: string
    qty: number
  }
  const belowMin: BelowMin[] = []
  for (const p of products) {
    const min = Number(p.min_stock ?? 0)
    if (min <= 0) continue
    for (const l of locations) {
      const key = `${l.id}:${p.id}`
      const row = inventoryByPair.get(key)
      const qty = row?.qty ?? 0
      if (qty < min) {
        belowMin.push({
          product: p,
          locationName: l.name,
          locationId: l.id,
          qty,
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Vista general de ${org.name}.`}
        action={
          <ExportCsvButton
            endpoint="/api/export/movements"
            label="Exportar movimientos"
            withDateRange
            description="Exporta la bitácora completa de movimientos por rango de fechas."
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              Valor total de inventario
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {currency.format(totalValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Suma de stock × costo promedio ponderado en todas las sucursales activas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Sucursales activas
            </CardDescription>
            <CardTitle className="text-2xl">{locations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {locations.slice(0, 4).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-muted-foreground">
                    {l.name}
                  </span>
                  <span className="tabular-nums">
                    {currency.format(valueByLocation.get(l.id) ?? 0)}
                  </span>
                </li>
              ))}
              {locations.length > 4 && (
                <li className="text-xs text-muted-foreground">
                  +{locations.length - 4} más
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Bajo mínimo
            </CardDescription>
            <CardTitle className="text-2xl">{belowMin.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {belowMin.length === 0
                ? "Todos los productos por encima de su stock mínimo."
                : "Combinaciones producto × sucursal por debajo del mínimo."}
            </p>
            {belowMin.length > 0 && (
              <Link
                href="/inventario"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver inventario <ArrowRight className="size-3" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {belowMin.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos bajo mínimo</CardTitle>
            <CardDescription>
              Atiende estos para evitar quiebres de stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {belowMin.slice(0, 10).map((b) => (
                <li
                  key={`${b.locationId}:${b.product.id}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/inventario?location=${b.locationId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {b.product.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {b.locationName}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums">
                      {number.format(b.qty)} {b.product.base_unit}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      mín. {number.format(Number(b.product.min_stock ?? 0))}{" "}
                      {b.product.base_unit}
                    </p>
                  </div>
                </li>
              ))}
              {belowMin.length > 10 && (
                <li className="pt-2 text-xs text-muted-foreground">
                  +{belowMin.length - 10} combinaciones más en bajo mínimo.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            Últimos movimientos
          </CardTitle>
          <CardDescription>
            Bitácora de los 20 movimientos más recientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              Sin movimientos todavía. Registra una compra o ajuste para
              empezar.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {movements.map((m) => {
                const Icon = MOVEMENT_ICONS[m.type!]
                const qty = Number(m.quantity ?? 0)
                const isIn = qty > 0
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                          isIn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {m.product?.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {MOVEMENT_LABELS[m.type!]} ·{" "}
                          {m.location?.name ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm tabular-nums ${
                          isIn ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {isIn ? "+" : ""}
                        {number.format(qty)} {m.product?.base_unit ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateTimeFmt.format(new Date(m.created_at!))}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
