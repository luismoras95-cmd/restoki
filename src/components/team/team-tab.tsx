"use client"

import { useState } from "react"
import { MailPlus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InviteDialog } from "./invite-dialog"
import { MembersList } from "./members-list"
import { InvitationsList } from "./invitations-list"
import type { Tables, Enums } from "@/types/db"

type Member = {
  membership_id: string
  user_id: string
  email: string
  role: Enums<"member_role">
  location_id: string | null
  location_name: string | null
  created_at: string
}

type Invitation = {
  id: string
  email: string
  role: Enums<"member_role">
  location_id: string | null
  location_name: string | null
  expires_at: string
  created_at: string
}

type Location = Pick<Tables<"locations">, "id" | "name">

interface TeamTabProps {
  members: Member[]
  invitations: Invitation[]
  locations: Location[]
  currentUserId: string
  currentUserRole: Enums<"member_role">
  canManageTeam: boolean
}

export function TeamTab({
  members,
  invitations,
  locations,
  currentUserId,
  currentUserRole,
  canManageTeam,
}: TeamTabProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Miembros ({members.length})
              </CardTitle>
              <CardDescription>
                Personas que ya tienen acceso a esta organización. Los miembros
                con rol &quot;staff&quot; solo ven la sucursal asignada.
              </CardDescription>
            </div>
            {canManageTeam && (
              <Button
                type="button"
                onClick={() => setInviteOpen(true)}
                disabled={locations.length === 0}
              >
                <MailPlus className="size-4" />
                Invitar miembro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 && canManageTeam && (
            <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Crea al menos una sucursal antes de invitar miembros (necesaria
              para el rol staff).
            </p>
          )}
          <MembersList
            members={members}
            locations={locations}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            canManageTeam={canManageTeam}
          />
        </CardContent>
      </Card>

      {canManageTeam && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Invitaciones pendientes ({invitations.length})
            </CardTitle>
            <CardDescription>
              Las invitaciones expiran a los 7 días. Puedes reenviar o revocar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationsList invitations={invitations} />
          </CardContent>
        </Card>
      )}

      {canManageTeam && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          locations={locations}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  )
}
