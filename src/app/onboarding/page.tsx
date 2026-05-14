import { redirect } from "next/navigation"

import { getCurrentOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OnboardingProgress } from "@/components/onboarding/progress"
import { OrgStep } from "@/components/onboarding/org-step"
import { LocationsStep } from "@/components/onboarding/locations-step"
import { CategoriesStep } from "@/components/onboarding/categories-step"
import { WelcomeStep } from "@/components/onboarding/welcome-step"

const TITLES: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Crea tu organización",
    subtitle: "Empezamos con los datos básicos del restaurante o cadena.",
  },
  2: {
    title: "Agrega tus sucursales",
    subtitle: "Cada sucursal tiene su propio inventario.",
  },
  3: {
    title: "Categorías iniciales",
    subtitle: "Te sugerimos algunas. Quita las que no uses y agrega las propias.",
  },
  4: {
    title: "Todo listo",
    subtitle: "Ya puedes empezar a operar.",
  },
}

interface OnboardingPageProps {
  searchParams: Promise<{ step?: string }>
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  await requireUser()

  const params = await searchParams
  const rawStep = Number.parseInt(params.step ?? "1", 10)
  const step = Number.isFinite(rawStep) && rawStep >= 1 && rawStep <= 4
    ? rawStep
    : 1

  const org = await getCurrentOrg()

  // Si el usuario NO tiene org pero SÍ tiene una invitación pendiente
  // (porque fue invitado pero se logueó por otra ruta), llévalo a aceptarla
  // en lugar de mandarlo a crear otra org.
  if (!org && step === 1) {
    const supabase = await createClient()
    const { data: pendingInvitations } = await supabase.rpc(
      "get_my_pending_invitation"
    )
    const pending = pendingInvitations?.[0]
    if (pending) {
      redirect(`/auth/accept-invite?token=${pending.token}`)
    }
  }

  // Pasos 2-4 requieren org. Si no hay, regresa al paso 1.
  if (step >= 2 && !org) {
    redirect("/onboarding?step=1")
  }

  // Paso 1 con org ya existente: dejamos pasar (el user puede crear otra)
  // pero realmente lo común es que ya esté en /dashboard.
  if (step === 1 && org) {
    redirect("/dashboard")
  }

  const meta = TITLES[step]!

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <OnboardingProgress current={step} />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        </div>
        {step === 1 && <OrgStep />}
        {step === 2 && <LocationsStep />}
        {step === 3 && <CategoriesStep />}
        {step === 4 && org && <WelcomeStep orgName={org.name} />}
      </div>
    </div>
  )
}
