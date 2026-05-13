import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { TransferActions } from "@/components/transfers/transfer-actions"
import { TransferHeaderForm } from "@/components/transfers/transfer-header-form"
import { TransferItemsEditor } from "@/components/transfers/transfer-items-editor"
import { TransferStatusBadge } from "@/components/transfers/transfer-status-badge"

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransferPage({ params }: PageProps) {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)
  const { id } = await params

  const supabase = await createClient()
  const [transferRes, itemsRes, locationsRes, productsRes] = await Promise.all([
    supabase
      .from("transfers")
      .select(
        "*, from_location:locations!from_location_id(id, name), to_location:locations!to_location_id(id, name)"
      )
      .eq("id", id)
      .eq("organization_id", org.id)
      .single(),
    supabase
      .from("transfer_items")
      .select("*, product:products(id, name, base_unit)")
      .eq("transfer_id", id)
      .order("id", { ascending: true }),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, base_unit")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  if (transferRes.error || !transferRes.data) notFound()

  const transfer = transferRes.data
  const items = itemsRes.data ?? []
  const locations = locationsRes.data ?? []
  const products = productsRes.data ?? []

  const status = transfer.status!
  const editable = canEdit && status === "draft"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/transferencias"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Transferencias
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              Transferencia #{id.slice(0, 8)}
            </h1>
            <TransferStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Creada el {dateTimeFmt.format(new Date(transfer.created_at!))}
            {transfer.shipped_at &&
              ` · Enviada el ${dateTimeFmt.format(new Date(transfer.shipped_at))}`}
            {transfer.received_at &&
              ` · Recibida el ${dateTimeFmt.format(new Date(transfer.received_at))}`}
          </p>
        </div>
        <TransferActions
          transferId={id}
          status={status}
          canEdit={canEdit}
          itemsCount={items.length}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sucursales
        </h2>
        {editable ? (
          <TransferHeaderForm
            transferId={id}
            defaultFromId={transfer.from_location_id}
            defaultToId={transfer.to_location_id}
            defaultNotes={transfer.notes}
            locations={locations}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="font-medium">
                  {transfer.from_location?.name ?? "—"}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Destino</p>
                <p className="font-medium">
                  {transfer.to_location?.name ?? "—"}
                </p>
              </div>
            </div>
            {transfer.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap">{transfer.notes}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Líneas
        </h2>
        <TransferItemsEditor
          transferId={id}
          items={items}
          products={products}
          editable={editable}
        />
      </section>
    </div>
  )
}
