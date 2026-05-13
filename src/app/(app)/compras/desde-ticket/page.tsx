import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { TicketFlow } from "@/components/purchase-orders/ticket/ticket-flow"

export const metadata = { title: "Compra desde ticket" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export default async function DesdeTicketPage() {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    redirect("/compras")
  }

  const supabase = await createClient()
  const [locationsRes, suppliersRes, productsRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, base_unit, default_cost")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  const locations = locationsRes.data ?? []
  const suppliers = suppliersRes.data ?? []
  const products = productsRes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/compras"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Compras
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Compra desde ticket
        </h1>
        <p className="text-sm text-muted-foreground">
          Sube la foto del ticket o factura del proveedor. La IA leerá los
          productos, cantidades y costos. Tú revisas y confirmas antes de crear
          la orden.
        </p>
      </div>

      <TicketFlow
        locations={locations}
        suppliers={suppliers}
        products={products}
      />
    </div>
  )
}
