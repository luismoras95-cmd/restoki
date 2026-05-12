"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Truck } from "lucide-react"
import { toast } from "sonner"

import { deleteSupplier } from "@/lib/actions/suppliers"
import { EmptyState } from "@/components/empty-state"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface SuppliersListProps {
  suppliers: Tables<"suppliers">[]
  canEdit: boolean
}

type SheetState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; supplier: Tables<"suppliers"> }

export function SuppliersList({ suppliers, canEdit }: SuppliersListProps) {
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const [toDelete, setToDelete] = useState<Tables<"suppliers"> | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    if (!toDelete) return
    const target = toDelete
    startTransition(async () => {
      try {
        await deleteSupplier(target.id)
        toast.success("Proveedor eliminado.")
        setToDelete(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      }
    })
  }

  const newButton = canEdit ? (
    <SheetTrigger
      render={
        <Button onClick={() => setSheet({ open: true, mode: "create" })} />
      }
    >
      <Plus className="size-4" />
      Nuevo proveedor
    </SheetTrigger>
  ) : null

  return (
    <>
      <Sheet
        open={sheet.open}
        onOpenChange={(open) => !open && setSheet({ open: false })}
      >
        <div className="flex justify-end">{newButton}</div>
        <SheetContent side="right" className="w-full p-6 sm:max-w-md">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>
              {sheet.open && sheet.mode === "edit"
                ? "Editar proveedor"
                : "Nuevo proveedor"}
            </SheetTitle>
            <SheetDescription>
              Información de contacto y notas internas.
            </SheetDescription>
          </SheetHeader>
          {sheet.open && (
            <SupplierForm
              mode={sheet.mode}
              supplier={sheet.mode === "edit" ? sheet.supplier : undefined}
              onSuccess={() => setSheet({ open: false })}
            />
          )}
        </SheetContent>

        {suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aún no tienes proveedores"
            description={
              canEdit
                ? "Click 'Nuevo proveedor' arriba para agregar el primero."
                : "Agrega proveedores para asociarlos a productos y compras."
            }
          />
        ) : null}
      </Sheet>

      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar proveedor</DialogTitle>
            <DialogDescription>
              {toDelete &&
                `¿Borrar "${toDelete.name}"? Los productos que lo tengan como proveedor por defecto perderán esa referencia.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {suppliers.length > 0 && (
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Contacto</TableHead>
              <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Correo</TableHead>
              {canEdit && <TableHead className="w-[100px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {s.contact_name ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {s.phone ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {s.email ?? "—"}
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
                            supplier: s,
                          })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar"
                        onClick={() => setToDelete(s)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </>
  )
}
