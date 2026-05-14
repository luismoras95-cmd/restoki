import Link from "next/link"
import { Barcode } from "lucide-react"

import { getAccessibleLocationIds, requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { ScannerView } from "@/components/scanner/scanner-view"

export const metadata = { title: "Escáner" }

const OPERATOR_ROLES = new Set(["owner", "admin", "manager", "staff"])

export default async function EscanerPage() {
  const { org } = await requireOrg()
  if (!OPERATOR_ROLES.has(org.role)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Escáner" />
        <EmptyState
          icon={Barcode}
          title="Sin permiso"
          description="Tu rol no permite registrar movimientos por escaneo."
        />
      </div>
    )
  }

  const supabase = await createClient()
  const [locationsRes, productsRes, accessibleIds] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, sku, base_unit")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    getAccessibleLocationIds(),
  ])

  const locations = (locationsRes.data ?? []).filter((l) =>
    accessibleIds.has(l.id)
  )
  const products = productsRes.data ?? []

  if (locations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Escáner"
          description="Carga stock al inventario escaneando códigos de barras."
        />
        <EmptyState
          icon={Barcode}
          title="Necesitas una sucursal activa"
          description="Crea una sucursal antes de escanear."
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escáner de códigos"
        description="Escanea con cámara, lector USB o teclea el código. El primer escaneo asocia el producto; los siguientes son instantáneos."
      />
      <ScannerView locations={locations} products={products} />
    </div>
  )
}
