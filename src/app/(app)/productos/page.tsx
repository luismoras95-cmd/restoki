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

  const [productsRes, categoriesRes, suppliersRes, inventoryRes] =
    await Promise.all([
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
      supabase
        .from("inventory")
        .select("product_id, quantity, average_cost")
        .eq("organization_id", org.id),
    ])

  const products = productsRes.data ?? []
  const categories = categoriesRes.data ?? []
  const suppliers = suppliersRes.data ?? []
  const inventory = inventoryRes.data ?? []

  // Agregar por producto sumando todas las sucursales y calculando
  // CPP global ponderado por cantidad.
  const totalsByProduct = new Map<
    string,
    { totalQty: number; totalValue: number }
  >()
  for (const row of inventory) {
    const qty = Number(row.quantity ?? 0)
    const cost = Number(row.average_cost ?? 0)
    const prev = totalsByProduct.get(row.product_id) ?? {
      totalQty: 0,
      totalValue: 0,
    }
    totalsByProduct.set(row.product_id, {
      totalQty: prev.totalQty + qty,
      totalValue: prev.totalValue + qty * cost,
    })
  }

  const enrichedProducts = products.map((p) => {
    const t = totalsByProduct.get(p.id) ?? { totalQty: 0, totalValue: 0 }
    const weightedCost = t.totalQty > 0 ? t.totalValue / t.totalQty : 0
    return {
      ...p,
      total_quantity: t.totalQty,
      weighted_cost: weightedCost,
      total_value: t.totalValue,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="Catálogo con unidad base, factor de conversión y stock mínimo. Incluye valor de inventario consolidado entre sucursales."
      />
      <ProductsList
        products={enrichedProducts}
        categories={categories}
        suppliers={suppliers}
        canEdit={canEdit}
      />
    </div>
  )
}
