"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  addTransferItem,
  removeTransferItem,
  type TransferActionState,
} from "@/lib/actions/transfers"
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

const INITIAL: TransferActionState = { status: "idle" }
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

type Item = Tables<"transfer_items"> & {
  product?: Pick<Tables<"products">, "id" | "name" | "base_unit"> | null
}

interface TransferItemsEditorProps {
  transferId: string
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

export function TransferItemsEditor({
  transferId,
  items,
  products,
  editable,
}: TransferItemsEditorProps) {
  const addAction = addTransferItem.bind(null, transferId)
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
        await removeTransferItem(transferId, itemId)
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

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          Sin líneas. Agrega productos abajo.
        </p>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                {editable && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">
                    {it.product?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number.format(Number(it.quantity))}{" "}
                    {it.product?.base_unit ?? ""}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editable && products.length > 0 && (
        <form
          action={formAction}
          className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_140px_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tr-item-product" className="text-xs">
              Producto
            </Label>
            <Select
              name="product_id"
              value={productId}
              onValueChange={(v) => setProductId(v ?? "")}
            >
              <SelectTrigger id="tr-item-product" className="w-full">
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
            <Label htmlFor="tr-item-qty" className="text-xs">
              Cantidad
            </Label>
            <Input
              id="tr-item-qty"
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              placeholder="0"
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
