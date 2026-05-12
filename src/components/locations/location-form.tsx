"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  createLocation,
  updateLocation,
  type LocationActionState,
} from "@/lib/actions/locations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tables } from "@/types/db"

const INITIAL: LocationActionState = { status: "idle" }

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Guardando..."
        : mode === "create"
          ? "Crear sucursal"
          : "Guardar cambios"}
    </Button>
  )
}

interface LocationFormProps {
  mode: "create" | "edit"
  location?: Tables<"locations">
  onSuccess?: () => void
}

export function LocationForm({ mode, location, onSuccess }: LocationFormProps) {
  const action =
    mode === "create"
      ? createLocation
      : updateLocation.bind(null, location!.id)

  const [state, formAction] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      onSuccess?.()
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state, onSuccess])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={location?.name ?? ""}
          placeholder="Ej. Sucursal Centro"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          name="address"
          maxLength={280}
          rows={2}
          defaultValue={location?.address ?? ""}
          placeholder="Calle, número, colonia, ciudad"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Submit mode={mode} />
      </div>
    </form>
  )
}
