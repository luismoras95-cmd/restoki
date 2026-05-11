import Link from "next/link"
import { ChefHat } from "lucide-react"

import { LoginForm } from "@/components/login-form"

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
            Entra a Restoki
          </h1>
          <p className="text-sm text-muted-foreground">
            Te mandamos un enlace por correo. Sin contraseñas.
          </p>
        </div>
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Primera vez?{" "}
        <span className="text-foreground">
          Usa cualquier correo, te creamos la cuenta automáticamente.
        </span>
      </p>
    </div>
  )
}
