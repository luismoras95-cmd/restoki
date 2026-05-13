import Link from "next/link"
import { ArrowRightLeft } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ExportCsvButton } from "@/components/export-csv-button"
import { NewTransferButton } from "@/components/transfers/new-transfer-button"
import { TransferStatusBadge } from "@/components/transfers/transfer-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Transferencias" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export default async function TransferenciasPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  const supabase = await createClient()
  const [transfersRes, locationsRes] = await Promise.all([
    supabase
      .from("transfers")
      .select(
        "id, status, notes, shipped_at, received_at, created_at, from_location:locations!from_location_id(id, name), to_location:locations!to_location_id(id, name)"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ])

  const transfers = transfersRes.data ?? []
  const locations = locationsRes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transferencias entre sucursales"
        description="Mueve stock de una sucursal a otra preservando el costo promedio ponderado."
        action={
          <div className="flex gap-2">
            <ExportCsvButton
              endpoint="/api/export/transfers"
              label="Exportar"
              withDateRange
              description="Exporta transferencias (encabezado + líneas) por rango de fechas."
            />
            {canEdit ? <NewTransferButton locations={locations} /> : null}
          </div>
        }
      />

      {locations.length < 2 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Necesitas al menos 2 sucursales"
          description="Crea otra sucursal en la sección Sucursales para poder transferir entre ellas."
        />
      ) : transfers.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Aún no tienes transferencias"
          description={
            canEdit
              ? "Click 'Nueva transferencia' arriba para crear la primera."
              : "Las transferencias aparecerán aquí."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell>
                    <Link
                      href={`/transferencias/${t.id}`}
                      className="block font-mono text-xs"
                    >
                      {dateFmt.format(new Date(t.created_at!))}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transferencias/${t.id}`}
                      className="block"
                    >
                      {t.from_location?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transferencias/${t.id}`}
                      className="block"
                    >
                      {t.to_location?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transferencias/${t.id}`}
                      className="block"
                    >
                      <TransferStatusBadge status={t.status!} />
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
