import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { ProductsList } from "@/components/products/products-list"

export const metadata = { title: "Productos" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

export default async function ProductosPage() {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)

  const supabase = await createClient()

  const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "*, category:categories(id, name), default_supplier:suppliers(id, name)"
      )
      .eq("organization_id", org.id)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("name", { ascending: true }),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("name", { ascending: true }),
  ])

  const products = productsRes.data ?? []
  const categories = categoriesRes.data ?? []
  const suppliers = suppliersRes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="Catálogo con unidad base, factor de conversión y stock mínimo."
      />
      <ProductsList
        products={products}
        categories={categories}
        suppliers={suppliers}
        canEdit={canEdit}
      />
    </div>
  )
}
