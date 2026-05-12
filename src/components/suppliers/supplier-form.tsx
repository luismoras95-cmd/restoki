"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  createSupplier,
  updateSupplier,
  type SupplierActionState,
} from "@/lib/actions/suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tables } from "@/types/db"

const INITIAL: SupplierActionState = { status: "idle" }

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Guardando..."
        : mode === "create"
          ? "Crear proveedor"
          : "Guardar cambios"}
    </Button>
  )
}

interface SupplierFormProps {
  mode: "create" | "edit"
  supplier?: Tables<"suppliers">
  onSuccess?: () => void
}

export function SupplierForm({ mode, supplier, onSuccess }: SupplierFormProps) {
  const action =
    mode === "create"
      ? createSupplier
      : updateSupplier.bind(null, supplier!.id)

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
        <Label htmlFor="name">Nombre o razón social *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={supplier?.name ?? ""}
          placeholder="Ej. Distribuidora La Sonorense"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact_name">Persona de contacto</Label>
        <Input
          id="contact_name"
          name="contact_name"
          maxLength={120}
          defaultValue={supplier?.contact_name ?? ""}
          placeholder="Ej. Juan Pérez"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={supplier?.phone ?? ""}
            placeholder="Ej. 662 123 4567"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
            placeholder="ventas@proveedor.com"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          maxLength={500}
          rows={2}
          defaultValue={supplier?.notes ?? ""}
          placeholder="Días de visita, condiciones de pago, etc."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Submit mode={mode} />
      </div>
    </form>
  )
}
