"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { createDraftPO } from "@/lib/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

interface NewPOButtonProps {
  locations: Pick<Tables<"locations">, "id" | "name">[]
  suppliers: Pick<Tables<"suppliers">, "id" | "name">[]
}

export function NewPOButton({ locations, suppliers }: NewPOButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "")
  const [supplierId, setSupplierId] = useState<string>("")
  const [notes, setNotes] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("location_id", locationId)
    fd.set("supplier_id", supplierId)
    fd.set("notes", notes)

    startTransition(async () => {
      try {
        await createDraftPO(fd)
      } catch (err) {
        // redirect() throws NEXT_REDIRECT which we should NOT catch as error
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Error desconocido")
      }
    })
  }

  const selectedLocation = locations.find((l) => l.id === locationId)
  const selectedSupplier = suppliers.find((s) => s.id === supplierId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nueva compra
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva orden de compra</DialogTitle>
          <DialogDescription>
            Crea un borrador. Después agregas las líneas (producto + cantidad
            + costo) y la marcas como enviada y recibida.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="po-location">Sucursal destino *</Label>
            <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
              <SelectTrigger id="po-location" className="w-full">
                <SelectValue>
                  {selectedLocation?.name ?? "Selecciona sucursal"}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="po-supplier">Proveedor</Label>
            <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
              <SelectTrigger id="po-supplier" className="w-full">
                <SelectValue>
                  {selectedSupplier?.name ?? "— Sin proveedor —"}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="po-notes">Notas</Label>
            <Textarea
              id="po-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Fecha esperada, condiciones, etc."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={pending || !locationId}
            >
              {pending ? "Creando..." : "Crear borrador"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
