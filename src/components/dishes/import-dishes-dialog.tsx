"use client"

import { useRef, useState, useTransition } from "react"
import { AlertTriangle, Download, FileUp, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  importDishes,
  type ImportDishRow,
  type ImportDishesResult,
} from "@/lib/actions/dishes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Columnas de la plantilla, en orden. Una fila por ingrediente:
// el mismo platillo se repite en varias filas.
const TEMPLATE_HEADERS = [
  "platillo",
  "precio_venta",
  "insumo",
  "cantidad",
  "unidad",
] as const

const TEMPLATE_EXAMPLE_ROWS = [
  ["Hotcakes clásicos", "95", "Harina de trigo", "120", "g"],
  ["Hotcakes clásicos", "", "Huevo", "2", "pieza"],
  ["Hotcakes clásicos", "", "Leche entera", "150", "ml"],
  ["Hotcakes clásicos", "", "Mantequilla", "20", "g"],
]

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
  a.download = "plantilla-recetas-restoki.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Parser CSV simple que respeta comillas dobles.
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

function rowsToDishRows(parsed: string[][]): ImportDishRow[] {
  if (parsed.length < 2) return []
  const header = parsed[0]!.map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const iPlatillo = idx("platillo")
  const iPrecio = idx("precio_venta")
  const iInsumo = idx("insumo")
  const iCantidad = idx("cantidad")
  const iUnidad = idx("unidad")

  const str = (r: string[], i: number): string =>
    i >= 0 ? (r[i] ?? "").trim() : ""

  return parsed.slice(1).map((r) => ({
    platillo: str(r, iPlatillo),
    precio_venta: str(r, iPrecio),
    insumo: str(r, iInsumo),
    cantidad: str(r, iCantidad),
    unidad: str(r, iUnidad),
  }))
}

function countDishes(rows: ImportDishRow[]): number {
  const names = new Set(
    rows
      .map((r) => r.platillo.trim().toLowerCase().replace(/\s+/g, " "))
      .filter(Boolean)
  )
  return names.size
}

export function ImportDishesDialog() {
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ImportDishRow[] | null>(null)
  const [result, setResult] = useState<ImportDishesResult | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setParsed(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ""
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
    const rows = rowsToDishRows(parseCsv(text))
    if (rows.length === 0) {
      toast.error("El archivo no tiene filas válidas. Revisa la plantilla.")
      return
    }
    setResult(null)
    setParsed(rows)
  }

  function handleImport() {
    if (!parsed) return
    startTransition(async () => {
      const res = await importDishes(parsed)
      setResult(res)
      if (res.status === "error") {
        toast.error(res.message)
      } else if (res.createdDishes > 0) {
        toast.success(res.message)
      } else {
        toast.warning(res.message)
      }
    })
  }

  const dishCount = parsed ? countDishes(parsed) : 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <FileUp className="size-4" />
        Importar recetas
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar recetas desde Excel/CSV</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, llénala en Excel, guárdala como CSV y súbela.
            Una fila por ingrediente: el mismo platillo se repite en varias
            filas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Paso 1: plantilla */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">1. Descarga la plantilla</p>
            <p className="text-xs text-muted-foreground">
              Columnas: <strong>platillo</strong>, <strong>precio_venta</strong>{" "}
              (opcional, solo en la primera fila del platillo),{" "}
              <strong>insumo</strong>, <strong>cantidad</strong> y{" "}
              <strong>unidad</strong>. En <strong>unidad</strong> escribe{" "}
              <strong>g</strong>, <strong>kg</strong>, <strong>ml</strong>,{" "}
              <strong>l</strong> o <strong>pieza</strong> — Restoki convierte solo
              a la unidad del producto (ej. 20 g → 0.02 kg). Los insumos deben
              existir en Productos con el mismo nombre.
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
            <p className="text-sm font-medium">2. Sube tu archivo lleno</p>
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
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              Elegir archivo CSV
            </Button>
          </div>

          {/* Preview */}
          {parsed && !result && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                3. Revisa ({dishCount}{" "}
                {dishCount === 1 ? "platillo detectado" : "platillos detectados"}
                , {parsed.length} filas de ingredientes)
              </p>
              <div className="max-h-60 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platillo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {r.platillo || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {r.precio_venta ? `$${r.precio_venta}` : "—"}
                        </TableCell>
                        <TableCell>{r.insumo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.cantidad || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 50 de {parsed.length} filas. Se importarán todas.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={reset}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleImport} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Importar ${dishCount} ${dishCount === 1 ? "platillo" : "platillos"}`
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">{result.message}</p>

              {result.missingProducts.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-500/60 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    Insumos no registrados en Productos
                  </p>
                  <div className="max-h-40 overflow-auto text-xs">
                    {result.missingProducts.map((m, i) => (
                      <p key={i} className="py-0.5">
                        <span className="font-medium">{m.name}</span>{" "}
                        <span className="text-muted-foreground">
                          — afecta a: {m.dishes.join(", ")}
                        </span>
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los platillos afectados no se crearon. Regístralos en
                    Productos (puedes usar su plantilla de importación) y vuelve
                    a subir este archivo.
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-auto rounded border bg-background p-2 text-xs">
                  <p className="mb-1 font-medium text-muted-foreground">
                    Detalle por fila:
                  </p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-muted-foreground">
                      Fila {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={reset}>
                  Importar otro archivo
                </Button>
                <Button type="button" onClick={() => setOpen(false)}>
                  Listo
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
