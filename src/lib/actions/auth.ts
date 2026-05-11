"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const SignInSchema = z.object({
  email: z.string().email("Correo no válido"),
})

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string }

export async function signInWithMagicLink(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Correo no válido",
    }
  }

  const supabase = await createClient()
  const headersList = await headers()
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "localhost:3000"}`

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return {
      status: "error",
      message: error.message,
    }
  }

  return { status: "sent", email: parsed.data.email }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}
