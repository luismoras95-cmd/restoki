import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Valida que `next` sea una ruta LOCAL ("/algo") y no una URL externa.
 * Rechaza "//evil.com", "/\\evil.com", "@evil.com", "http://..." etc.,
 * que convertirían la redirección en un open-redirect fuera del sitio.
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard"
  // Debe empezar con una sola "/" seguida de algo que no sea "/" ni "\".
  if (!/^\/(?![/\\])/.test(raw)) return "/dashboard"
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
