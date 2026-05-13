"use client"

import Link from "next/link"
import { Download, Printer, MessageCircle } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface POShareButtonsProps {
  poId: string
  orgName: string
  orgPhone: string | null
  status: string
  total: number
  itemsSummary: Array<{
    name: string
    qty: number
    unit: string
    cost: number
  }>
  supplier: {
    name: string
    phone: string | null
  } | null
  locationName: string | null
}

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

function buildSupplierMessage(args: {
  orgName: string
  poId: string
  locationName: string | null
  items: Array<{ name: string; qty: number; unit: string; cost: number }>
  total: number
}): string {
  const lines = [
    `📋 *Orden de compra ${args.orgName}*`,
    `Folio: ${args.poId.slice(0, 8).toUpperCase()}`,
    args.locationName ? `Entregar en: ${args.locationName}` : "",
    "",
    "*Productos:*",
    ...args.items.map(
      (it, i) =>
        `${i + 1}. ${it.name} · ${it.qty} ${it.unit} · ${currency.format(it.cost)} c/u`
    ),
    "",
    `*Total: ${currency.format(args.total)}*`,
    "",
    "Enviado desde Restoki",
  ]
  return lines.filter((l) => l !== null).join("\n")
}

function buildInternalMessage(args: {
  orgName: string
  poId: string
  status: string
  locationName: string | null
  supplierName: string | null
  total: number
  detailUrl: string
}): string {
  return [
    `📦 ${args.orgName} · Orden ${args.poId.slice(0, 8).toUpperCase()}`,
    `Estado: ${args.status}`,
    args.supplierName ? `Proveedor: ${args.supplierName}` : "",
    args.locationName ? `Sucursal: ${args.locationName}` : "",
    `Total: ${currency.format(args.total)}`,
    "",
    `Ver detalle: ${args.detailUrl}`,
  ]
    .filter((l) => l !== "")
    .join("\n")
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[^\d+]/g, "")
  // wa.me espera dígitos sin "+"
  return cleaned.replace(/^\+/, "")
}

function whatsappUrl(phone: string | null, message: string): string {
  const text = encodeURIComponent(message)
  const normalized = normalizePhone(phone)
  return normalized
    ? `https://wa.me/${normalized}?text=${text}`
    : `https://wa.me/?text=${text}`
}

export function POShareButtons({
  poId,
  orgName,
  orgPhone,
  status,
  total,
  itemsSummary,
  supplier,
  locationName,
}: POShareButtonsProps) {
  const supplierMsg = buildSupplierMessage({
    orgName,
    poId,
    locationName,
    items: itemsSummary,
    total,
  })

  const internalMsg = buildInternalMessage({
    orgName,
    poId,
    status,
    locationName,
    supplierName: supplier?.name ?? null,
    total,
    detailUrl:
      typeof window === "undefined"
        ? `https://restoki.mx/compras/${poId}`
        : `${window.location.origin}/compras/${poId}`,
  })

  const supplierUrl = whatsappUrl(supplier?.phone ?? null, supplierMsg)
  const internalUrl = whatsappUrl(orgPhone, internalMsg)

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/imprimir/compras/${poId}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        target="_blank"
      >
        <Printer className="size-4" />
        Imprimir
      </Link>
      <a href={`/api/export/purchase-orders/${poId}`} download>
        <Button variant="outline" size="sm" type="button">
          <Download className="size-4" />
          CSV
        </Button>
      </a>
      {supplier && (
        <a href={supplierUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" type="button">
            <MessageCircle className="size-4" />
            WhatsApp a proveedor
          </Button>
        </a>
      )}
      {orgPhone && (
        <a href={internalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" type="button">
            <MessageCircle className="size-4" />
            WhatsApp al equipo
          </Button>
        </a>
      )}
    </div>
  )
}
