"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Power, Store } from "lucide-react"
import { toast } from "sonner"

import { toggleLocationActive } from "@/lib/actions/locations"
import { EmptyState } from "@/components/empty-state"
import { LocationForm } from "@/components/locations/location-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

interface LocationsListProps {
  locations: Tables<"locations">[]
  canEdit: boolean
}

type SheetState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; location: Tables<"locations"> }

export function LocationsList({ locations, canEdit }: LocationsListProps) {
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const [pendingId, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function toggle(loc: Tables<"locations">) {
    setBusyId(loc.id)
    startTransition(async () => {
      try {
        await toggleLocationActive(loc.id, !loc.is_active)
        toast.success(
          loc.is_active ? "Sucursal desactivada." : "Sucursal activada."
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <>
      <Sheet
        open={sheet.open}
        onOpenChange={(open) => !open && setSheet({ open: false })}
      >
        {canEdit && (
          <div className="flex justify-end">
            <SheetTrigger
              render={
                <Button
                  onClick={() => setSheet({ open: true, mode: "create" })}
                />
              }
            >
              <Plus className="size-4" />
              Nueva sucursal
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="right" className="w-full p-6 sm:max-w-md">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>
              {sheet.open && sheet.mode === "edit"
                ? "Editar sucursal"
                : "Nueva sucursal"}
            </SheetTitle>
            <SheetDescription>
              {sheet.open && sheet.mode === "edit"
                ? "Actualiza los datos de tu sucursal."
                : "Agrega una sucursal nueva a tu organización."}
            </SheetDescription>
          </SheetHeader>
          {sheet.open && (
            <LocationForm
              mode={sheet.mode}
              location={sheet.mode === "edit" ? sheet.location : undefined}
              onSuccess={() => setSheet({ open: false })}
            />
          )}
        </SheetContent>
      </Sheet>

      {locations.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Aún no tienes sucursales"
          description={
            canEdit
              ? "Click 'Nueva sucursal' arriba para agregar la primera."
              : "Pide a un administrador que agregue sucursales."
          }
        />
      ) : (
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Dirección</TableHead>
              <TableHead>Estado</TableHead>
              {canEdit && <TableHead className="w-[100px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {loc.address ?? "—"}
                </TableCell>
                <TableCell>
                  {loc.is_active ? (
                    <Badge variant="secondary">Activa</Badge>
                  ) : (
                    <Badge variant="outline">Inactiva</Badge>
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
                            location: loc,
                          })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={loc.is_active ? "Desactivar" : "Activar"}
                        disabled={pendingId && busyId === loc.id}
                        onClick={() => toggle(loc)}
                      >
                        <Power className="size-3.5" />
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
