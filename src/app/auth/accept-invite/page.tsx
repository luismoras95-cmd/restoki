import Link from "next/link"
import { cookies } from "next/headers"
import { CheckCircle2, MailCheck, XCircle } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUser, SELECTED_ORG_COOKIE } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Aceptar invitación" }

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  manager: "Gerente",
  staff: "Staff (acceso limitado)",
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <Status
        tone="error"
        title="Falta el token de invitación"
        description="El enlace que abriste no es válido. Pídele al admin que te reenvíe la invitación."
      />
    )
  }

  const supabase = await createClient()
  const { data: peekData } = await supabase.rpc("peek_invitation", {
    p_token: token,
  })
  const inv = peekData?.[0]

  if (!inv) {
    return (
      <Status
        tone="error"
        title="Invitación no encontrada"
        description="El enlace no existe o ya fue revocado. Pídele al admin que te reenvíe la invitación."
      />
    )
  }

  if (inv.accepted_at) {
    return (
      <Status
        tone="info"
        title="Esta invitación ya fue aceptada"
        description={`Ya eres parte de ${inv.organization_name}. Inicia sesión para continuar.`}
        primaryHref="/login"
        primaryLabel="Ir a iniciar sesión"
      />
    )
  }

  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return (
      <Status
        tone="error"
        title="Esta invitación expiró"
        description={`El enlace caducó el ${new Date(inv.expires_at).toLocaleDateString("es-MX")}. Pide al admin que te genere uno nuevo.`}
      />
    )
  }

  const user = await getCurrentUser()

  if (!user) {
    return (
      <Status
        tone="info"
        title={`Te invitaron a ${inv.organization_name}`}
        description={`Necesitas iniciar sesión con el correo "${inv.email}" para aceptar la invitación. Si llegaste por el email original, vuelve a hacer click en ese enlace; te logueará y aceptará la invitación automáticamente.`}
        primaryHref={`/login?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
        primaryLabel="Ir a iniciar sesión"
        meta={[
          { label: "Organización", value: inv.organization_name },
          { label: "Correo invitado", value: inv.email },
          { label: "Rol", value: ROLE_LABEL[inv.role] ?? inv.role },
          ...(inv.location_name
            ? [{ label: "Sucursal", value: inv.location_name }]
            : []),
        ]}
      />
    )
  }

  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return (
      <Status
        tone="error"
        title="El correo no coincide"
        description={`Iniciaste sesión como "${user.email}" pero la invitación es para "${inv.email}". Cierra sesión y vuelve a abrir el enlace del email original.`}
        primaryHref="/dashboard"
        primaryLabel="Ir al panel"
      />
    )
  }

  const { data: orgIdData, error: acceptErr } = await supabase.rpc(
    "accept_invitation",
    { p_token: token }
  )

  if (acceptErr || !orgIdData) {
    return (
      <Status
        tone="error"
        title="No se pudo aceptar la invitación"
        description={acceptErr?.message ?? "Intenta de nuevo."}
        primaryHref="/dashboard"
        primaryLabel="Ir al panel"
      />
    )
  }

  // Auto-selecciona la org aceptada para esta sesión.
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_ORG_COOKIE, orgIdData, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  return (
    <Status
      tone="success"
      title={`¡Bienvenido a ${inv.organization_name}!`}
      description={`Quedaste como ${ROLE_LABEL[inv.role] ?? inv.role}${inv.location_name ? ` en la sucursal ${inv.location_name}` : ""}. Ya puedes empezar a usar Restoki.`}
      primaryHref="/dashboard"
      primaryLabel="Entrar al panel"
    />
  )
}

interface StatusProps {
  tone: "success" | "error" | "info"
  title: string
  description: string
  primaryHref?: string
  primaryLabel?: string
  meta?: { label: string; value: string }[]
}

function Status({
  tone,
  title,
  description,
  primaryHref,
  primaryLabel,
  meta,
}: StatusProps) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : MailCheck
  const iconColor =
    tone === "success"
      ? "text-emerald-500"
      : tone === "error"
        ? "text-destructive"
        : "text-primary"

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Icon className={cn("size-16", iconColor)} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {meta && meta.length > 0 && (
        <dl className="flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left text-sm">
          {meta.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{m.label}</dt>
              <dd className="font-medium">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {primaryHref && primaryLabel && (
        <Link href={primaryHref} className={buttonVariants()}>
          {primaryLabel}
        </Link>
      )}
    </div>
  )
}
