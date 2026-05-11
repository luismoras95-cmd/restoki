import Link from "next/link"
import { ChefHat } from "lucide-react"

import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Configuración inicial" }

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
        <Link
          href="/onboarding"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <ChefHat className="size-5 text-primary" />
          <span>Restoki</span>
        </Link>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Salir
          </Button>
        </form>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}
