"use client"

import { useEffect } from "react"
import { ChefHat, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { Tables, Enums } from "@/types/db"

type PO = Tables<"purchase_orders"> & {
  location?: Pick<Tables<"locations">, "id" | "name" | "address"> | null
  supplier?:
    | (Pick<Tables<"suppliers">, "id" | "name" | "contact_name" | "phone" | "email">)
    | null
}

type Item = Tables<"purchase_order_items"> & {
  product?: Pick<Tables<"products">, "id" | "name" | "sku" | "base_unit"> | null
}

interface PrintPOViewProps {
  org: {
    name: string
    rfc: string | null
    address: string | null
  }
  po: PO
  items: Item[]
}

const STATUS_LABELS: Record<Enums<"po_status">, string> = {
  draft: "Borrador",
  sent: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
}

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

export function PrintPOView({ org, po, items }: PrintPOViewProps) {
  // Auto-abre el diálogo de impresión cuando carga
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500)
    return () => clearTimeout(t)
  }, [])

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity ?? 0) * Number(it.unit_cost ?? 0),
    0
  )

  return (
    <div className="min-h-svh bg-muted/20 p-6 print:bg-white print:p-0">
      {/* Toolbar oculta al imprimir */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link
          href={`/compras/${po.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Regresar a la orden
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="size-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 shadow-sm print:rounded-none print:border-0 print:p-8 print:shadow-none">
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-6 border-b pb-6">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ChefHat className="size-7" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">{org.name}</p>
              {org.rfc && (
                <p className="text-xs text-muted-foreground">
                  RFC: {org.rfc}
                </p>
              )}
              {org.address && (
                <p className="text-xs text-muted-foreground">{org.address}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Orden de compra
            </p>
            <p className="font-mono text-lg font-bold">
              #{po.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dateFmt.format(new Date(po.created_at!))}
            </p>
            <p className="mt-2 inline-block rounded-full border px-2 py-0.5 text-xs">
              {STATUS_LABELS[po.status!]}
            </p>
          </div>
        </header>

        {/* Sucursal y proveedor */}
        <section className="grid grid-cols-2 gap-6 border-b py-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sucursal destino
            </p>
            <p className="mt-1 font-medium">{po.location?.name ?? "—"}</p>
            {po.location?.address && (
              <p className="text-xs text-muted-foreground">
                {po.location.address}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proveedor
            </p>
            <p className="mt-1 font-medium">{po.supplier?.name ?? "—"}</p>
            {po.supplier?.contact_name && (
              <p className="text-xs text-muted-foreground">
                Atn. {po.supplier.contact_name}
              </p>
            )}
            {po.supplier?.phone && (
              <p className="text-xs text-muted-foreground">
                Tel: {po.supplier.phone}
              </p>
            )}
            {po.supplier?.email && (
              <p className="text-xs text-muted-foreground">
                {po.supplier.email}
              </p>
            )}
          </div>
        </section>

        {/* Tabla de líneas */}
        <section className="py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left font-medium">Producto</th>
                <th className="py-2 text-left font-medium">SKU</th>
                <th className="py-2 text-right font-medium">Cant.</th>
                <th className="py-2 text-right font-medium">Costo unit.</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Sin líneas.
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const qty = Number(it.quantity ?? 0)
                  const cost = Number(it.unit_cost ?? 0)
                  return (
                    <tr key={it.id} className="border-b">
                      <td className="py-3 align-top">
                        {it.product?.name ?? "—"}
                      </td>
                      <td className="py-3 align-top text-xs text-muted-foreground">
                        {it.product?.sku ?? "—"}
                      </td>
                      <td className="py-3 text-right tabular-nums align-top">
                        {number.format(qty)} {it.product?.base_unit ?? ""}
                      </td>
                      <td className="py-3 text-right tabular-nums align-top">
                        {currency.format(cost)}
                      </td>
                      <td className="py-3 text-right tabular-nums align-top font-medium">
                        {currency.format(qty * cost)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-4 text-right font-semibold">
                  TOTAL
                </td>
                <td className="pt-4 text-right tabular-nums text-lg font-bold">
                  {currency.format(subtotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Notas */}
        {po.notes && (
          <section className="border-t py-6 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notas
            </p>
            <p className="mt-1 whitespace-pre-wrap">{po.notes}</p>
          </section>
        )}

        {/* Firma */}
        <section className="grid grid-cols-2 gap-12 border-t pt-12 text-xs">
          <div className="text-center">
            <div className="border-t border-muted-foreground/40 pt-2">
              Recibe (proveedor)
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-muted-foreground/40 pt-2">
              Autoriza (Restoki)
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Generado por Restoki · restoki.mx
        </p>
      </div>
    </div>
  )
}
