"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { createDraftTransfer } from "@/lib/actions/transfers"
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

interface NewTransferButtonProps {
  locations: Pick<Tables<"locations">, "id" | "name">[]
}

export function NewTransferButton({ locations }: NewTransferButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [fromId, setFromId] = useState<string>(locations[0]?.id ?? "")
  const [toId, setToId] = useState<string>(locations[1]?.id ?? "")
  const [notes, setNotes] = useState("")

  const fromName = locations.find((l) => l.id === fromId)?.name ?? "Selecciona"
  const toName = locations.find((l) => l.id === toId)?.name ?? "Selecciona"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("from_location_id", fromId)
    fd.set("to_location_id", toId)
    fd.set("notes", notes)

    startTransition(async () => {
      try {
        await createDraftTransfer(fd)
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  if (locations.length < 2) {
    return (
      <Button disabled title="Necesitas al menos 2 sucursales activas">
        <Plus className="size-4" />
        Nueva transferencia
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nueva transferencia
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
          <DialogDescription>
            Mueve stock entre sucursales. Después agregas líneas y la
            envías; el origen descuenta al envío y el destino suma al recibir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="from-loc">Origen *</Label>
              <Select value={fromId} onValueChange={(v) => v && setFromId(v)}>
                <SelectTrigger id="from-loc" className="w-full">
                  <SelectValue>{fromName}</SelectValue>
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
              <Label htmlFor="to-loc">Destino *</Label>
              <Select value={toId} onValueChange={(v) => v && setToId(v)}>
                <SelectTrigger id="to-loc" className="w-full">
                  <SelectValue>{toName}</SelectValue>
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
          </div>

          {fromId === toId && fromId !== "" && (
            <p className="text-sm text-destructive">
              Origen y destino deben ser sucursales distintas.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="tr-notes">Notas</Label>
            <Textarea
              id="tr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={
                pending || !fromId || !toId || fromId === toId
              }
            >
              {pending ? "Creando..." : "Crear borrador"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
