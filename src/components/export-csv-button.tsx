"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExportCsvButtonProps {
  /** Path al endpoint, ej. "/api/export/movements" */
  endpoint: string
  /** Si true muestra inputs from/to. Si false descarga directo sin diálogo. */
  withDateRange?: boolean
  label?: string
  description?: string
}

function isoDateNDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ExportCsvButton({
  endpoint,
  withDateRange = false,
  label = "Exportar CSV",
  description = "Descarga el reporte filtrado por rango de fechas.",
}: ExportCsvButtonProps) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState<string>(isoDateNDaysAgo(30))
  const [to, setTo] = useState<string>(todayIso())

  if (!withDateRange) {
    return (
      <a href={endpoint} download>
        <Button variant="outline" size="sm" type="button">
          <Download className="size-4" />
          {label}
        </Button>
      </a>
    )
  }

  const url = new URLSearchParams()
  if (from) url.set("from", from)
  if (to) url.set("to", to)
  const downloadHref = `${endpoint}?${url.toString()}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" type="button">
            <Download className="size-4" />
            {label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv-from">Desde</Label>
            <Input
              id="csv-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv-to">Hasta</Label>
            <Input
              id="csv-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <a href={downloadHref} download onClick={() => setOpen(false)}>
            <Button type="button">
              <Download className="size-4" />
              Descargar
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
