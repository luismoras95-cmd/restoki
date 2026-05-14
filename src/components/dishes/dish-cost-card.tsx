import { TrendingDown, TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

const percent = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

interface DishCostCardProps {
  cost: number
  salePrice: number | null
  ingredientCount: number
}

function marginTone(pct: number | null): string {
  if (pct === null) return "text-muted-foreground"
  if (pct >= 65) return "text-emerald-700 dark:text-emerald-400"
  if (pct >= 50) return "text-emerald-600 dark:text-emerald-500"
  if (pct >= 30) return "text-amber-700 dark:text-amber-400"
  return "text-destructive"
}

export function DishCostCard({
  cost,
  salePrice,
  ingredientCount,
}: DishCostCardProps) {
  const marginAmount = salePrice != null ? salePrice - cost : null
  const marginPct =
    salePrice != null && salePrice > 0
      ? ((salePrice - cost) / salePrice) * 100
      : null

  const tone = marginTone(marginPct)
  const MarginIcon = marginPct !== null && marginPct >= 50 ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Resumen del costo</CardTitle>
        <CardDescription>
          {ingredientCount === 0
            ? "Aún sin ingredientes. Agrega abajo para ver el costo."
            : `Con base en ${ingredientCount} ingrediente${ingredientCount === 1 ? "" : "s"} y los costos actuales del inventario en esta sucursal.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Costo del platillo
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {currency.format(cost)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Precio de venta
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {salePrice != null ? currency.format(salePrice) : "—"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Margen bruto
            </p>
            {marginPct !== null ? (
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-semibold tabular-nums", tone)}>
                  {percent.format(marginPct / 100)}
                </span>
                <span className={cn("inline-flex items-center text-sm", tone)}>
                  <MarginIcon className="size-3.5" />
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Define un precio para verlo
              </p>
            )}
            {marginAmount !== null && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {currency.format(marginAmount)} por platillo
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
