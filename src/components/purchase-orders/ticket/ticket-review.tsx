"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, RefreshCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  createPOFromTicket,
  type CreateFromTicketInput,
} from "@/lib/actions/purchase-orders"
import type { ParsedTicket, TicketItem } from "@/lib/actions/ticket-parser"
import type { Tables } from "@/types/db"

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

type Location = Pick<Tables<"locations">, "id" | "name">
type Supplier = Pick<Tables<"suppliers">, "id" | "name">
type Product = Pick<Tables<"products">, "id" | "name" | "base_unit"> & {
  default_cost?: number | null
}

interface TicketReviewProps {
  parsed: ParsedTicket
  previewUrl: string | null
  locations: Location[]
  suppliers: Supplier[]
  products: Product[]
  onReset: () => void
}

interface ReviewLine {
  id: string
  raw: TicketItem
  productId: string
  quantity: string
  unitCost: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function bestProductMatch(
  itemName: string,
  products: Product[]
): string {
  if (products.length === 0) return ""
  const target = normalize(itemName)
  if (!target) return ""

  let best = ""
  let bestScore = 0
  const targetTokens = target.split(" ").filter(Boolean)

  for (const p of products) {
    const candidate = normalize(p.name)
    if (!candidate) continue

    let score = 0
    if (candidate === target) score = 100
    else if (candidate.includes(target) || target.includes(candidate)) score = 80
    else {
      const candTokens = new Set(candidate.split(" ").filter(Boolean))
      const overlap = targetTokens.filter((t) => candTokens.has(t)).length
      if (overlap > 0) {
        score = (overlap / Math.max(targetTokens.length, candTokens.size)) * 60
      }
    }

    if (score > bestScore) {
      bestScore = score
      best = p.id
    }
  }

  return bestScore >= 30 ? best : ""
}

function bestSupplierMatch(
  name: string | null,
  suppliers: Supplier[]
): string {
  if (!name || suppliers.length === 0) return ""
  const target = normalize(name)
  for (const s of suppliers) {
    const cand = normalize(s.name)
    if (cand === target || cand.includes(target) || target.includes(cand)) {
      return s.id
    }
  }
  return ""
}

export function TicketReview({
  parsed,
  previewUrl,
  locations,
  suppliers,
  products,
  onReset,
}: TicketReviewProps) {
  const [locationId, setLocationId] = useState<string>(
    locations[0]?.id ?? ""
  )
  const [supplierId, setSupplierId] = useState<string>(
    bestSupplierMatch(parsed.supplier_name, suppliers)
  )
  const [notes, setNotes] = useState<string>(() => {
    const parts: string[] = []
    if (parsed.notes) parts.push(parsed.notes)
    if (parsed.date) parts.push(`Fecha del ticket: ${parsed.date}`)
    if (
      parsed.supplier_name &&
      !bestSupplierMatch(parsed.supplier_name, suppliers)
    ) {
      parts.push(`Proveedor según ticket: ${parsed.supplier_name}`)
    }
    return parts.join("\n")
  })

  const [lines, setLines] = useState<ReviewLine[]>(() =>
    parsed.items.map((it, i) => ({
      id: `${i}-${Math.random().toString(36).slice(2, 8)}`,
      raw: it,
      productId: bestProductMatch(it.name, products),
      quantity: String(it.quantity),
      unitCost: it.unit_cost != null ? String(it.unit_cost) : "",
    }))
  )

  const [pending, startTransition] = useTransition()

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  )

