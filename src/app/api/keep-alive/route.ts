import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

// Evita cache: la consulta debe ejecutarse en cada llamada.
export const dynamic = "force-dynamic"

/**
 * Keep-alive: mantiene "activa" la base de Supabase para que el plan Free NO
 * la pause por inactividad (se pausa tras ~7 días sin actividad). Un cron de
 * Vercel (ver vercel.json) llama a esta ruta a diario y hace una consulta
 * trivial de solo lectura.
 *
 * NOTA: esto solo evita el auto-pausado. NO reemplaza los respaldos que trae
 * el plan Pro. Es un parche mientras se decide subir a Pro.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    // head: true -> no trae filas, solo hace el request (cuenta como actividad).
    const { error } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
