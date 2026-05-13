"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  addPOItem,
  removePOItem,
  type POActionState,
} from "@/lib/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const INITIAL: POActionState = { status: "idle" }

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

type Item = Tables<"purchase_order_items"> & {
  product?: Pick<Tables<"products">, "id" | "name" | "base_unit"> | null
}

interface POItemsEditorProps {
  poId: string
  items: Item[]
  products: Pick<Tables<"products">, "id" | "name" | "base_unit">[]
  editable: boolean
}

function AddSubmit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Agregando..." : "Agregar"}
    </Button>
  )
}

export function POItemsEditor({
  poId,
  items,
  products,
  editable,
}: POItemsEditorProps) {
  const addAction = addPOItem.bind(null, poId)
  const [state, formAction] = useActionState(addAction, INITIAL)
  const [productId, setProductId] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setProductId("")
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state])

  function handleRemove(itemId: string) {
    setBusyId(itemId)
    startTransition(async () => {
      try {
        await removePOItem(poId, itemId)
        toast.success("Línea eliminada.")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const selectedProduct = productId ? productMap.get(productId) : null

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity) * Number(it.unit_cost),
    0
  )

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          Sin líneas todavía. Agrega productos abajo.
        </p>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                {editable && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const qty = Number(it.quantity)
                const cost = Number(it.unit_cost)
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      {it.product?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number.format(qty)} {it.product?.base_unit ?? ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {currency.format(cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {currency.format(qty * cost)}
                    </TableCell>
                    {editable && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Eliminar línea"
                          disabled={pending && busyId === it.id}
                          onClick={() => handleRemove(it.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-right text-sm font-medium"
                >
                  Total
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {currency.format(subtotal)}
                </TableCell>
                {editable && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {editable && products.length > 0 && (
        <form
          action={formAction}
          className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_120px_120px_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="po-item-product" className="text-xs">
              Producto
            </Label>
            <Select
              name="product_id"
              value={productId}
              onValueChange={(v) => setProductId(v ?? "")}
            >
              <SelectTrigger id="po-item-product" className="w-full">
                <SelectValue>
                  {selectedProduct?.name ?? "Selecciona producto"}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="po-item-qty" className="text-xs">
              Cantidad
            </Label>
            <Input
              id="po-item-qty"
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="po-item-cost" className="text-xs">
              Costo unit.
            </Label>
            <Input
              id="po-item-cost"
              name="unit_cost"
              type="number"
              step="any"
              min="0"
              required
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end">
            <AddSubmit />
          </div>
        </form>
      )}
    </div>
  )
}
