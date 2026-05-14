"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import { inviteMember, type TeamActionState } from "@/lib/actions/team"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tables, Enums } from "@/types/db"

const INITIAL: TeamActionState = { status: "idle" }

type Role = "admin" | "manager" | "staff"

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Administrador",
    description: "Acceso total — puede gestionar equipo y configuración.",
  },
  {
    value: "manager",
    label: "Gerente",
    description: "Acceso total a inventario y compras de TODAS las sucursales.",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Solo ve y mueve inventario de UNA sucursal asignada.",
  },
]

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Pick<Tables<"locations">, "id" | "name">[]
  currentUserRole: Enums<"member_role">
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar invitación"}
    </Button>
  )
}

export function InviteDialog({
  open,
  onOpenChange,
  locations,
  currentUserRole,
}: InviteDialogProps) {
  const [state, formAction] = useActionState(inviteMember, INITIAL)
  const [role, setRole] = useState<Role>("staff")
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "")
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setEmail("")
      onOpenChange(false)
    } else if (state.status === "error") {
      toast.error(state.message)
    }
  }, [state, onOpenChange])

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role)
  const requiresLocation = role === "staff"
  const showLocationField = role === "staff"

  // Solo owner puede invitar admins (anti-escalación)
  const availableRoles =
    currentUserRole === "owner"
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((r) => r.value !== "admin")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Le mandaremos un magic link por email. Al abrirlo se loguea y queda
            agregado automáticamente al equipo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Correo *</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="cocina@restaurante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Rol *</Label>
            <Select
              value={role}
              onValueChange={(v) => v && setRole(v as Role)}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue>
                  {selectedRole?.label ?? "Selecciona rol"}
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
            {selectedRole && (
              <p className="text-xs text-muted-foreground">
                {selectedRole.description}
              </p>
            )}
          </div>

          {showLocationField && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-location">
                Sucursal {requiresLocation ? "*" : ""}
              </Label>
              <Select
                value={locationId}
                onValueChange={(v) => v && setLocationId(v)}
              >
                <SelectTrigger id="invite-location" className="w-full">
                  <SelectValue>
                    {locations.find((l) => l.id === locationId)?.name ??
                      "Selecciona sucursal"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="location_id" value={locationId} />
            </div>
          )}

          {!showLocationField && (
            <input type="hidden" name="location_id" value="" />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
