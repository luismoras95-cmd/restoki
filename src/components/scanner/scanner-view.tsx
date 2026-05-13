"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Barcode,
  Camera,
  CheckCircle2,
  Keyboard,
  Loader2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

import {
  associateBarcode,
  createProductFromScan,
  lookupByBarcode,
  scanAddToInventory,
  type LookupResult,
} from "@/lib/actions/scanner"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Tables } from "@/types/db"

interface ScannerViewProps {
  locations: Pick<Tables<"locations">, "id" | "name">[]
  products: Pick<Tables<"products">, "id" | "name" | "base_unit" | "sku">[]
}

const BASE_UNIT_LABELS: Record<string, string> = {
  kg: "Kilogramos",
  g: "Gramos",
  l: "Litros",
  ml: "Mililitros",
  pieza: "Pieza",
}

type Pending =
  | { kind: "idle" }
  | { kind: "looking_up"; code: string }
  | {
      kind: "found"
      code: string
      product: {
        id: string
        name: string
        base_unit: string
        sku: string | null
      }
    }
  | { kind: "not_found"; code: string }

export function ScannerView({ locations, products }: ScannerViewProps) {
  const router = useRouter()
  const [locationId, setLocationId] = useState<string>(
    locations[0]?.id ?? ""
  )
  const [cameraOn, setCameraOn] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [pending, setPending] = useState<Pending>({ kind: "idle" })
  const [isPending, startTransition] = useTransition()

  // Estados de los diálogos
  const [quantity, setQuantity] = useState<number>(1)
  const [associateProductId, setAssociateProductId] = useState<string>("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductUnit, setNewProductUnit] = useState<string>("pieza")
  const [associateTab, setAssociateTab] = useState<"existing" | "new">(
    "existing"
  )

  const locationName =
    locations.find((l) => l.id === locationId)?.name ?? "Selecciona"

  const handleCode = (code: string) => {
    if (pending.kind !== "idle") return // ya estamos procesando uno
    setPending({ kind: "looking_up", code })
    startTransition(async () => {
      const result: LookupResult = await lookupByBarcode(code)
      if (result.status === "error") {
        toast.error(result.message)
        setPending({ kind: "idle" })
        return
      }
      if (result.status === "found") {
        setPending({
          kind: "found",
          code,
          product: {
            id: result.product.id,
            name: result.product.name,
            base_unit: result.product.base_unit,
            sku: result.product.sku,
          },
        })
        setQuantity(1)
      } else {
        setPending({ kind: "not_found", code })
        setAssociateProductId("")
        setNewProductName("")
        setAssociateTab("existing")
      }
    })
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualCode.trim()
    if (trimmed.length < 2) return
    handleCode(trimmed)
    setManualCode("")
  }

  const confirmAdd = () => {
    if (pending.kind !== "found") return
    if (!locationId) {
      toast.error("Selecciona una sucursal primero.")
      return
    }
    const product = pending.product
    startTransition(async () => {
      try {
        await scanAddToInventory({
          product_id: product.id,
          location_id: locationId,
          quantity,
          notes: `Escaneo · ${pending.code}`,
        })
        toast.success(
          `+${quantity} ${product.base_unit} de ${product.name}`
        )
        setPending({ kind: "idle" })
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const confirmAssociate = () => {
    if (pending.kind !== "not_found") return
    const code = pending.code

    startTransition(async () => {
      try {
        let product: {
          id: string
          name: string
          base_unit: string
          sku: string | null
        }
        if (associateTab === "existing") {
          if (!associateProductId) {
            toast.error("Selecciona un producto.")
            return
          }
          await associateBarcode(associateProductId, code)
          const found = products.find((p) => p.id === associateProductId)
          if (!found) throw new Error("Producto no encontrado.")
          product = {
            id: found.id,
            name: found.name,
            base_unit: found.base_unit,
            sku: found.sku,
          }
        } else {
          const created = await createProductFromScan({
            name: newProductName.trim(),
            base_unit: newProductUnit,
            barcode: code,
          })
          if (!created) throw new Error("No se pudo crear el producto.")
          product = {
            id: created.id,
            name: created.name,
            base_unit: created.base_unit,
            sku: created.sku,
          }
        }

        toast.success("Código asociado.")
        setPending({ kind: "found", code, product })
        setQuantity(1)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sucursal */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="scan-location">Sucursal donde se carga el stock</Label>
        <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
          <SelectTrigger id="scan-location" className="w-full sm:w-72">
            <SelectValue>{locationName}</SelectValue>
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

      {/* Entrada manual */}
      <form
        onSubmit={handleManualSubmit}
        className="flex flex-col gap-2 rounded-xl border bg-card p-4"
      >
        <Label
          htmlFor="manual-code"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Keyboard className="size-4 text-primary" />
          Entrada manual (lector USB o tecleado)
        </Label>
        <div className="flex gap-2">
          <Input
            id="manual-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Escanea con lector USB o teclea el código"
            autoFocus
            autoComplete="off"
          />
          <Button type="submit" disabled={manualCode.trim().length < 2}>
            <Barcode className="size-4" />
            Procesar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Los lectores USB suelen actuar como teclado y disparan Enter al
          terminar — el campo arriba lo capta automático.
        </p>
      </form>

      {/* Cámara */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Camera className="size-4 text-primary" />
            Cámara
          </Label>
          <Button
            variant={cameraOn ? "outline" : "default"}
            size="sm"
            onClick={() => setCameraOn((v) => !v)}
          >
            {cameraOn ? "Apagar" : "Encender"}
          </Button>
        </div>
        {cameraOn && (
          <BarcodeScanner
            active={cameraOn && pending.kind === "idle"}
            onDetected={handleCode}
          />
        )}
        {!cameraOn && (
          <p className="text-xs text-muted-foreground">
            Funciona mejor en celular. Requiere permisos de cámara. Si tu
            navegador no soporta, usa la entrada manual.
          </p>
        )}
      </div>

      {/* Diálogo: producto encontrado, sumar cantidad */}
      <Dialog
        open={pending.kind === "found"}
        onOpenChange={(o) => !o && setPending({ kind: "idle" })}
      >
        {pending.kind === "found" && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                {pending.product.name}
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono text-xs">{pending.code}</span>{" "}
                <Badge variant="secondary" className="ml-2">
                  {pending.product.sku ?? "sin SKU"}
                </Badge>
                <br />
                Sucursal:{" "}
                <span className="font-medium text-foreground">
                  {locationName}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="scan-qty">
                Cantidad a sumar al inventario
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(0.001, q - 1))}
                  aria-label="Restar 1"
                >
                  −
                </Button>
                <Input
                  id="scan-qty"
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Number(e.target.value) || 0)
                  }
                  className="text-center text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Sumar 1"
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pending.product.base_unit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Crea un ajuste positivo (+{quantity}) en la sucursal seleccionada.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setPending({ kind: "idle" })}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmAdd}
                disabled={isPending || quantity <= 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Aplicando…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Sumar {quantity}{" "}
                    {pending.product.base_unit}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Diálogo: código nuevo, asociar a producto existente o crear */}
      <Dialog
        open={pending.kind === "not_found"}
        onOpenChange={(o) => !o && setPending({ kind: "idle" })}
      >
        {pending.kind === "not_found" && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Código no registrado</DialogTitle>
              <DialogDescription>
                <span className="font-mono text-xs">{pending.code}</span> no
                está asociado a ningún producto. Asócialo a uno existente o
                crea uno nuevo. La próxima vez que escanees este código será
                instantáneo.
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={associateTab}
              onValueChange={(v) =>
                setAssociateTab(v as "existing" | "new")
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Producto existente</TabsTrigger>
                <TabsTrigger value="new">Crear nuevo</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="pt-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="associate-product">Producto</Label>
                  <Select
                    value={associateProductId}
                    onValueChange={(v) => setAssociateProductId(v ?? "")}
                  >
                    <SelectTrigger id="associate-product" className="w-full">
                      <SelectValue>
                        {products.find((p) => p.id === associateProductId)
                          ?.name ?? "Selecciona producto"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.base_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="new" className="pt-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-name">Nombre del producto</Label>
                    <Input
                      id="new-name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Ej. Refresco Coca-Cola 600ml"
                      maxLength={120}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-unit">Unidad base</Label>
                    <Select
                      value={newProductUnit}
                      onValueChange={(v) => v && setNewProductUnit(v)}
                    >
                      <SelectTrigger id="new-unit" className="w-full">
                        <SelectValue>
                          {BASE_UNIT_LABELS[newProductUnit] ?? newProductUnit}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BASE_UNIT_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Después puedes editar categoría, proveedor y stock mínimo
                    en /productos.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setPending({ kind: "idle" })}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmAssociate}
                disabled={
                  isPending ||
                  (associateTab === "existing" && !associateProductId) ||
                  (associateTab === "new" &&
                    newProductName.trim().length < 2)
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />{" "}
                    Procesando…
                  </>
                ) : associateTab === "existing" ? (
                  "Asociar código"
                ) : (
                  "Crear y asociar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
