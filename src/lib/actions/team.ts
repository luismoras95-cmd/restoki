"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
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
  | { status: "error"; message: string }

export async function inviteMember(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { org, user } = await requireOrg()
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

  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .insert({
      organization_id: org.id,
      email: parsed.data.email,
      role: parsed.data.role,
      location_id: parsed.data.location_id,
      invited_by: user.id,
    })
    .select("token")
    .single()

  if (invErr || !inv) {
    if (invErr?.code === "23505") {
      return {
        status: "error",
        message: "Ya hay una invitación pendiente para este correo.",
      }
    }
    return {
      status: "error",
      message: invErr?.message ?? "No se pudo crear la invitación.",
    }
  }

  const headersList = await headers()
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "restoki.mx"}`

  const acceptPath = `/auth/accept-invite?token=${inv.token}`
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(acceptPath)}`,
      shouldCreateUser: true,
    },
  })

  if (otpErr) {
    return {
      status: "error",
      message: `Invitación creada pero falló el envío de email: ${otpErr.message}`,
    }
  }

  revalidatePath("/configuracion")
  return {
    status: "success",
    message: `Invitación enviada a ${parsed.data.email}.`,
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

  const acceptPath = `/auth/accept-invite?token=${inv.token}`
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: inv.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(acceptPath)}`,
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
