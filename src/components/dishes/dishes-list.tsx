import Link from "next/link"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export type DishRow = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  category_name: string | null
  sale_price: number | null
  is_active: boolean
  ingredient_count: number
  cost: number
  margin_amount: number | null
  margin_pct: number | null
  updated_at: string
}

interface DishesListProps {
  dishes: DishRow[]
}

function marginTone(pct: number | null): string {
  if (pct === null) return "text-muted-foreground"
  if (pct >= 65) return "text-emerald-700 dark:text-emerald-400"
  if (pct >= 50) return "text-emerald-600 dark:text-emerald-500"
  if (pct >= 30) return "text-amber-700 dark:text-amber-400"
  return "text-destructive"
}

export function DishesList({ dishes }: DishesListProps) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platillo</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead className="text-right">Ingredientes</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Margen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dishes.map((d) => {
            const tone = marginTone(d.margin_pct)
            const margin = d.margin_pct
            const MarginIcon =
              margin !== null && margin >= 50 ? TrendingUp : TrendingDown

            return (
              <TableRow key={d.id} className="hover:bg-muted/40">
                <TableCell>
                  <Link href={`/recetas/${d.id}`} className="block">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.name}</span>
                      {!d.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {d.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  <Link href={`/recetas/${d.id}`} className="block">
                    {d.category_name ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <Link href={`/recetas/${d.id}`} className="block">
                    {d.ingredient_count}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Link href={`/recetas/${d.id}`} className="block">
                    {currency.format(Number(d.cost))}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Link href={`/recetas/${d.id}`} className="block">
                    {d.sale_price != null
                      ? currency.format(Number(d.sale_price))
                      : "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Link href={`/recetas/${d.id}`} className="block">
                    {margin !== null ? (
                      <span
                        className={cn(
                          "inline-flex items-center justify-end gap-1 font-medium",
                          tone
                        )}
                      >
                        <MarginIcon className="size-3.5" />
                        {percent.format(margin / 100)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
