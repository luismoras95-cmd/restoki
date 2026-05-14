import Link from "next/link"
import { ChefHat } from "lucide-react"

import { getAccessibleLocationIds, requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { NewDishButton } from "@/components/dishes/new-dish-button"
import { DishesList } from "@/components/dishes/dishes-list"
import { LocationPicker } from "@/components/dishes/location-picker"

export const metadata = { title: "Recetas" }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

interface RecetasPageProps {
  searchParams: Promise<{ location?: string }>
}

export default async function RecetasPage({ searchParams }: RecetasPageProps) {
  const { org } = await requireOrg()
  const canEdit = EDITOR_ROLES.has(org.role)
  const params = await searchParams

  const supabase = await createClient()

  const [{ data: allLocations }, accessibleIds, { data: categories }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      getAccessibleLocationIds(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", org.id)
        .order("name", { ascending: true }),
    ])

  const locations = (allLocations ?? []).filter((l) => accessibleIds.has(l.id))

  if (locations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Recetas"
          description="Costo en vivo de tus platillos basado en el CPP actual de los ingredientes."
        />
        <EmptyState
          icon={ChefHat}
          title="Necesitas una sucursal activa"
          description="Crea al menos una sucursal antes de definir recetas."
        />
      </div>
    )
  }

  const selectedLocationId =
    params.location && locations.some((l) => l.id === params.location)
      ? params.location
      : locations[0]!.id

  const { data: dishes } = await supabase.rpc("list_dishes_with_costs", {
    p_org_id: org.id,
    p_location_id: selectedLocationId,
  })

  const rows = dishes ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recetas"
        description="Costo en vivo de tus platillos basado en el CPP actual de los ingredientes."
        action={
          canEdit ? (
            <NewDishButton categories={categories ?? []} />
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LocationPicker
          locations={locations}
          selected={selectedLocationId}
        />
        <p className="text-xs text-muted-foreground">
          El costo cambia automático cuando suben/bajan los precios de tus
          ingredientes. Si un ingrediente nunca ha tenido movimiento en esta
          sucursal, usamos su costo estimado.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Aún no tienes recetas"
          description={
            canEdit
              ? "Click 'Nuevo platillo' arriba para empezar."
              : "Pide a un administrador que cree recetas."
          }
        />
      ) : (
        <DishesList dishes={rows} />
      )}
    </div>
  )
}
