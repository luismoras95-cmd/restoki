"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ChevronsUpDown } from "lucide-react"

import { setSelectedOrg } from "@/lib/actions/onboarding"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { OrgWithRole } from "@/lib/auth"

interface OrgSwitcherProps {
  current: OrgWithRole
  orgs: OrgWithRole[]
}

const ROLE_LABELS: Record<OrgWithRole["role"], string> = {
  owner: "Dueño",
  admin: "Administrador",
  manager: "Gerente",
  staff: "Equipo",
}

export function OrgSwitcher({ current, orgs }: OrgSwitcherProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(orgId: string) {
    if (orgId === current.id) return
    startTransition(async () => {
      await setSelectedOrg(orgId)
      router.refresh()
    })
  }

  if (orgs.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{current.name}</span>
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[current.role]}
          </span>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-2 py-1.5"
            disabled={pending}
            aria-label="Cambiar organización"
          />
        }
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="truncate text-sm font-medium">{current.name}</span>
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[current.role]}
          </span>
        </div>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => pick(org.id)}
            className="flex items-center gap-2"
          >
            <Building2 className="size-3.5 text-muted-foreground" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === current.id && (
              <Check className={cn("size-4 text-primary")} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
