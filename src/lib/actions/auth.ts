"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const EmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
})

const PasswordLoginSchema = EmailSchema.extend({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
})

const SignUpSchema = EmailSchema.extend({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "Máximo 72 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
})

const NewPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "Máximo 72 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
})

export type AuthState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

async function getOrigin(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "restoki.mx"}`
  )
}

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = EmailSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Correo no válido",
    }
  }

  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) return { status: "error", message: error.message }
  return { status: "sent", email: parsed.data.email }
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = PasswordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      status: "error",
      message:
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos. ¿Te registraste con magic link? Usa 'Olvidé mi contraseña' para crear una."
          : error.message,
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
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
  const origin = await getOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        status: "error",
        message:
          "Este correo ya está registrado. Inicia sesión o usa 'Olvidé mi contraseña'.",
      }
    }
    return { status: "error", message: error.message }
  }

  if (data.session) {
    revalidatePath("/", "layout")
    redirect("/onboarding")
  }

  return {
    status: "sent",
    email: parsed.data.email,
  }
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = EmailSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Correo no válido",
    }
  }

  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` }
  )

  if (error) return { status: "error", message: error.message }
  return { status: "sent", email: parsed.data.email }
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = NewPasswordSchema.safeParse({
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      status: "error",
      message: "Sesión expirada. Vuelve a abrir el enlace del correo.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath("/", "layout")
  return {
    status: "success",
    message: "Contraseña actualizada. Te llevamos a tu panel.",
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}
