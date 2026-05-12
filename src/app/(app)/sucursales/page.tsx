import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { LocationsList } from "@/components/locations/locations-list"

export const metadata = { title: "Sucursales" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export default async function SucursalesPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  const supabase = await createClient()
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sucursales"
        description="Cada sucursal tiene su propio inventario. Desactiva las que ya no operes."
      />
      <LocationsList locations={locations ?? []} canEdit={canEdit} />
    </div>
  )
}