  function updateLine(id: string, patch: Partial<ReviewLine>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const total = lines.reduce((sum, l) => {
    const q = Number(l.quantity)
    const c = Number(l.unitCost)
    if (!Number.isFinite(q) || !Number.isFinite(c)) return sum
    return sum + q * c
  }, 0)

  const unmatchedCount = lines.filter((l) => !l.productId).length

  function handleSubmit() {
    if (!locationId) {
      toast.error("Selecciona una sucursal destino.")
      return
    }
    if (lines.length === 0) {
      toast.error("Necesitas al menos una línea.")
      return
    }
    if (unmatchedCount > 0) {
      toast.error(
        `${unmatchedCount} línea(s) sin producto asignado. Asigna o elimina.`
      )
      return
    }

    const items: CreateFromTicketInput["items"] = []
    for (const l of lines) {
      const q = Number(l.quantity)
      const c = Number(l.unitCost)
      if (!Number.isFinite(q) || q <= 0) {
        toast.error(`Cantidad inválida en "${l.raw.name}".`)
        return
      }
      if (!Number.isFinite(c) || c < 0) {
        toast.error(`Costo inválido en "${l.raw.name}".`)
        return
      }
      items.push({
        product_id: l.productId,
        quantity: q,
        unit_cost: c,
      })
    }

    startTransition(async () => {
      try {
        await createPOFromTicket({
          location_id: locationId,
          supplier_id: supplierId || null,
          notes: notes.trim() || null,
          items,
        })
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Error desconocido")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      {/* Foto + datos del ticket */}
      <div className="flex flex-col gap-4">
        {previewUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket original</CardTitle>
              <CardDescription>Para verificar línea por línea.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Ticket"
                  className="max-h-[600px] w-full object-contain"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos detectados por IA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Proveedor" value={parsed.supplier_name ?? "—"} />
            <Row label="Fecha" value={parsed.date ?? "—"} />
            <Row
              label="Subtotal"
              value={
                parsed.subtotal != null
                  ? currency.format(parsed.subtotal)
                  : "—"
              }
            />
            <Row
              label="IVA"
              value={parsed.tax != null ? currency.format(parsed.tax) : "—"}
            />
            <Row
              label="Total"
              value={
                parsed.total != null ? currency.format(parsed.total) : "—"
              }
              bold
            />
          </CardContent>
        </Card>
      </div>

      {/* Revisión */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Confirma datos</CardTitle>
            <CardDescription>
              Selecciona sucursal y proveedor, y revisa que los productos del
              ticket coincidan con tu catálogo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-location">Sucursal destino *</Label>
                <Select
                  value={locationId}
                  onValueChange={(v) => v && setLocationId(v)}
                >
                  <SelectTrigger id="t-location" className="w-full">
                    <SelectValue>
                      {locations.find((l) => l.id === locationId)?.name ??
                        "Selecciona sucursal"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-supplier">Proveedor</Label>
                <Select
                  value={supplierId}
                  onValueChange={(v) => setSupplierId(v ?? "")}
                >
                  <SelectTrigger id="t-supplier" className="w-full">
                    <SelectValue>
                      {suppliers.find((s) => s.id === supplierId)?.name ??
                        "— Sin proveedor —"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Sin proveedor —</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-notes">Notas</Label>
              <Textarea
                id="t-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Líneas detectadas ({lines.length})
                </CardTitle>
                <CardDescription>
                  {unmatchedCount > 0
                    ? `${unmatchedCount} línea(s) sin producto asignado.`
                    : "Todas las líneas están listas."}
                </CardDescription>
              </div>
              <div className="text-right text-sm">
                <p className="text-xs text-muted-foreground">Total calculado</p>
                <p className="text-lg font-semibold tabular-nums">
                  {currency.format(total)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Eliminaste todas las líneas. Vuelve atrás para subir otro ticket.
              </p>
            ) : (
              lines.map((line) => {
                const matched = line.productId
                  ? productMap.get(line.productId)
                  : null
                return (
                  <div
                    key={line.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-3",
                      !line.productId && "border-amber-500/50 bg-amber-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Texto del ticket
                        </p>
                        <p className="font-medium">{line.raw.name}</p>
                        {line.raw.unit && (
                          <p className="text-xs text-muted-foreground">
                            Unidad detectada: {line.raw.unit}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {line.productId ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <X className="size-4 text-amber-500" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Eliminar línea"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_120px]">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Producto de tu catálogo</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(v) =>
                            updateLine(line.id, { productId: v ?? "" })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {matched
                                ? `${matched.name} (${matched.base_unit})`
                                : "Asignar producto..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.base_unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, { quantity: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Costo unit.</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(line.id, { unitCost: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={pending}
          >
            <RefreshCcw className="size-4" />
            Subir otro ticket
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || lines.length === 0 || !locationId}
          >
            {pending ? "Creando orden..." : "Crear orden de compra"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold && "font-semibold")}>
        {value}
      </span>
    </div>
  )
}
