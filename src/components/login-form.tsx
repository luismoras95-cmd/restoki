"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, CheckCircle2, Lock, Mail, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  signInWithMagicLink,
  signInWithPassword,
  type AuthState,
} from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL: AuthState = { status: "idle" }

type Mode = "password" | "magic"

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending
        ? "Procesando..."
        : mode === "password"
          ? "Iniciar sesión"
          : "Enviar enlace de acceso"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password")
  const [passwordState, passwordAction] = useActionState(
    signInWithPassword,
    INITIAL
  )
  const [magicState, magicAction] = useActionState(
    signInWithMagicLink,
    INITIAL
  )

  const state = mode === "password" ? passwordState : magicState
  const action = mode === "password" ? passwordAction : magicAction

  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state])

  if (mode === "magic" && magicState.status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Te enviamos un enlace de acceso a{" "}
          <span className="font-medium text-foreground">
            {magicState.email}
          </span>
          . Ábrelo desde el mismo navegador para entrar.
        </p>
        <p className="text-xs text-muted-foreground">
          ¿No llegó? Revisa spam o intenta de nuevo en unos minutos.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="pl-9"
          />
        </div>
      </div>

      {mode === "password" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ¿La olvidaste?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
      )}

      <SubmitButton mode={mode} />

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
        className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {mode === "password" ? (
          <>
            <Sparkles className="size-3" />
            Mejor iniciar sesión con un enlace por correo
          </>
        ) : (
          <>
            <Lock className="size-3" />
            Mejor con correo y contraseña
          </>
        )}
      </button>
    </form>
  )
}
