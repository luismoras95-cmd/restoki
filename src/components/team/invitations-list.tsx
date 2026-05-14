"use client"

import { useState, useTransition } from "react"
import { Send, X } from "lucide-react"
import { toast } from "sonner"

import {
  resendInvitation,
  revokeInvitation,
} from "@/lib/actions/team"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Enums } from "@/types/db"

type Role = Enums<"member_role">

type Invitation = {
  id: string
  email: string
  role: Role
  location_id: string | null
  location_name: string | null
  expires_at: string
  created_at: string
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  admin: "Admin",
  manager: "Gerente",
  staff: "Staff",
}

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

interface InvitationsListProps {
  invitations: Invitation[]
}

export function InvitationsList({ invitations }: InvitationsListProps) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleResend(inv: Invitation) {
    setBusyId(inv.id)
    startTransition(async () => {
      try {
        await resendInvitation(inv.id)
        toast.success(`Invitación reenviada a ${inv.email}.`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  function handleRevoke(inv: Invitation) {
    if (!confirm(`¿Revocar la invitación de ${inv.email}?`)) return
    setBusyId(inv.id)
    startTransition(async () => {
      try {
        await revokeInvitation(inv.id)
        toast.success(`Invitación revocada.`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {invitations.map((inv) => {
        const expired = new Date(inv.expires_at).getTime() < Date.now()
        const isBusy = pending && busyId === inv.id

        return (
          <li
            key={inv.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{inv.email}</p>
                <Badge variant="outline">{ROLE_LABEL[inv.role]}</Badge>
                {expired && <Badge variant="destructive">Expirada</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {inv.location_name
                  ? `Sucursal: ${inv.location_name}`
                  : "Acceso a todas las sucursales"}
                {" · Expira "}
                {dateFmt.format(new Date(inv.expires_at))}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleResend(inv)}
                disabled={isBusy}
              >
                <Send className="size-3.5" />
                Reenviar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Revocar invitación"
                onClick={() => handleRevoke(inv)}
                disabled={isBusy}
              >
                <X className="size-3.5 text-destructive" />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
