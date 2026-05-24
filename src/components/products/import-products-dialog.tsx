"use client"

import { useRef, useState, useTransition } from "react"
import { Download, FileUp, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  importProducts,
  type ImportProductRow,
  type ImportResult,
} from "@/lib/actions/products"
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

// Columnas de la plantilla, en orden.
const TEMPLATE_HEADERS = [
  "nombre",
  "unidad_base",
  "categoria",
  "costo_estimado",
  "stock_minimo",
  "unidad_compra",
  "unidades_por_compra",
  "codigo_barras",
  "sku",
] as const

const TEMPLATE_EXAMPLE_ROWS = [
  ["Harina de trigo", "kg", "Secos", "28.50", "10", "bulto", "25", "", ""],
  ["Huevo", "pieza", "Refrigerados", "3.20", "100", "caja", "360", "", ""],
  ["Leche entera", "l", "Refrigerados", "24.00", "20", "caja", "12", "", ""],
  ["Mantequilla", "g", "Refrigerados", "0.18", "2000", "caja", "10000", "", ""],
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
  a.download = "plantilla-productos-restoki.csv"
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

function rowsToProducts(parsed: string[][]): ImportProductRow[] {
  if (parsed.length < 2) return []
  const header = parsed[0]!.map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const iNombre = idx("nombre")
  const iUnidad = idx("unidad_base")
  const iCat = idx("categoria")
  const iCosto = idx("costo_estimado")
  const iMin = idx("stock_minimo")
  const iUC = idx("unidad_compra")
  const iUPC = idx("unidades_por_compra")
  const iBar = idx("codigo_barras")
  const iSku = idx("sku")

  const num = (v: string | undefined): number | null => {
    if (!v || v.trim() === "") return null
    const n = Number(v.replace(/,/g, "").trim())
    return Number.isFinite(n) ? n : null
  }
  const str = (v: string | undefined): string => (v ?? "").trim()

  return parsed.slice(1).map((r) => ({
    nombre: str(r[iNombre]),
    unidad_base: str(r[iUnidad]),
    categoria: iCat >= 0 ? str(r[iCat]) : "",
    costo_estimado: iCosto >= 0 ? num(r[iCosto]) : null,
    stock_minimo: iMin >= 0 ? num(r[iMin]) : null,
    unidad_compra: iUC >= 0 ? str(r[iUC]) : "",
    unidades_por_compra: iUPC >= 0 ? num(r[iUPC]) : null,
    codigo_barras: iBar >= 0 ? str(r[iBar]) : "",
    sku: iSku >= 0 ? str(r[iSku]) : "",
  }))
}

export function ImportProductsDialog() {
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ImportProductRow[] | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
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
    const rows = rowsToProducts(parseCsv(text))
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
      const res = await importProducts(parsed)
      setResult(res)
      if (res.status === "ok" && res.created > 0) {
        toast.success(res.message)
      } else if (res.status === "error") {
        toast.error(res.message)
      } else {
        toast.warning(res.message)
      }
    })
  }

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
        Importar
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar productos desde Excel/CSV</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, llénala en Excel, guárdala como CSV y súbela.
            Carga hasta 1000 productos de una vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Paso 1: plantilla */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">1. Descarga la plantilla</p>
            <p className="text-xs text-muted-foreground">
              Trae columnas y ejemplos. Solo <strong>nombre</strong> y{" "}
              <strong>unidad_base</strong> (kg, g, l, ml, pieza) son
              obligatorias. La categoría se vincula si ya existe con ese nombre.
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
                3. Revisa ({parsed.length} productos detectados)
              </p>
              <div className="max-h-60 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {p.nombre}
                        </TableCell>
                        <TableCell>{p.unidad_base}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.categoria || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.costo_estimado != null
                            ? `$${p.costo_estimado}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 50 de {parsed.length}. Se importarán todos.
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
                    `Importar ${parsed.length} productos`
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">{result.message}</p>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-auto rounded border bg-background p-2 text-xs">
                  <p className="mb-1 font-medium text-muted-foreground">
                    Filas omitidas:
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
