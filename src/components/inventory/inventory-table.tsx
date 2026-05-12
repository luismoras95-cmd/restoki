"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { AlertTriangle, ArrowRightLeft, Search } from "lucide-react"

import { MovementDialog } from "@/components/inventory/movement-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Tables } from "@/types/db"

export type InventoryRow = {
  product_id: string
  product_name: string
  product_sku: string | null
  base_unit: string
  min_stock: number
  quantity: number
  average_cost: number
}

interface InventoryTableProps {
  locations: Pick<Tables<"locations">, "id" | "name">[]
  selectedLocationId: string
  selectedLocationName: string
  rows: InventoryRow[]
  canOperate: boolean
}

type MovementState =
  | { open: false }
  | {
      open: true
      productId: string
      productName: string
      currentQty: number
      baseUnit: string
    }

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const number = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 3,
})

export function InventoryTable({
  locations,
  selectedLocationId,
  selectedLocationName,
  rows,
  canOperate,
}: InventoryTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [movement, setMovement] = useState<MovementState>({ open: false })

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        (r.product_sku?.toLowerCase().includes(q) ?? false)
    )
  }, [rows, query])

  function setLocation(id: string | null) {
    if (!id) return
    const params = new URLSearchParams(searchParams)
    params.set("location", id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedLocationId} onValueChange={setLocation}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Costo prom.
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Valor
              </TableHead>
              <TableHead>Estado</TableHead>
              {canOperate && <TableHead className="w-[140px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canOperate ? 7 : 6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const belowMin = r.quantity < r.min_stock
                const value = r.quantity * r.average_cost
                return (
                  <TableRow key={r.product_id}>
                    <TableCell className="font-medium">
                      {r.product_name}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {r.product_sku ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number.format(r.quantity)} {r.base_unit}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                      {r.average_cost > 0 ? currency.format(r.average_cost) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                      {value > 0 ? currency.format(value) : "—"}
                    </TableCell>
                    <TableCell>
                      {belowMin && r.min_stock > 0 ? (
                        <Badge
                          variant="destructive"
                          className="gap-1"
                        >
                          <AlertTriangle className="size-3" />
                          Bajo mínimo
                        </Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </TableCell>
                    {canOperate && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMovement({
                              open: true,
                              productId: r.product_id,
                              productName: r.product_name,
                              currentQty: r.quantity,
                              baseUnit: r.base_unit,
                            })
                          }
                        >
                          <ArrowRightLeft className="size-3.5" />
                          Movimiento
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {movement.open && (
        <MovementDialog
          open={movement.open}
          onOpenChange={(open) => !open && setMovement({ open: false })}
          locationId={selectedLocationId}
          locationName={selectedLocationName}
          productId={movement.productId}
          productName={movement.productName}
          currentQty={movement.currentQty}
          baseUnit={movement.baseUnit}
        />
      )}
    </>
  )
}
