"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  addDishIngredient,
  removeDishIngredient,
  updateDishIngredient,
  type DishActionState,
} from "@/lib/actions/dishes"
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
import { Badge } from "@/components/ui/badge"
import type { Tables } from "@/types/db"

const INITIAL: DishActionState = { status: "idle" }

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

type Product = Pick<Tables<"products">, "id" | "name" | "base_unit"> & {
  default_cost?: number | null
}

export type IngredientRow = {
  ingredient_id: string
  product_id: string
  product_name: string
  base_unit: string
  quantity: number
  unit_cost: number
  subtotal: number
  cost_source: string
}

interface DishIngredientsEditorProps {
  dishId: string
  ingredients: IngredientRow[]
  products: Product[]
  canEdit: boolean
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

export function DishIngredientsEditor({
  dishId,
  ingredients,
  products,
  canEdit,
}: DishIngredientsEditorProps) {
  const addAction = addDishIngredient.bind(null, dishId)
  const [state, formAction] = useActionState(addAction, INITIAL)
  const [productId, setProductId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingQty, setEditingQty] = useState<string>("")

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setProductId("")
      setQuantity("")
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state])

  function handleRemove(row: IngredientRow) {
    if (
      !confirm(`¿Quitar ${row.product_name} de la receta?`)
    )
      return
    setBusyId(row.ingredient_id)
    startTransition(async () => {
      try {
        await removeDishIngredient(dishId, row.ingredient_id)
        toast.success("Ingrediente eliminado.")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  function handleStartEdit(row: IngredientRow) {
    setEditingId(row.ingredient_id)
    setEditingQty(String(row.quantity))
  }

  function handleSaveEdit(row: IngredientRow) {
    const q = Number(editingQty)
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Cantidad inválida.")
      return
    }
    setBusyId(row.ingredient_id)
    startTransition(async () => {
      try {
        await updateDishIngredient(dishId, row.ingredient_id, q)
        toast.success("Cantidad actualizada.")
        setEditingId(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  const selectedProduct = products.find((p) => p.id === productId)
  const usedProductIds = new Set(ingredients.map((i) => i.product_id))
  const availableProducts = products.filter((p) => !usedProductIds.has(p.id))

  return (
    <div className="flex flex-col gap-4">
      {ingredients.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          Sin ingredientes. Agrega abajo para calcular el costo.
        </p>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                {canEdit && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((row) => {
                const isEditing = editingId === row.ingredient_id
                return (
                  <TableRow key={row.ingredient_id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {row.product_name}
                        </span>
                        {row.cost_source === "default" && (
                          <Badge variant="outline" className="w-fit gap-1 text-xs">
                            <AlertCircle className="size-3" />
                            Sin CPP en esta sucursal — usando costo estimado
                          </Badge>
                        )}
                        {row.cost_source === "none" && (
                          <Badge variant="destructive" className="w-fit gap-1 text-xs">
                            <AlertCircle className="size-3" />
                            Sin costo — define un default_cost en el producto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing && canEdit ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            className="w-24 text-right tabular-nums"
                            value={editingQty}
                            onChange={(e) => setEditingQty(e.target.value)}
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.base_unit}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => canEdit && handleStartEdit(row)}
                          className={
                            canEdit
                              ? "tabular-nums hover:underline"
                              : "tabular-nums"
                          }
                          disabled={!canEdit}
                        >
                          {number.format(Number(row.quantity))} {row.base_unit}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {currency.format(Number(row.unit_cost))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {currency.format(Number(row.subtotal))}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(row)}
                              disabled={pending && busyId === row.ingredient_id}
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              disabled={pending && busyId === row.ingredient_id}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Eliminar"
                            onClick={() => handleRemove(row)}
                            disabled={pending && busyId === row.ingredient_id}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canEdit && availableProducts.length > 0 && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-product" className="text-xs">
                Ingrediente
              </Label>
              <Select
                name="product_id"
                value={productId}
                onValueChange={(v) => setProductId(v ?? "")}
              >
                <SelectTrigger id="ing-product" className="w-full">
                  <SelectValue>
                    {selectedProduct?.name ?? "Selecciona producto"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.base_unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-qty" className="text-xs">
                Cantidad {selectedProduct && `(${selectedProduct.base_unit})`}
              </Label>
              <Input
                id="ing-qty"
                name="quantity"
                type="number"
                step="any"
                min="0"
                required
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <AddSubmit />
            </div>
          </div>
        </form>
      )}

      {canEdit && availableProducts.length === 0 && ingredients.length > 0 && (
        <p className="rounded-lg border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
          Ya agregaste todos tus productos. Crea más productos en /productos
          para usarlos como ingredientes.
        </p>
      )}
    </div>
  )
}
