"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const RANGES = [
  {
    id: "low",
    min: 0,
    max: 8,
    label: "Posible quiebre de stock",
    description:
      "Tu inventario está muy bajo respecto a las ventas. Cuida que no se te acaben productos clave.",
    icon: TrendingDown,
    tone: "warning",
  },
  {
    id: "efficient",
    min: 8,
    max: 15,
    label: "Muy eficiente",
    description:
      "Inventario óptimo. Estás moviendo bien tu stock sin tener dinero parado.",
    icon: TrendingUp,
    tone: "success",
  },
  {
    id: "healthy",
    min: 15,
    max: 22,
    label: "Saludable",
    description:
      "Rango normal para restaurantes. Tienes buffer suficiente sin sobreinventario.",
    icon: CheckCircle2,
    tone: "success-soft",
  },
  {
    id: "warning",
    min: 22,
    max: 30,
    label: "Cuidado con sobreinventario",
    description:
      "Estás cargando un poco más de stock del necesario. Revisa rotación y caducidades.",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    id: "danger",
    min: 30,
    max: Infinity,
    label: "Mucho dinero parado",
    description:
      "Más del 30% de tu venta está atorada en inventario. Reduce compras hasta normalizar.",
    icon: AlertTriangle,
    tone: "danger",
  },
] as const

type Range = (typeof RANGES)[number]

function rangeFor(ratio: number): Range {
  for (const r of RANGES) {
    if (ratio >= r.min && ratio < r.max) return r
  }
  return RANGES[RANGES.length - 1]
}

const TONE_STYLES: Record<
  Range["tone"],
  { bg: string; text: string; border: string }
> = {
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  "success-soft": {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/40",
  },
}

const STORAGE_KEY = "restoki:health:monthly_sales"

interface HealthCalculatorProps {
  inventoryValue: number
}

export function HealthCalculator({ inventoryValue }: HealthCalculatorProps) {
  const [sales, setSales] = useState<string>("")

  // Carga del último valor guardado en localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setSales(saved)
    } catch {}
  }, [])

  // Persiste mientras el usuario teclea
  useEffect(() => {
    if (sales === "") return
    try {
      window.localStorage.setItem(STORAGE_KEY, sales)
    } catch {}
  }, [sales])

  const salesNumber = useMemo(() => {
    const n = Number(sales)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [sales])

  const ratio = useMemo(() => {
    if (salesNumber === 0) return null
    return (inventoryValue / salesNumber) * 100
  }, [inventoryValue, salesNumber])

  const range = ratio !== null ? rangeFor(ratio) : null
  const tone = range ? TONE_STYLES[range.tone] : null
  const RangeIcon = range?.icon

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tus números</CardTitle>
          <CardDescription>
            El valor de inventario lo sacamos automático. Solo escribe tu
            venta bruta mensual.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-value">Valor del inventario actual</Label>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-2xl font-bold tabular-nums">
                {currency.format(inventoryValue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Suma de stock × CPP en todas las sucursales activas.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="monthly-sales">Venta bruta mensual (MXN)</Label>
            <Input
              id="monthly-sales"
              type="number"
              step="any"
              min="0"
              value={sales}
              onChange={(e) => setSales(e.target.value)}
              placeholder="Ej. 250000"
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground">
              La venta total del mes anterior, antes de impuestos. Se guarda
              localmente en tu navegador para la próxima visita.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card
        className={cn(
          "transition-colors",
          tone && tone.border,
          tone && tone.bg
        )}
      >
        <CardHeader>
          <CardTitle className="text-base">% inventario sobre ventas</CardTitle>
          <CardDescription>
            Fórmula: (valor del inventario ÷ ventas brutas mensuales) × 100
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ratio === null ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-background/50 py-10 text-center">
              <Info className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Escribe tu venta bruta mensual para ver el indicador.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <span
                  className={cn(
                    "text-5xl font-bold tabular-nums",
                    tone?.text
                  )}
                >
                  {percent.format(ratio / 100)}
                </span>
                {RangeIcon && (
                  <RangeIcon className={cn("size-10", tone?.text)} />
                )}
              </div>
              <div
                className={cn(
                  "rounded-lg border bg-background/60 p-4",
                  tone?.border
                )}
              >
                <p className={cn("text-base font-semibold", tone?.text)}>
                  {range?.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {range?.description}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Cálculo: {currency.format(inventoryValue)} ÷{" "}
                {currency.format(salesNumber)} ={" "}
                {percent.format(ratio / 100)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabla de rangos */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            Rangos saludables para restaurantes
          </CardTitle>
          <CardDescription>
            Referencia rápida del % de inventario sobre ventas brutas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {RANGES.map((r) => {
              const RIcon = r.icon
              const t = TONE_STYLES[r.tone]
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-3",
                    t.border,
                    t.bg
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-semibold", t.text)}>
                      {r.min}–{Number.isFinite(r.max) ? `${r.max}%` : "+30%"}
                    </span>
                    <RIcon className={cn("size-4", t.text)} />
                  </div>
                  <p className={cn("text-sm font-medium", t.text)}>
                    {r.label}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
