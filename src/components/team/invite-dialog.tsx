"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"
import { Check, Copy } from "lucide-react"

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
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("No se pudo copiar. Cópialo manualmente.")
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={value} className="font-mono" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>
    </div>
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
  // Las credenciales solo se muestran justo después de crearlas. Al cerrar el
  // panel marcamos "acknowledged" para no reabrirlas (el state de la acción
  // persiste por useActionState).
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setEmail("")
      onOpenChange(false)
    } else if (state.status === "created") {
      toast.success(state.message)
      setAcknowledged(false)
      setEmail("")
      // No cerramos el diálogo: el dueño debe copiar las credenciales.
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

  const created = state.status === "created" && !acknowledged ? state : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {created ? "Cuenta creada" : "Agregar miembro"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Comparte estas credenciales con tu colaborador. Esta contraseña no se volverá a mostrar."
              : "Le crearemos una cuenta con una contraseña temporal que verás en pantalla para que se la compartas. No depende de correos."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <CopyField label="Correo" value={created.email} />
              <CopyField label="Contraseña temporal" value={created.tempPassword} />
            </div>
            <p className="text-sm text-muted-foreground">
              Tu colaborador podrá iniciar sesión con su correo y esta
              contraseña, y cambiarla después. Esta contraseña no se volverá a
              mostrar, así que cópiala ahora.
            </p>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => {
                  setAcknowledged(true)
                  onOpenChange(false)
                }}
              >
                Listo
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  )
}
