"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  updateOrganization,
  type UpdateOrgState,
} from "@/lib/actions/org"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OrgWithRole } from "@/lib/auth"

const INITIAL: UpdateOrgState = { status: "idle" }

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  )
}

interface OrgFormProps {
  org: OrgWithRole & { address?: string | null }
  canEdit: boolean
}

export function OrgForm({ org, canEdit }: OrgFormProps) {
  const [state, formAction] = useActionState(updateOrganization, INITIAL)

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    if (state.status === "error") toast.error(state.message)
  }, [state])

  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-4"
      key={org.updated_at ?? org.id}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={org.name}
          disabled={!canEdit}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rfc">RFC</Label>
        <Input
          id="rfc"
          name="rfc"
          maxLength={13}
          defaultValue={org.rfc ?? ""}
          placeholder="Ej. PAF240115AB1"
          autoCapitalize="characters"
          disabled={!canEdit}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Dirección fiscal</Label>
        <Textarea
          id="address"
          name="address"
          maxLength={280}
          rows={2}
          defaultValue={org.address ?? ""}
          placeholder="Calle, número, colonia, ciudad"
          disabled={!canEdit}
        />
      </div>
      {canEdit ? (
        <div className="flex">
          <Submit />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo el dueño o un administrador puede editar estos datos.
        </p>
      )}
    </form>
  )
}
