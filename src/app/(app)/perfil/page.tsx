import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { ProfileForm, PasswordForm } from "@/components/profile/profile-forms"

export const metadata = { title: "Mi perfil" }

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "?"
  const parts = source.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export default async function PerfilPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const email = user.email ?? ""
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string | null
    phone?: string | null
    avatar_url?: string | null
  }
  const fullName = meta.full_name ?? ""
  const phone = meta.phone ?? ""
  const avatarUrl = meta.avatar_url ?? null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Tu información personal y de acceso.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">Foto de perfil</h2>
        <AvatarUploader
          userId={user.id}
          initialUrl={avatarUrl}
          fallback={initialsFrom(fullName, email)}
        />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">Datos personales</h2>
        <ProfileForm email={email} fullName={fullName} phone={phone} />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold">Contraseña</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Cambia tu contraseña de acceso a Restoki.
        </p>
        <PasswordForm />
      </section>
    </div>
  )
}
