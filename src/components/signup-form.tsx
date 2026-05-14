"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react"
import { toast } from "sonner"

import {
  signUpWithPassword,
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
      {pending ? "Creando cuenta..." : "Empezar prueba gratis"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function SignupForm() {
  const [state, action] = useActionState(signUpWithPassword, INITIAL)

  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state])

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">Confirma tu correo</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Te mandamos un enlace de confirmación a{" "}
          <span className="font-medium text-foreground">{state.email}</span>.
          Ábrelo para activar tu cuenta y entrar.
        </p>
        <p className="text-xs text-muted-foreground">
          ¿No llegó? Revisa spam o intenta de nuevo.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="Mínimo 8 caracteres"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-confirm"
            name="confirm_password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="Repite tu contraseña"
            className="pl-9"
          />
        </div>
      </div>

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Al crear tu cuenta aceptas que enviemos correos transaccionales
        (facturas, alertas) a tu correo.
      </p>
    </form>
  )
}
