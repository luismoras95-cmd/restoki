"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, Lock } from "lucide-react"
import { toast } from "sonner"

import { updatePassword, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL: AuthState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Guardando..." : "Guardar y entrar"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [state, action] = useActionState(updatePassword, INITIAL)

  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message)
    } else if (state.status === "success") {
      toast.success(state.message)
      router.push("/dashboard")
    }
  }, [state, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">Nueva contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-password"
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
        <Label htmlFor="new-confirm">Confirmar contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-confirm"
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
    </form>
  )
}
