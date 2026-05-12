import { Truck } from "lucide-react"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { SuppliersList } from "@/components/suppliers/suppliers-list"

export const metadata = { title: "Proveedores" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export default async function ProveedoresPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  const supabase = await createClient()
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("organization_id", org.id)
    .order("name", { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores con datos de contacto y notas."
      />
      {!suppliers || suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aún no tienes proveedores"
          description="Agrega proveedores para asociarlos a productos y compras."
        />
      ) : (
        <SuppliersList suppliers={suppliers} canEdit={canEdit} />
      )}
    </div>
  )
}
