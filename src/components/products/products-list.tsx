"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, Pencil, Power, Search, Box, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteProduct, toggleProductActive } from "@/lib/actions/products"
import { EmptyState } from "@/components/empty-state"
import { ProductForm } from "@/components/products/product-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Tables } from "@/types/db"

export type ProductRow = Tables<"products"> & {
  category?: Pick<Tables<"categories">, "id" | "name"> | null
  default_supplier?: Pick<Tables<"suppliers">, "id" | "name"> | null
  total_quantity: number
  weighted_cost: number
  total_value: number
}

interface ProductsListProps {
  products: ProductRow[]
  categories: Pick<Tables<"categories">, "id" | "name">[]
  suppliers: Pick<Tables<"suppliers">, "id" | "name">[]
  canEdit: boolean
}

type SheetState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; product: Tables<"products"> }

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 })

export function ProductsList({
  products,
  categories,
  suppliers,
  canEdit,
}: ProductsListProps) {
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Tables<"products"> | null>(null)
  const [deleting, startDeleteTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false)
    )
  }, [products, query])

  const grandTotal = useMemo(
    () => filtered.reduce((sum, p) => sum + p.total_value, 0),
    [filtered]
  )

  function toggle(p: Tables<"products">) {
    setBusyId(p.id)
    startTransition(async () => {
      try {
        await toggleProductActive(p.id, !p.is_active)
        toast.success(
          p.is_active ? "Producto desactivado." : "Producto activado."
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      } finally {
        setBusyId(null)
      }
    })
  }

  function confirmDelete() {
    if (!toDelete) return
    const product = toDelete
    startDeleteTransition(async () => {
      try {
        await deleteProduct(product.id)
        toast.success("Producto eliminado definitivamente.")
        setToDelete(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      }
    })
  }

  const colCount = canEdit ? 8 : 7

  return (
    <>
      <Sheet
        open={sheet.open}
        onOpenChange={(open) => !open && setSheet({ open: false })}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU"
              className="pl-8"
            />
          </div>
          {canEdit && (
            <SheetTrigger
              render={
                <Button
                  onClick={() => setSheet({ open: true, mode: "create" })}
                />
              }
            >
              <Plus className="size-4" />
              Nuevo producto
            </SheetTrigger>
          )}
        </div>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-6 sm:max-w-lg"
        >
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>
              {sheet.open && sheet.mode === "edit"
                ? "Editar producto"
                : "Nuevo producto"}
            </SheetTitle>
            <SheetDescription>
              Define unidad base y, opcionalmente, factor de conversión.
            </SheetDescription>
          </SheetHeader>
          {sheet.open && (
            <ProductForm
              mode={sheet.mode}
              product={sheet.mode === "edit" ? sheet.product : undefined}
              categories={categories}
              suppliers={suppliers}
              onSuccess={() => setSheet({ open: false })}
            />
          )}
        </SheetContent>
      </Sheet>

      {products.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Aún no tienes productos"
          description={
            canEdit
              ? "Click 'Nuevo producto' arriba para agregar el primero."
              : "Pide a un administrador que agregue productos al catálogo."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">
                  Categoría
                </TableHead>
                <TableHead className="hidden xl:table-cell">SKU</TableHead>
                <TableHead className="text-right">Stock total</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  CPP
                </TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {p.category?.name ?? "Sin categoría"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {p.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {p.sku ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number.format(p.total_quantity)} {p.base_unit}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                        {p.weighted_cost > 0
                          ? currency.format(p.weighted_cost)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {p.total_value > 0
                          ? currency.format(p.total_value)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {p.is_active ? (
                          <Badge variant="secondary">Activo</Badge>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar"
                              onClick={() =>
                                setSheet({
                                  open: true,
                                  mode: "edit",
                                  product: p,
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={
                                p.is_active ? "Desactivar" : "Activar"
                              }
                              disabled={pending && busyId === p.id}
                              onClick={() => toggle(p)}
                            >
                              <Power className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Eliminar definitivamente"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setToDelete(p)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/30">
                    <TableCell
                      colSpan={colCount - 3}
                      className="text-right text-sm font-medium"
                    >
                      Total inventario valorado
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums font-semibold">
                      {currency.format(grandTotal)}
                    </TableCell>
                    <TableCell colSpan={canEdit ? 2 : 1} />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar producto definitivamente</DialogTitle>
            <DialogDescription>
              {toDelete ? (
                <>
                  Vas a eliminar <strong>{toDelete.name}</strong> de forma
                  PERMANENTE. Esto borra también su inventario y su historial de
                  movimientos. Esta acción no se puede deshacer.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={deleting} />}
            >
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
