import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { HealthCalculator } from "@/components/indicators/health-calculator"

export const metadata = { title: "Indicadores" }

export default async function IndicadoresPage() {
  const { org } = await requireOrg()
  const supabase = await createClient()

  const { data: inventory } = await supabase
    .from("inventory")
    .select("quantity, average_cost")
    .eq("organization_id", org.id)

  const inventoryValue = (inventory ?? []).reduce(
    (sum, row) =>
      sum + Number(row.quantity ?? 0) * Number(row.average_cost ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Indicadores de salud"
        description="Datos clave para mantener tu inventario en rangos sanos. La fórmula principal compara cuánto dinero tienes parado vs. cuánto facturas."
      />
      <HealthCalculator inventoryValue={inventoryValue} />
    </div>
  )
}
