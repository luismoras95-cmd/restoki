"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  removeMember,
  updateMembership,
  type TeamActionState,
} from "@/lib/actions/team"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tables, Enums } from "@/types/db"

type Role = Enums<"member_role">

type Member = {
  membership_id: string
  user_id: string
  email: string
  role: Role
  location_id: string | null
  location_name: string | null
  created_at: string
}

interface MembersListProps {
  members: Member[]
  locations: Pick<Tables<"locations">, "id" | "name">[]
  currentUserId: string
  currentUserRole: Role
  canManageTeam: boolean
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  admin: "Admin",
  manager: "Gerente",
  staff: "Staff",
}

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  manager: "outline",
  staff: "outline",
}

export function MembersList({
  members,
  locations,
  currentUserId,
  currentUserRole,
  canManageTeam,
}: MembersListProps) {
  const [editing, setEditing] = useState<Member | null>(null)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleRemove(member: Member) {
    if (
      !confirm(
        `¿Eliminar a ${member.email}? Pierde acceso inmediato a la organización.`
      )
    )
      return

    setBusyId(member.membership_id)
    startTransition(async () => {
      try {
        await removeMember(member.membership_id)
        toast.success(`${member.email} eliminado del equipo.`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      } finally {
        setBusyId(null)
      }
    })
  }

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Aún no hay miembros.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId
          const canEdit =
            canManageTeam &&
            !isSelf &&
            (currentUserRole === "owner" || m.role !== "owner")

          return (
            <li
              key={m.membership_id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{m.email}</p>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">(tú)</span>
                  )}
                  <Badge variant={ROLE_VARIANT[m.role]}>
                    {ROLE_LABEL[m.role]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.location_name
                    ? `Sucursal: ${m.location_name}`
                    : "Acceso a todas las sucursales"}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar miembro"
                    onClick={() => setEditing(m)}
                    disabled={pending}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Eliminar miembro"
                    onClick={() => handleRemove(m)}
                    disabled={pending && busyId === m.membership_id}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {editing && (
        <EditMemberDialog
          member={editing}
          locations={locations}
          currentUserRole={currentUserRole}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

const INITIAL: TeamActionState = { status: "idle" }

function EditMemberDialog({
  member,
  locations,
  currentUserRole,
  onClose,
}: {
  member: Member
  locations: Pick<Tables<"locations">, "id" | "name">[]
  currentUserRole: Role
  onClose: () => void
}) {
  const [state, formAction] = useActionState(updateMembership, INITIAL)
  const [role, setRole] = useState<Role>(member.role)
  const [locationId, setLocationId] = useState<string>(
    member.location_id ?? ""
  )

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      onClose()
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state, onClose])

  // Roles disponibles según permisos
  const availableRoles: { value: Role; label: string }[] = [
    ...(currentUserRole === "owner"
      ? [{ value: "owner" as Role, label: "Dueño" }]
      : []),
    ...(currentUserRole === "owner"
      ? [{ value: "admin" as Role, label: "Administrador" }]
      : []),
    { value: "manager" as Role, label: "Gerente" },
    { value: "staff" as Role, label: "Staff" },
  ]

  const requiresLocation = role === "staff"

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar miembro</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="membership_id"
            value={member.membership_id}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-role">Rol</Label>
            <Select
              value={role}
              onValueChange={(v) => v && setRole(v as Role)}
            >
              <SelectTrigger id="edit-role" className="w-full">
                <SelectValue>
                  {availableRoles.find((r) => r.value === role)?.label ?? role}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-location">
              Sucursal {requiresLocation ? "(obligatoria)" : "(opcional)"}
            </Label>
            <Select
              value={locationId}
              onValueChange={(v) => setLocationId(v ?? "")}
            >
              <SelectTrigger id="edit-location" className="w-full">
                <SelectValue>
                  {locations.find((l) => l.id === locationId)?.name ??
                    "— Acceso a todas —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {!requiresLocation && (
                  <SelectItem value="">— Acceso a todas —</SelectItem>
                )}
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="location_id" value={locationId} />
            <p className="text-xs text-muted-foreground">
              {requiresLocation
                ? "Staff necesita una sucursal específica."
                : "Si no asignas sucursal, ve todo el inventario de la org."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
