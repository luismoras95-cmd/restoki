import { Package } from "lucide-react"
import Link from "next/link"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import {
  InventoryTable,
  type InventoryRow,
} from "@/components/inventory/inventory-table"

export const metadata = { title: "Inventario" }

const OPERATOR_ROLES = new Set(["owner", "admin", "manager", "staff"])

interface InventarioPageProps {
  searchParams: Promise<{ location?: string }>
}

export default async function InventarioPage({
  searchParams,
}: InventarioPageProps) {
  const { org } = await requireOrg()
  const canOperate = OPERATOR_ROLES.has(org.role)
  const params = await searchParams

  const supabase = await createClient()

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (!locations || locations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Inventario"
          description="Stock por sucursal con búsqueda y alertas de mínimo."
        />
        <EmptyState
          icon={Package}
          title="No tienes sucursales activas"
          description="Necesitas al menos una sucursal para ver inventario."
          action={
            <Link
              href="/sucursales"
              className={buttonVariants({ size: "sm" })}
            >
              Ir a Sucursales
            </Link>
          }
        />
      </div>
    )
  }

  const selectedLocationId =
    locations.find((l) => l.id === params.location)?.id ?? locations[0]!.id
  const selectedLocationName =
    locations.find((l) => l.id === selectedLocationId)?.name ?? ""

  const [productsRes, inventoryRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, base_unit, min_stock")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("inventory")
      .select("product_id, quantity, average_cost")
      .eq("organization_id", org.id)
      .eq("location_id", selectedLocationId),
  ])

  const products = productsRes.data ?? []
  const inventory = inventoryRes.data ?? []

  if (products.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Inventario"
          description="Stock por sucursal con búsqueda y alertas de mínimo."
        />
        <EmptyState
          icon={Package}
          title="Aún no tienes productos activos"
          description="Agrega productos primero, después aparecerán aquí para llevar stock."
          action={
            <Link
              href="/productos"
              className={buttonVariants({ size: "sm" })}
            >
              Ir a Productos
            </Link>
          }
        />
      </div>
    )
  }

  const inventoryMap = new Map(
    inventory.map((row) => [row.product_id, row])
  )

  const rows: InventoryRow[] = products.map((p) => {
    const inv = inventoryMap.get(p.id)
    return {
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      base_unit: p.base_unit,
      min_stock: Number(p.min_stock ?? 0),
      quantity: Number(inv?.quantity ?? 0),
      average_cost: Number(inv?.average_cost ?? 0),
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Selecciona sucursal, busca productos, registra ajustes o mermas."
      />
      <InventoryTable
        locations={locations}
        selectedLocationId={selectedLocationId}
        selectedLocationName={selectedLocationName}
        rows={rows}
        canOperate={canOperate}
      />
    </div>
  )
}
