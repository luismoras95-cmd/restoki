"use server"

import { randomInt } from "node:crypto"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireOrg } from "@/lib/auth"

const EDITOR_ROLES = new Set(["owner", "admin"])

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  role: z.enum(["admin", "manager", "staff"]),
  location_id: z.string().uuid().nullable(),
})

const UpdateSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "manager", "staff"]),
  location_id: z.string().uuid().nullable(),
})

export type TeamActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "created"; email: string; tempPassword: string; message: string }
  | { status: "error"; message: string }

// Genera una contraseña temporal legible y segura (12 chars), evitando
// caracteres ambiguos (0/O, 1/l/I, etc.) para que sea fácil de dictar.
function generateTempPassword(length = 12): string {
  // Sets sin caracteres ambiguos (0/O, 1/l/I) para dictar fácil.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const digits = "23456789"
  const all = upper + lower + digits
  const pick = (set: string) => set[randomInt(set.length)]
  // Garantiza al menos 1 mayúscula, 1 minúscula y 1 dígito (cumple
  // cualquier política de "letras y números").
  const required = [pick(upper), pick(lower), pick(digits)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    pick(all)
  )
  const out = [...required, ...rest]
  // Mezcla (Fisher-Yates) para que los obligatorios no queden al inicio.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join("")
}

export async function inviteMember(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Solo dueños y admins pueden invitar." }
  }

  const rawLocation = formData.get("location_id")
  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    location_id: rawLocation && rawLocation !== "" ? rawLocation : null,
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  if (parsed.data.role === "staff" && !parsed.data.location_id) {
    return {
      status: "error",
      message:
        "Para el rol 'staff' debes asignar una sucursal. Si quieres acceso a todas, usa rol 'manager'.",
    }
  }

  const supabase = await createClient()

  if (parsed.data.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.location_id)
      .eq("organization_id", org.id)
      .single()
    if (!loc) {
      return { status: "error", message: "Sucursal no válida." }
    }
  }

  // Nuevo flujo: el dueño crea la cuenta del colaborador con una contraseña
  // temporal que ve en pantalla y le comparte. No depende de email.
  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: parsed.data.email,
      password: tempPassword,
      email_confirm: true,
    }
  )

  if (createErr || !created?.user) {
    const msg = (createErr?.message ?? "").toLowerCase()
    if (
      msg.includes("already been registered") ||
      msg.includes("already exists") ||
      msg.includes("already registered")
    ) {
      return {
        status: "error",
        message:
          "Ese correo ya tiene una cuenta en Restoki. Pídele que inicie sesión, o usa otro correo.",
      }
    }
    return {
      status: "error",
      message: createErr?.message ?? "No se pudo crear la cuenta.",
    }
  }

  const { error: membershipErr } = await admin.from("memberships").insert({
    organization_id: org.id,
    user_id: created.user.id,
    role: parsed.data.role,
    location_id: parsed.data.location_id,
  })

  if (membershipErr) {
    if (membershipErr.code === "23505") {
      return {
        status: "error",
        message: "Ese usuario ya es miembro de esta organización.",
      }
    }
    return {
      status: "error",
      message: membershipErr.message ?? "No se pudo agregar el miembro.",
    }
  }

  revalidatePath("/configuracion")
  return {
    status: "created",
    email: parsed.data.email,
    tempPassword,
    message: `Cuenta creada para ${parsed.data.email}.`,
  }
}

export async function revokeInvitation(invitationId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", org.id)
    .is("accepted_at", null)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion")
}

export async function resendInvitation(invitationId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()
  const { data: inv } = await supabase
    .from("invitations")
    .select("email, token, expires_at, accepted_at")
    .eq("id", invitationId)
    .eq("organization_id", org.id)
    .single()

  if (!inv) throw new Error("Invitación no encontrada.")
  if (inv.accepted_at) throw new Error("Ya fue aceptada.")

  const headersList = await headers()
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "restoki.mx"}`

  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: inv.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  })

  if (otpErr) throw new Error(otpErr.message)

  revalidatePath("/configuracion")
}

export async function removeMember(membershipId: string) {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()
  const { data: target } = await supabase
    .from("memberships")
    .select("id, user_id, role")
    .eq("id", membershipId)
    .eq("organization_id", org.id)
    .single()

  if (!target) throw new Error("Miembro no encontrado.")

  if (target.user_id === user.id) {
    throw new Error("No puedes eliminarte a ti mismo desde aquí.")
  }

  if (target.role === "owner") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("role", "owner")
    if ((count ?? 0) <= 1) {
      throw new Error("No puedes eliminar al último dueño.")
    }
  }

  if (target.role === "owner" && org.role !== "owner") {
    throw new Error("Solo otro dueño puede eliminar a un dueño.")
  }

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion")
}

export async function updateMembership(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const rawLocation = formData.get("location_id")
  const parsed = UpdateSchema.safeParse({
    membership_id: formData.get("membership_id"),
    role: formData.get("role"),
    location_id: rawLocation && rawLocation !== "" ? rawLocation : null,
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  if (parsed.data.role === "staff" && !parsed.data.location_id) {
    return {
      status: "error",
      message: "Para 'staff' asigna una sucursal.",
    }
  }

  const supabase = await createClient()
  const { data: target } = await supabase
    .from("memberships")
    .select("id, user_id, role, organization_id")
    .eq("id", parsed.data.membership_id)
    .eq("organization_id", org.id)
    .single()

  if (!target) {
    return { status: "error", message: "Miembro no encontrado." }
  }

  // Anti-escalation: solo owners pueden tocar a otros owners o ascender a owner.
  if (
    (target.role === "owner" || parsed.data.role === "owner") &&
    org.role !== "owner"
  ) {
    return {
      status: "error",
      message: "Solo un dueño puede asignar o cambiar el rol de dueño.",
    }
  }

  // No degradar al último owner.
  if (target.role === "owner" && parsed.data.role !== "owner") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("role", "owner")
    if ((count ?? 0) <= 1) {
      return {
        status: "error",
        message: "No puedes degradar al último dueño.",
      }
    }
  }

  if (parsed.data.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.location_id)
      .eq("organization_id", org.id)
      .single()
    if (!loc) {
      return { status: "error", message: "Sucursal no válida." }
    }
  }

  const { error } = await supabase
    .from("memberships")
    .update({
      role: parsed.data.role,
      location_id: parsed.data.location_id,
    })
    .eq("id", target.id)

  if (error) return { status: "error", message: error.message }

  revalidatePath("/configuracion")
  if (target.user_id === user.id) revalidatePath("/", "layout")
  return { status: "success", message: "Miembro actualizado." }
}

export async function acceptInvitationByToken(token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error("No se pudo aceptar la invitación.")

  return data as string // organization_id
}
