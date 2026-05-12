"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import {
  applyAdjustment,
  applyWaste,
  type MovementActionState,
} from "@/lib/actions/inventory"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const INITIAL: MovementActionState = { status: "idle" }

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Aplicando..." : label}
    </Button>
  )
}

interface MovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  locationName: string
  productId: string
  productName: string
  currentQty: number
  baseUnit: string
}

export function MovementDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
  productId,
  productName,
  currentQty,
  baseUnit,
}: MovementDialogProps) {
  const [tab, setTab] = useState<"adjustment" | "waste">("adjustment")

  const [adjState, adjAction] = useActionState(applyAdjustment, INITIAL)
  const [wasteState, wasteAction] = useActionState(applyWaste, INITIAL)

  useEffect(() => {
    if (adjState.status === "success") {
      toast.success(adjState.message)
      onOpenChange(false)
    } else if (adjState.status === "error") {
      toast.error(adjState.message)
    }
  }, [adjState, onOpenChange])

  useEffect(() => {
    if (wasteState.status === "success") {
      toast.success(wasteState.message)
      onOpenChange(false)
    } else if (wasteState.status === "error") {
      toast.error(wasteState.message)
    }
  }, [wasteState, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription>
            Sucursal: <span className="font-medium">{locationName}</span> · Stock actual:{" "}
            <span className="font-medium">
              {currentQty} {baseUnit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "adjustment" | "waste")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="adjustment">Ajuste</TabsTrigger>
            <TabsTrigger value="waste">Merma</TabsTrigger>
          </TabsList>

          <TabsContent value="adjustment" className="pt-3">
            <form action={adjAction} className="flex flex-col gap-3">
              <input type="hidden" name="location_id" value={locationId} />
              <input type="hidden" name="product_id" value={productId} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="adj-delta">Cantidad a sumar o restar</Label>
                <Input
                  id="adj-delta"
                  name="delta"
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 5 o -2"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Positivo entra, negativo sale. Para corregir conteos físicos.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="adj-notes">Motivo</Label>
                <Textarea
                  id="adj-notes"
                  name="notes"
                  rows={2}
                  maxLength={280}
                  placeholder="Ej. Conteo físico semanal"
                />
              </div>

              <Submit label="Aplicar ajuste" />
            </form>
          </TabsContent>

          <TabsContent value="waste" className="pt-3">
            <form action={wasteAction} className="flex flex-col gap-3">
              <input type="hidden" name="location_id" value={locationId} />
              <input type="hidden" name="product_id" value={productId} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="waste-qty">Cantidad mermada</Label>
                <Input
                  id="waste-qty"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="Ej. 3"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Cantidad positiva. Se restará automáticamente del stock.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="waste-notes">Motivo</Label>
                <Textarea
                  id="waste-notes"
                  name="notes"
                  rows={2}
                  maxLength={280}
                  placeholder="Ej. Caducidad, dañado, derrame"
                />
              </div>

              <Submit label="Registrar merma" />
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
