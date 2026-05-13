import Link from "next/link"
import { Camera, ShoppingCart } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ExportCsvButton } from "@/components/export-csv-button"
import { buttonVariants } from "@/components/ui/button"
import { NewPOButton } from "@/components/purchase-orders/new-po-button"
import { POStatusBadge } from "@/components/purchase-orders/po-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Compras" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export default async function ComprasPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  const supabase = await createClient()
  const [posRes, locationsRes, suppliersRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "id, status, total, notes, received_at, created_at, location:locations(id, name), supplier:suppliers(id, name)"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
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
  ])

  const pos = posRes.data ?? []
  const locations = locationsRes.data ?? []
  const suppliers = suppliersRes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Órdenes de compra"
        description="Crea borradores, agrega líneas y recibe para que el stock se actualice automáticamente."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton
              endpoint="/api/export/purchase-orders"
              label="Exportar"
              withDateRange
              description="Exporta órdenes de compra (encabezado + líneas) por rango de fechas."
            />
            {canEdit && locations.length > 0 ? (
              <>
                <Link
                  href="/compras/desde-ticket"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Camera className="size-4" />
                  Subir ticket
                </Link>
                <NewPOButton locations={locations} suppliers={suppliers} />
              </>
            ) : null}
          </div>
        }
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Necesitas una sucursal activa"
          description="Crea al menos una sucursal antes de hacer compras."
        />
      ) : pos.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Aún no tienes compras"
          description={
            canEdit
              ? "Click 'Nueva compra' arriba para crear el primer borrador."
              : "Pide a un administrador que cree órdenes de compra."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell>
                    <Link
                      href={`/compras/${po.id}`}
                      className="block font-mono text-xs"
                    >
                      {dateFmt.format(new Date(po.created_at!))}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/compras/${po.id}`} className="block">
                      {po.location?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    <Link href={`/compras/${po.id}`} className="block">
                      {po.supplier?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/compras/${po.id}`} className="block">
                      <POStatusBadge status={po.status!} />
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link href={`/compras/${po.id}`} className="block">
                      {currency.format(Number(po.total ?? 0))}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
