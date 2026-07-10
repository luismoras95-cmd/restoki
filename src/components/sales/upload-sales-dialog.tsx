"use client"

import { useRef, useState, useTransition } from "react"
import {
  AlertTriangle,
  Download,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import {
  applySalesReport,
  previewSalesReport,
  type SalesAuditSummary,
  type SalesCsvRow,
  type SalesPreviewResult,
} from "@/lib/actions/sales"
import { SalesAuditView } from "@/components/sales/sales-audit-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ------------------------------------------------------------
// Plantilla CSV
// ------------------------------------------------------------

const TEMPLATE_HEADERS = ["platillo", "cantidad_vendida"] as const

const TEMPLATE_EXAMPLE_ROWS = [
  ["Hotcakes clásicos", "24"],
  ["Chilaquiles verdes con pollo", "18"],
  ["Café americano", "35"],
]

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadTemplate() {
  // BOM para que Excel detecte UTF-8 (acentos)
  const bom = "﻿"
  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...TEMPLATE_EXAMPLE_ROWS.map((r) =>
      r.map((cell) => escapeCsv(cell)).join(",")
    ),
  ]
  const csv = bom + lines.join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-ventas-restoki.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ------------------------------------------------------------
// Parser CSV simple que respeta comillas dobles
// ------------------------------------------------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  // Quita BOM si existe
  const t = text.replace(/^﻿/, "")

  for (let i = 0; i < t.length; i++) {
    const char = t[i]
    if (inQuotes) {
      if (char === '"') {
        if (t[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        row.push(field)
        field = ""
      } else if (char === "\n") {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
      } else if (char === "\r") {
        // ignora, se maneja con \n
      } else {
        field += char
      }
    }
  }
  // Última fila si no termina en newline
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

function rowsToSales(parsed: string[][]): {
  rows: SalesCsvRow[]
  skipped: number
  headerOk: boolean
} {
  if (parsed.length < 2) return { rows: [], skipped: 0, headerOk: false }
  const header = parsed[0]!.map((h) => h.trim().toLowerCase())
  const iName = header.indexOf("platillo")
  const iQty = header.indexOf("cantidad_vendida")
  if (iName < 0 || iQty < 0) return { rows: [], skipped: 0, headerOk: false }

  const rows: SalesCsvRow[] = []
  let skipped = 0
  for (const r of parsed.slice(1)) {
    const name = (r[iName] ?? "").trim()
    const qty = Number((r[iQty] ?? "").replace(/,/g, "").trim())
    if (name && Number.isFinite(qty) && qty > 0) {
      rows.push({ name, qty })
    } else {
      skipped++
    }
  }
  return { rows, skipped, headerOk: true }
}

// ------------------------------------------------------------
// Diálogo
// ------------------------------------------------------------

const number = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 3,
})

type Preview = Extract<SalesPreviewResult, { status: "ok" }>

interface UploadSalesDialogProps {
  locations: { id: string; name: string }[]
}

export function UploadSalesDialog({ locations }: UploadSalesDialogProps) {
  const [open, setOpen] = useState(false)
  const [locationId, setLocationId] = useState(
    locations.length === 1 ? locations[0]!.id : ""
  )
  const [label, setLabel] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [result, setResult] = useState<SalesAuditSummary | null>(null)
  const [previewing, startPreview] = useTransition()
  const [applying, startApply] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLocationName =
    locations.find((l) => l.id === locationId)?.name ?? ""

  function resetFile() {
    setPreview(null)
    setSkipped(0)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function resetAll() {
    resetFile()
    setLocationId(locations.length === 1 ? locations[0]!.id : "")
    setLabel("")
    setPeriodStart("")
    setPeriodEnd("")
  }

  async function handleFile(file: File | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(
        "Sube un archivo CSV. Si tienes Excel, usa 'Guardar como → CSV'."
      )
      return
    }
    const text = await file.text()
    const { rows, skipped: skippedRows, headerOk } = rowsToSales(parseCsv(text))
    if (!headerOk) {
      toast.error(
        "El archivo no trae las columnas 'platillo' y 'cantidad_vendida'. Usa la plantilla."
      )
      return
    }
    if (rows.length === 0) {
      toast.error("El archivo no tiene filas válidas. Revisa la plantilla.")
      return
    }
    setResult(null)
    setPreview(null)
    setSkipped(skippedRows)
    startPreview(async () => {
      const res = await previewSalesReport(rows)
      if (res.status === "error") {
        toast.error(res.message)
        return
      }
      setPreview(res)
    })
  }

  function handleApply() {
    if (!preview || preview.matched.length === 0) return
    if (!locationId) {
      toast.error("Selecciona la sucursal.")
      return
    }
    if (!label.trim()) {
      toast.error("Escribe la etiqueta del periodo (ej. 'Semana 24').")
      return
    }
    startApply(async () => {
      const res = await applySalesReport({
        location_id: locationId,
        label: label.trim(),
        period_start: periodStart || null,
        period_end: periodEnd || null,
        items: preview.matched.map((m) => ({
          dish_id: m.dish_id,
          dish_name: m.name,
          quantity: m.qty,
        })),
      })
      if (res.status === "error") {
        toast.error(res.message)
        return
      }
      setPreview(null)
      setResult(res.audit)
      toast.success("Ventas aplicadas: el inventario se actualizó.")
    })
  }

  const noRecipe = preview?.matched.filter((m) => !m.has_recipe) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetAll()
      }}
    >
      <DialogTrigger render={<Button />}>
        <FileUp className="size-4" />
        Cargar ventas
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar ventas de la semana</DialogTitle>
          <DialogDescription>
            Sube el CSV de platillos vendidos que exporta tu punto de venta.
            Restoki descuenta los insumos según tus recetas y te muestra la
            auditoría.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4">
            <SalesAuditView items={result.items} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetFile}>
                Cargar otro archivo
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Datos del periodo */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Sucursal *</Label>
                <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {selectedLocationName || "Selecciona sucursal"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-label">Etiqueta del periodo *</Label>
                <Input
                  id="sales-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={120}
                  placeholder="Ej. Semana 24"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-start">Fecha inicio (opcional)</Label>
                <Input
                  id="sales-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-end">Fecha fin (opcional)</Label>
                <Input
                  id="sales-end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Paso 1: plantilla */}
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">1. Descarga la plantilla</p>
              <p className="text-xs text-muted-foreground">
                Columnas: <strong>platillo</strong> y{" "}
                <strong>cantidad_vendida</strong>. Los nombres deben coincidir
                con tus platillos en Recetas (mayúsculas y acentos no
                importan).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={downloadTemplate}
              >
                <Download className="size-4" />
                Descargar plantilla CSV
              </Button>
            </div>

            {/* Paso 2: subir */}
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">2. Sube tu archivo de ventas</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={previewing}
                onClick={() => inputRef.current?.click()}
              >
                {previewing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Revisando...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Elegir archivo CSV
                  </>
                )}
              </Button>
            </div>

            {/* Paso 3: preview */}
            {preview && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">
                  3. Revisa ({preview.matched.length}{" "}
                  {preview.matched.length === 1
                    ? "platillo encontrado"
                    : "platillos encontrados"}
                  {skipped > 0
                    ? ` · ${skipped} filas ignoradas por datos inválidos`
                    : ""}
                  )
                </p>

                {preview.unmatched.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <span className="font-semibold">
                        Estos platillos no están en Recetas y NO se procesarán:
                      </span>{" "}
                      {preview.unmatched
                        .map((u) => `${u.name} (${number.format(u.qty)})`)
                        .join(", ")}
                      . Regístralos en Recetas si quieres que descuenten
                      insumos.
                    </p>
                  </div>
                )}

                {noRecipe.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <span className="font-semibold">Sin receta:</span>{" "}
                      {noRecipe.map((m) => m.name).join(", ")}. Se registrarán
                      como vendidos pero{" "}
                      <span className="font-semibold">
                        no descontarán insumos
                      </span>{" "}
                      hasta que les agregues ingredientes en Recetas.
                    </p>
                  </div>
                )}

                {preview.matched.length > 0 ? (
                  <div className="max-h-60 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Platillo</TableHead>
                          <TableHead className="text-right">
                            Cantidad vendida
                          </TableHead>
                          <TableHead>Receta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.matched.map((m) => (
                          <TableRow key={m.dish_id}>
                            <TableCell className="font-medium">
                              {m.name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {number.format(m.qty)}
                            </TableCell>
                            <TableCell>
                              {m.has_recipe ? (
                                <span className="text-xs text-muted-foreground">
                                  Sí
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                  Sin receta
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Ningún platillo del archivo coincide con tus Recetas.
                    Regístralos primero en Recetas y vuelve a subir el archivo.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetFile}>
                    Cancelar
                  </Button>
                  {preview.matched.length > 0 && (
                    <Button
                      type="button"
                      onClick={handleApply}
                      disabled={applying}
                    >
                      {applying ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        "Aplicar ventas y descontar inventario"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
