"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export type ProfileState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const ProfileSchema = z.object({
  full_name: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
  phone: z.string().trim().max(30, "Teléfono muy largo").optional(),
})

/** Actualiza nombre y teléfono (guardados en user_metadata de Supabase Auth). */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const parsed = ProfileSchema.safeParse({
    full_name: (formData.get("full_name") as string) ?? "",
    phone: (formData.get("phone") as string) ?? "",
  })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.full_name || null,
      phone: parsed.data.phone || null,
    },
  })
  if (error) return { status: "error", message: error.message }

  revalidatePath("/perfil")
  revalidatePath("/", "layout")
  return { status: "success", message: "Datos de tu perfil actualizados." }
}

const PasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  })

/** Cambia la contraseña del usuario logueado. */
export async function changePassword(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const parsed = PasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return { status: "error", message: error.message }

  return { status: "success", message: "Contraseña actualizada." }
}

/** Guarda la URL de la foto de perfil (la subida del archivo va client-side). */
export async function saveAvatarUrl(
  url: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/perfil")
  revalidatePath("/", "layout")
  return { ok: true }
}
