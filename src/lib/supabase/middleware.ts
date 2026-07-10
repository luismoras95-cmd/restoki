import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/database"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/precios"]
// Las rutas /api/ manejan su propia autenticación (webhook de Stripe valida
// firma; keep-alive es de solo lectura). No deben redirigirse al login HTML.
const PUBLIC_PREFIXES = ["/auth/", "/api/"]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión y obtiene el usuario en una sola llamada.
  // No quitar este await ni meter código entre createServerClient y getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // Forward ?code= a /auth/callback (rescata magic links viejos
  // generados cuando Site URL apuntaba a la raíz).
  if (
    searchParams.has("code") &&
    pathname !== "/auth/callback"
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/callback"
    return NextResponse.redirect(url)
  }

  // Usuario no autenticado intentando entrar a una ruta privada → /login
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Usuario autenticado en /login → /dashboard
  // (el chequeo de "tiene org" lo hace el layout de (app), no el middleware,
  // para evitar un query DB en cada request)
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
