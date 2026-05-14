import Link from "next/link"
import { redirect } from "next/navigation"
import { ChefHat } from "lucide-react"

import { getCurrentUser } from "@/lib/auth"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata = { title: "Nueva contraseña" }

export default async function ResetPasswordPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/forgot-password?expired=1")
  }

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
            Nueva contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Estás conectado como{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
            Crea tu contraseña.
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
