"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, ChefHat, LogOut, User as UserIcon } from "lucide-react"

import { signOut } from "@/lib/actions/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface AppHeaderProps {
  userEmail: string
}

function initials(email: string): string {
  const local = email.split("@")[0] ?? ""
  return local.slice(0, 2).toUpperCase() || "?"
}

export function AppHeader({ userEmail }: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menú"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <ChefHat className="size-5 text-primary" />
              Restoki
            </SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-base font-semibold tracking-tight"
      >
        <ChefHat className="size-5 text-primary" />
        <span>Restoki</span>
      </Link>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Menú de usuario"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials(userEmail)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs font-normal text-muted-foreground">
                Conectado como
              </span>
              <span className="truncate text-sm font-medium">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                render={
                  <button type="submit" className="w-full">
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </button>
                }
              />
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
