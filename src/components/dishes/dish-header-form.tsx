"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteDish,
  toggleDishActive,
  updateDish,
  type DishActionState,
} from "@/lib/actions/dishes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tables } from "@/types/db"

const INITIAL: DishActionState = { status: "idle" }

interface DishHeaderFormProps {
  dishId: string
  defaults: {
    name: string
    description: string | null
    category_id: string | null
    sale_price: number | null
    is_active: boolean
  }
  categories: Pick<Tables<"categories">, "id" | "name">[]
  canEdit: boolean
}

export function DishHeaderForm({
  dishId,
  defaults,
  categories,
  canEdit,
}: DishHeaderFormProps) {
  const updateAction = updateDish.bind(null, dishId)
  const [state, formAction] = useActionState(updateAction, INITIAL)
  const [name, setName] = useState(defaults.name)
  const [description, setDescription] = useState(defaults.description ?? "")
  const [categoryId, setCategoryId] = useState(defaults.category_id ?? "")
  const [salePrice, setSalePrice] = useState(
    defaults.sale_price != null ? String(defaults.sale_price) : ""
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    else if (state.status === "error") toast.error(state.message)
  }, [state])

  const selectedCategory = categories.find((c) => c.id === categoryId)

  function handleToggleActive() {
    startTransition(async () => {
      try {
        await toggleDishActive(dishId, !defaults.is_active)
        toast.success(
          defaults.is_active ? "Platillo desactivado." : "Platillo reactivado."
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  function handleDelete() {
    if (
      !confirm(
        "¿Eliminar este platillo? Se borran también sus ingredientes. No se puede deshacer."
      )
    )
      return
    startTransition(async () => {
      try {
        await deleteDish(dishId)
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  if (!canEdit) {
    return (
      <div className="grid grid-cols-1 gap-2 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Categoría</p>
          <p className="font-medium">
            {categories.find((c) => c.id === defaults.category_id)?.name ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Precio de venta</p>
          <p className="font-medium tabular-nums">
            {defaults.sale_price != null
              ? new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(defaults.sale_price)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estado</p>
          <p className="font-medium">
            {defaults.is_active ? "Activo" : "Inactivo"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="d-name">Nombre *</Label>
          <Input
            id="d-name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="d-category">Categoría</Label>
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v ?? "")}
          >
            <SelectTrigger id="d-category" className="w-full">
              <SelectValue>
                {selectedCategory?.name ?? "— Sin categoría —"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Sin categoría —</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="category_id" value={categoryId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="d-price">Precio de venta (MXN)</Label>
          <Input
            id="d-price"
            name="sale_price"
            type="number"
            step="any"
            min="0"
            placeholder="Ej. 120"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="d-desc">Descripción</Label>
          <Textarea
            id="d-desc"
            name="description"
            maxLength={500}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={pending}
          >
            {defaults.is_active ? "Desactivar" : "Reactivar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 className="size-3.5 text-destructive" />
            Eliminar
          </Button>
        </div>
        <Button type="submit">Guardar cambios</Button>
      </div>
    </form>
  )
}
