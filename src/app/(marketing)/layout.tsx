import Link from "next/link"
import { ChefHat, ArrowRight } from "lucide-react"

import { getCurrentUser } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <ChefHat className="size-5 text-primary" />
            <span>Restoki</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/precios"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Precios
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "sm" })}
              >
                Ir al dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/signup"
                  className={buttonVariants({ size: "sm" })}
                >
                  Empezar gratis
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-background">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-4 md:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <ChefHat className="size-4 text-primary" />
              Restoki
            </div>
            <p className="text-xs text-muted-foreground">
              Inventario, compras y transferencias para restaurantes con
              múltiples sucursales. Hecho en Hermosillo, México.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Producto
            </h4>
            <Link
              href="/precios"
              className="text-muted-foreground hover:text-foreground"
            >
              Precios
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              Iniciar sesión
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contacto
            </h4>
            <a
              href="mailto:hola@restoki.mx"
              className="text-muted-foreground hover:text-foreground"
            >
              hola@restoki.mx
            </a>
            <span className="text-xs text-muted-foreground">
              Hermosillo, Sonora · México
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Legal
            </h4>
            <Link
              href="/privacidad"
              className="text-muted-foreground hover:text-foreground"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-muted-foreground hover:text-foreground"
            >
              Términos
            </Link>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground md:px-6">
            <span>© {new Date().getFullYear()} Restoki</span>
            <span>Hecho por restauranteros, para restauranteros.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
