"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  updateTransferHeader,
  type TransferActionState,
} from "@/lib/actions/transfers"
import { Button } from "@/components/ui/button"
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

const INITIAL: TransferActionState = { status: "idle" }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  )
}

interface TransferHeaderFormProps {
  transferId: string
  defaultFromId: string
  defaultToId: string
  defaultNotes: string | null
  locations: Pick<Tables<"locations">, "id" | "name">[]
}

export function TransferHeaderForm({
  transferId,
  defaultFromId,
  defaultToId,
  defaultNotes,
  locations,
}: TransferHeaderFormProps) {
  const action = updateTransferHeader.bind(null, transferId)
  const [state, formAction] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    if (state.status === "error") toast.error(state.message)
  }, [state])

  const fromName = locations.find((l) => l.id === defaultFromId)?.name ?? "—"
  const toName = locations.find((l) => l.id === defaultToId)?.name ?? "—"

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="from-loc">Origen</Label>
        <Select name="from_location_id" defaultValue={defaultFromId}>
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
        <Label htmlFor="to-loc">Destino</Label>
        <Select name="to_location_id" defaultValue={defaultToId}>
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
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="tr-notes">Notas</Label>
        <Textarea
          id="tr-notes"
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={defaultNotes ?? ""}
        />
      </div>
      <div className="flex sm:col-span-2">
        <Submit />
      </div>
    </form>
  )
}
