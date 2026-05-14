import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getAccessibleLocationIds, requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { DishHeaderForm } from "@/components/dishes/dish-header-form"
import { DishIngredientsEditor } from "@/components/dishes/dish-ingredients-editor"
import { DishCostCard } from "@/components/dishes/dish-cost-card"
import { LocationPicker } from "@/components/dishes/location-picker"
import { Badge } from "@/components/ui/badge"

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ location?: string }>
}

export default async function DishDetailPage({ params, searchParams }: PageProps) {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)
  const { id } = await params
  const sp = await searchParams

  const supabase = await createClient()

  const [dishRes, productsRes, categoriesRes, { data: allLocations }, accessibleIds] =
    await Promise.all([
      supabase
        .from("dishes")
        .select(
          "*, category:categories(id, name)"
        )
        .eq("id", id)
        .eq("organization_id", org.id)
        .single(),
      supabase
        .from("products")
        .select("id, name, base_unit, default_cost")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", org.id)
        .order("name", { ascending: true }),
      supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      getAccessibleLocationIds(),
    ])

  if (dishRes.error || !dishRes.data) notFound()

  const dish = dishRes.data
  const products = productsRes.data ?? []
  const categories = categoriesRes.data ?? []
  const locations = (allLocations ?? []).filter((l) => accessibleIds.has(l.id))

  const selectedLocationId =
    sp.location && locations.some((l) => l.id === sp.location)
      ? sp.location
      : (locations[0]?.id ?? null)

  const { data: ingredients } = selectedLocationId
    ? await supabase.rpc("list_dish_ingredients_with_costs", {
        p_dish_id: id,
        p_location_id: selectedLocationId,
      })
    : { data: null }

  const ingRows = ingredients ?? []
  const totalCost = ingRows.reduce(
    (sum, r) => sum + Number(r.subtotal ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/recetas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Recetas
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {dish.name}
            </h1>
            {!dish.is_active && <Badge variant="outline">Inactivo</Badge>}
          </div>
          {dish.description && (
            <p className="text-sm text-muted-foreground">{dish.description}</p>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Datos
        </h2>
        <DishHeaderForm
          dishId={id}
          defaults={{
            name: dish.name,
            description: dish.description,
            category_id: dish.category_id,
            sale_price: dish.sale_price,
            is_active: dish.is_active ?? true,
          }}
          categories={categories}
          canEdit={canEdit}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ingredientes y costo
          </h2>
          {selectedLocationId && locations.length > 1 && (
            <LocationPicker
              locations={locations}
              selected={selectedLocationId}
            />
          )}
        </div>

        {!selectedLocationId ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No tienes sucursales activas accesibles.
          </p>
        ) : (
          <>
            <DishCostCard
              cost={totalCost}
              salePrice={dish.sale_price != null ? Number(dish.sale_price) : null}
              ingredientCount={ingRows.length}
            />

            <DishIngredientsEditor
              dishId={id}
              ingredients={ingRows}
              products={products}
              canEdit={canEdit}
            />
          </>
        )}
      </section>
    </div>
  )
}
