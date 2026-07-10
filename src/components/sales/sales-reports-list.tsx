"use client"

import { Fragment, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"

import type { SalesAuditItem } from "@/lib/actions/sales"
import { SalesAuditView } from "@/components/sales/sales-audit-view"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type SalesReportRow = {
  id: string
  label: string
  locationName: string
  createdAt: string
  period: string | null
  totalDishes: number
  deficitCount: number
  auditItems: SalesAuditItem[]
}

const number = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 3,
})

interface SalesReportsListProps {
  reports: SalesReportRow[]
}

/**
 * Historial de reportes de ventas. Clic en una fila expande la auditoría
 * guardada (insumos descontados y déficits detectados).
 */
export function SalesReportsList({ reports }: SalesReportsListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Periodo</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead className="hidden md:table-cell">Fecha de carga</TableHead>
            <TableHead className="text-right">Platillos</TableHead>
            <TableHead>Auditoría</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => {
            const isOpen = expanded.has(r.id)
            return (
              <Fragment key={r.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => toggle(r.id)}
                >
                  <TableCell className="text-muted-foreground">
                    {isOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{r.label}</span>
                    {r.period && (
                      <span className="block text-xs text-muted-foreground">
                        {r.period}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{r.locationName}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {r.createdAt}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number.format(r.totalDishes)}
                  </TableCell>
                  <TableCell>
                    {r.deficitCount > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" />
                        {r.deficitCount}{" "}
                        {r.deficitCount === 1 ? "faltante" : "faltantes"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Todo cuadra</Badge>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="bg-muted/20 p-4">
                      <SalesAuditView items={r.auditItems} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
