"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/lib/actions/products"
import { CategoryManager } from "@/components/products/category-manager"
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
import type { Tables } from "@/types/db"

const INITIAL: ProductActionState = { status: "idle" }

const BASE_UNIT_LABELS: Record<string, string> = {
  kg: "Kilogramos (kg)",
  g: "Gramos (g)",
  l: "Litros (l)",
  ml: "Mililitros (ml)",
  pieza: "Pieza",
}

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Guardando..."
        : mode === "create"
          ? "Crear producto"
          : "Guardar cambios"}
    </Button>
  )
}

interface ProductFormProps {
  mode: "create" | "edit"
  product?: Tables<"products">
  categories: Pick<Tables<"categories">, "id" | "name">[]
  suppliers: Pick<Tables<"suppliers">, "id" | "name">[]
  onSuccess?: () => void
}

export function ProductForm({
  mode,
  product,
  categories,
  suppliers,
  onSuccess,
}: ProductFormProps) {
  const action =
    mode === "create" ? createProduct : updateProduct.bind(null, product!.id)

  const [state, formAction] = useActionState(action, INITIAL)

  // Estado controlado para los selects (workaround del bug de base-ui que
  // muestra el value crudo en lugar del ItemText en triggers).
  const [baseUnit, setBaseUnit] = useState<string>(
    product?.base_unit ?? "kg"
  )
  const [categoryId, setCategoryId] = useState<string>(
    product?.category_id ?? ""
  )
  const [supplierId, setSupplierId] = useState<string>(
    product?.default_supplier_id ?? ""
  )

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      onSuccess?.()
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state, onSuccess])

  const categoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "— Sin categoría —"
  const supplierName =
    suppliers.find((s) => s.id === supplierId)?.name ?? "— Ninguno —"

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={product?.name ?? ""}
          placeholder="Ej. Harina de trigo"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="base_unit">Unidad base *</Label>
          <Select
            name="base_unit"
            value={baseUnit}
            onValueChange={(v) => v && setBaseUnit(v)}
          >
            <SelectTrigger id="base_unit" className="w-full">
              <SelectValue>{BASE_UNIT_LABELS[baseUnit] ?? baseUnit}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BASE_UNIT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mode === "edit" && product?.sku && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              maxLength={40}
              defaultValue={product.sku}
              readOnly
              className="bg-muted/40"
            />
            <p className="text-xs text-muted-foreground">
              Generado automáticamente al crear el producto.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="purchase_unit">
            Unidad de compra
            <span className="text-xs font-normal text-muted-foreground">
              {" "}(opcional)
            </span>
          </Label>
          <Input
            id="purchase_unit"
            name="purchase_unit"
            maxLength={40}
            defaultValue={product?.purchase_unit ?? ""}
            placeholder="Ej. caja, costal"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="units_per_purchase">Unidades por compra</Label>
          <Input
            id="units_per_purchase"
            name="units_per_purchase"
            type="number"
            step="any"
            min="0"
            defaultValue={product?.units_per_purchase ?? ""}
            placeholder="Ej. 12"
          />
          <p className="text-xs text-muted-foreground">
            Cuántas unidades base trae una unidad de compra.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <Label htmlFor="category_id">Categoría</Label>
          <CategoryManager categories={categories} />
        </div>
        <Select
          name="category_id"
          value={categoryId}
          onValueChange={(v) => setCategoryId(v ?? "")}
        >
          <SelectTrigger id="category_id" className="w-full">
            <SelectValue>{categoryName}</SelectValue>
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="default_supplier_id">Proveedor por defecto</Label>
        <Select
          name="default_supplier_id"
          value={supplierId}
          onValueChange={(v) => setSupplierId(v ?? "")}
        >
          <SelectTrigger id="default_supplier_id" className="w-full">
            <SelectValue>{supplierName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Ninguno —</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="default_cost">Costo estimado (MXN)</Label>
          <Input
            id="default_cost"
            name="default_cost"
            type="number"
            step="any"
            min="0"
            defaultValue={
              product && "default_cost" in product
                ? ((product as { default_cost?: number | null }).default_cost ?? "")
                : ""
            }
            placeholder="Ej. 25.50"
          />
          <p className="text-xs text-muted-foreground">
            Se prefilla al agregar líneas en compras. El CPP real lo calcula
            la app con los costos de cada recepción.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="min_stock">Stock mínimo</Label>
          <Input
            id="min_stock"
            name="min_stock"
            type="number"
            step="any"
            min="0"
            defaultValue={product?.min_stock ?? 0}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Si el stock baja de aquí, sale badge de alerta.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Submit mode={mode} />
      </div>
    </form>
  )
}
