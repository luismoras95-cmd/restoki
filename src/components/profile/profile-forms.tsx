"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  updateProfile,
  changePassword,
  type ProfileState,
} from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL: ProfileState = { status: "idle" }

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string
  fullName: string
  phone: string
}) {
  const [state, action] = useActionState(updateProfile, INITIAL)

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    else if (state.status === "error") toast.error(state.message)
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nombre</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          placeholder="Tu nombre"
          maxLength={120}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          placeholder="+52 662 000 0000"
          maxLength={30}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" value={email} readOnly disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">
          El correo no se puede cambiar desde aquí.
        </p>
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
      </div>
    </form>
  )
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, INITIAL)

  useEffect(() => {
    if (state.status === "success") toast.success(state.message)
    else if (state.status === "error") toast.error(state.message)
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password">Confirmar contraseña</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          required
        />
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton label="Cambiar contraseña" pendingLabel="Guardando..." />
      </div>
    </form>
  )
}
