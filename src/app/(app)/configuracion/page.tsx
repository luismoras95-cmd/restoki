import { requireOrg } from "@/lib/auth"
import { OrgForm } from "@/components/org-form"

export const metadata = { title: "Configuración" }

const EDITOR_ROLES = new Set(["owner", "admin"])

export default async function ConfiguracionPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Configuración de la organización
        </h1>
        <p className="text-sm text-muted-foreground">
          Datos fiscales y de contacto de tu organización en Restoki.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <OrgForm org={org} canEdit={canEdit} />
      </div>
    </div>
  )
}
