import Link from "next/link"
import { ChefHat } from "lucide-react"

import { ForgotPasswordForm } from "@/components/forgot-password-form"

export const metadata = { title: "Recuperar contraseña" }

export default function ForgotPasswordPage() {
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
            Recupera tu contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace para crear una nueva.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Te acordaste?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}
