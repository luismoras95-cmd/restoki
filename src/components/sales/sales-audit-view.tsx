import { AlertTriangle, CheckCircle2 } from "lucide-react"

import type { SalesAuditItem } from "@/lib/actions/sales"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const number = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 3,
})

interface SalesAuditViewProps {
  items: SalesAuditItem[]
}

/**
 * Auditoría de un reporte de ventas: stock antes / consumo teórico /
 * stock después por insumo, con filas en rojo si quedaron en negativo.
 */
export function SalesAuditView({ items }: SalesAuditViewProps) {
  const deficitCount = items.filter((i) => i.deficit).length

  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Este reporte no descontó insumos: los platillos aplicados no tenían
        receta con ingredientes.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {deficitCount > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">
              {deficitCount}{" "}
              {deficitCount === 1
                ? "insumo quedó en negativo"
                : "insumos quedaron en negativo"}
              :
            </span>{" "}
            se vendió más de lo que había en sistema. Posible fuga de insumos,
            mermas no registradas o compras sin capturar.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Todo cuadra:</span> el consumo
            teórico cabe en el inventario registrado.
          </p>
        </div>
      )}

      <div className="max-h-80 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Stock antes</TableHead>
              <TableHead className="text-right">Consumo teórico</TableHead>
              <TableHead className="text-right">Stock después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.product_id}
                className={cn(item.deficit && "bg-destructive/5")}
              >
                <TableCell
                  className={cn(
                    "font-medium",
                    item.deficit && "text-destructive"
                  )}
                >
                  {item.deficit && (
                    <AlertTriangle className="mr-1.5 inline size-3.5 align-[-2px]" />
                  )}
                  {item.name}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {number.format(item.before)} {item.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  −{number.format(item.consumed)} {item.unit}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    item.deficit && "text-destructive"
                  )}
                >
                  {number.format(item.after)} {item.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Compara el stock teórico con tu conteo físico; la diferencia es tu
        merma/fuga real. Puedes registrar ajustes en Inventario.
      </p>
    </div>
  )
}
