"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, CheckCircle2, Mail } from "lucide-react"
import { toast } from "sonner"

import {
  requestPasswordReset,
  type AuthState,
} from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL: AuthState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar enlace de recuperación"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, INITIAL)

  useEffect(() => {
    if (state.status === "error") toast.error(state.message)
  }, [state])

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Te enviamos un enlace a{" "}
          <span className="font-medium text-foreground">{state.email}</span>.
          Ábrelo desde el mismo navegador para crear tu nueva contraseña.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="forgot-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="pl-9"
          />
        </div>
      </div>
      <SubmitButton />
    </form>
  )
}
