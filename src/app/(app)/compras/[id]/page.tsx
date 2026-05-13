import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { POActions } from "@/components/purchase-orders/po-actions"
import { POHeaderForm } from "@/components/purchase-orders/po-header-form"
import { POItemsEditor } from "@/components/purchase-orders/po-items-editor"
import { POShareButtons } from "@/components/purchase-orders/po-share-buttons"
import { POStatusBadge } from "@/components/purchase-orders/po-status-badge"

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

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

export default async function POPage({ params }: PageProps) {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)
  const { id } = await params

  const supabase = await createClient()
  const [poRes, itemsRes, locationsRes, suppliersRes, productsRes] =
    await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "*, location:locations(id, name), supplier:suppliers(id, name, phone)"
        )
        .eq("id", id)
        .eq("organization_id", org.id)
        .single(),
      supabase
        .from("purchase_order_items")
        .select("*, product:products(id, name, base_unit)")
        .eq("purchase_order_id", id)
        .order("id", { ascending: true }),
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

  if (poRes.error || !poRes.data) notFound()

  const po = poRes.data
  const items = itemsRes.data ?? []
  const locations = locationsRes.data ?? []
  const suppliers = suppliersRes.data ?? []
  const products = productsRes.data ?? []

  const status = po.status!
  const editableHeader = canEdit && status === "draft"
  const editableItems = canEdit && status === "draft"

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              Orden #{id.slice(0, 8)}
            </h1>
            <POStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Creada el {dateTimeFmt.format(new Date(po.created_at!))}
            {po.received_at &&
              ` · Recibida el ${dateTimeFmt.format(new Date(po.received_at))}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <POActions
            poId={id}
            status={status}
            canEdit={canEdit}
            itemsCount={items.length}
          />
          <POShareButtons
            poId={id}
            orgName={org.name}
            orgPhone={org.notification_phone}
            status={status}
            total={items.reduce(
              (sum, it) =>
                sum + Number(it.quantity ?? 0) * Number(it.unit_cost ?? 0),
              0
            )}
            itemsSummary={items.map((it) => ({
              name: it.product?.name ?? "—",
              qty: Number(it.quantity ?? 0),
              unit: it.product?.base_unit ?? "",
              cost: Number(it.unit_cost ?? 0),
            }))}
            supplier={
              po.supplier
                ? { name: po.supplier.name, phone: po.supplier.phone }
                : null
            }
            locationName={po.location?.name ?? null}
          />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Datos
        </h2>
        {editableHeader ? (
          <POHeaderForm
            poId={id}
            defaultLocationId={po.location_id}
            defaultSupplierId={po.supplier_id}
            defaultNotes={po.notes}
            locations={locations}
            suppliers={suppliers}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Sucursal destino</p>
              <p className="font-medium">{po.location?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proveedor</p>
              <p className="font-medium">{po.supplier?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total final</p>
              <p className="font-medium tabular-nums">
                {currency.format(Number(po.total ?? 0))}
              </p>
            </div>
            {po.notes && (
              <div className="sm:col-span-3">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Líneas
        </h2>
        <POItemsEditor
          poId={id}
          items={items}
          products={products}
          editable={editableItems}
        />
      </section>
    </div>
  )
}
