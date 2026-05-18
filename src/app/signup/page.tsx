import Link from "next/link"
import { ChefHat, Check } from "lucide-react"

import { SignupForm } from "@/components/signup-form"

export const metadata = { title: "Crear cuenta" }

const PERKS = [
  "14 días de prueba gratis, sin tarjeta",
  "Inventario en tiempo real por sucursal",
  "Foto del ticket → orden de compra automática (IA)",
  "Costo y margen de cada platillo en vivo",
  "Multi-usuario con permisos por sucursal",
]

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-base font-semibold tracking-tight"
      >
        <ChefHat className="size-5 text-primary" />
        <span>Restoki</span>
      </Link>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
        <div className="hidden flex-col gap-6 md:flex">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Empieza tu prueba gratis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              14 días con todo desbloqueado. Sin tarjeta.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm md:max-w-none">
          <div className="mb-6 flex flex-col gap-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Crea tu cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              14 días gratis. Sin tarjeta para empezar.
            </p>
          </div>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Al crear tu cuenta aceptas nuestros{" "}
            <Link href="/terminos" className="hover:underline">
              Términos
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
