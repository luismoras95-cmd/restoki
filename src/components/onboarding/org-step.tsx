"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import {
  createOrganization,
  type ActionState,
} from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL_STATE: ActionState = { status: "idle" }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Creando..." : "Crear organización"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

interface OrgStepProps {
  defaultName?: string
}

export function OrgStep({ defaultName }: OrgStepProps) {
  const [state, formAction] = useActionState(createOrganization, INITIAL_STATE)

  useEffect(() => {
    if (state.status === "error") toast.error(state.message)
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre del restaurante o cadena *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={defaultName}
          placeholder="Ej. Pancake Factory"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rfc">RFC (opcional)</Label>
        <Input
          id="rfc"
          name="rfc"
          maxLength={13}
          placeholder="Ej. PAF240115AB1"
          autoCapitalize="characters"
        />
        <p className="text-xs text-muted-foreground">
          Lo usaremos para facturas. Puedes agregarlo después.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Dirección fiscal (opcional)</Label>
        <Input
          id="address"
          name="address"
          maxLength={280}
          placeholder="Calle, número, colonia, ciudad"
        />
      </div>
      <Submit />
    </form>
  )
}
