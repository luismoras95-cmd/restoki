import Link from "next/link"
import { Receipt } from "lucide-react"

import { getAccessibleLocationIds, requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { SalesAuditItem } from "@/lib/actions/sales"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { UploadSalesDialog } from "@/components/sales/upload-sales-dialog"
import {
  SalesReportsList,
  type SalesReportRow,
} from "@/components/sales/sales-reports-list"

export const metadata = { title: "Ventas" }

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function formatDay(value: string): string {
  // period_start/period_end son fechas (YYYY-MM-DD); evita corrimiento por TZ.
  return dateFmt.format(new Date(`${value}T12:00:00`))
}

function parseAuditItems(audit: unknown): SalesAuditItem[] {
  if (!Array.isArray(audit)) return []
  return audit.map((raw) => {
    const it = raw as Record<string, unknown>
    return {
      product_id: String(it.product_id ?? ""),
      name: String(it.name ?? ""),
      unit: String(it.unit ?? ""),
      before: Number(it.before ?? 0),
      consumed: Number(it.consumed ?? 0),
      after: Number(it.after ?? 0),
      deficit: Boolean(it.deficit),
    }
  })
}

export default async function VentasPage() {
  const { org } = await requireOrg()
  const supabase = await createClient()

  const [{ data: allLocations }, accessibleIds] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    getAccessibleLocationIds(),
  ])

  const locations = (allLocations ?? []).filter((l) => accessibleIds.has(l.id))

  if (locations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Ventas"
          description="Sube las ventas de tu punto de venta y descuenta insumos automáticamente."
        />
        <EmptyState
          icon={Receipt}
          title="No tienes sucursales activas"
          description="Necesitas al menos una sucursal para cargar ventas."
          action={
            <Link href="/sucursales" className={buttonVariants({ size: "sm" })}>
              Ir a Sucursales
            </Link>
          }
        />
      </div>
    )
  }

  const { data: reportsData } = await supabase
    .from("sales_reports")
    .select(
      "id, label, period_start, period_end, status, total_dishes_sold, audit, created_at, location:locations(id, name)"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const reports: SalesReportRow[] = (reportsData ?? []).map((r) => {
    const auditItems = parseAuditItems(r.audit)
    const period =
      r.period_start && r.period_end
        ? `${formatDay(r.period_start)} – ${formatDay(r.period_end)}`
        : r.period_start
          ? `Desde ${formatDay(r.period_start)}`
          : null
    return {
      id: r.id,
      label: r.label,
      locationName: r.location?.name ?? "—",
      createdAt: r.created_at ? dateFmt.format(new Date(r.created_at)) : "—",
      period,
      totalDishes: Number(r.total_dishes_sold ?? 0),
      deficitCount: auditItems.filter((i) => i.deficit).length,
      auditItems,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Sube el CSV semanal de platillos vendidos: Restoki descuenta los insumos según tus recetas y te avisa si algo no cuadra."
        action={<UploadSalesDialog locations={locations} />}
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aún no has cargado ventas"
          description="Click 'Cargar ventas' arriba: descarga la plantilla, llénala con lo vendido y súbela. Los insumos se descuentan solos."
        />
      ) : (
        <SalesReportsList reports={reports} />
      )}
    </div>
  )
}
