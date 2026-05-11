import Link from "next/link"
import { ChefHat } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Iniciar sesión
            </Link>
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Empezar
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground md:px-6">
          <span>© {new Date().getFullYear()} Restoki</span>
          <span>Hecho por restauranteros, para restauranteros.</span>
        </div>
      </footer>
    </div>
  )
}
