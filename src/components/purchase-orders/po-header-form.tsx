"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  updatePOHeader,
  type POActionState,
} from "@/lib/actions/purchase-orders"
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

const INITIAL: POActionState = { status: "idle" }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  )
}

interface POHeaderFormProps {
  poId: string
  defaultLocationId: string
  defaultSupplierId: string | null
  defaultNotes: string | null
  locations: Pick<Tables<"locations">, "id" | "name">[]
  suppliers: Pick<Tables<"suppliers">, "id" | "name">[]
}

export function POHeaderForm({
  poId,
  defaultLocationId,
  defaultSupplierId,
  defaultNotes,
  locations,
  suppliers,
}: POHeaderFormProps) {
  const action = updatePOHeader.bind(null, poId)
  const [state, formAction] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    if (state.status === "error") toast.error(state.message)
  }, [state])

  const defaultLocation = locations.find((l) => l.id === defaultLocationId)
  const defaultSupplier = defaultSupplierId
    ? suppliers.find((s) => s.id === defaultSupplierId)
    : null

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="po-location">Sucursal destino</Label>
        <Select name="location_id" defaultValue={defaultLocationId}>
          <SelectTrigger id="po-location" className="w-full">
            <SelectValue>
              {defaultLocation?.name ?? "Selecciona"}
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
        <Select name="supplier_id" defaultValue={defaultSupplierId ?? ""}>
          <SelectTrigger id="po-supplier" className="w-full">
            <SelectValue>
              {defaultSupplier?.name ?? "— Sin proveedor —"}
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
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="po-notes">Notas</Label>
        <Textarea
          id="po-notes"
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
