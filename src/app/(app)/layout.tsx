import { ChefHat } from "lucide-react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <ChefHat className="size-4 text-primary" />
            <span className="text-sm font-semibold text-sidebar-foreground">
              Navegación
            </span>
          </div>
          <AppSidebar />
        </aside>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
