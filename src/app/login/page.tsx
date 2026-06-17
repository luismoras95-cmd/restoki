import Link from "next/link"
import { ChefHat } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { WebOnly } from "@/components/web-only"

export const metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-base font-semibold tracking-tight"
      >
        <ChefHat className="size-5 text-primary" />
        <span>Restoki</span>
      </Link>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Inicia sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Entra a tu cuenta de Restoki.
          </p>
        </div>
        <LoginForm />
      </div>
      <WebOnly>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Empieza tu prueba gratis
          </Link>
        </p>
      </WebOnly>
    </div>
  )
}
