"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, PackageCheck, Ban } from "lucide-react"
import { toast } from "sonner"

import {
  cancelPO,
  markPOSent,
  receivePO,
} from "@/lib/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Enums } from "@/types/db"

interface POActionsProps {
  poId: string
  status: Enums<"po_status">
  canEdit: boolean
  itemsCount: number
}

export function POActions({ poId, status, canEdit, itemsCount }: POActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<"send" | "receive" | "cancel" | null>(
    null
  )

  if (!canEdit) return null

  function run(action: () => Promise<void>, successMsg: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(successMsg)
        setConfirm(null)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <>
            <Button
              size="sm"
              onClick={() => setConfirm("send")}
              disabled={itemsCount === 0}
            >
              <Send className="size-4" />
              Marcar como enviada
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirm("cancel")}
            >
              <Ban className="size-4" />
              Cancelar
            </Button>
          </>
        )}
        {status === "sent" && (
          <>
            <Button size="sm" onClick={() => setConfirm("receive")}>
              <PackageCheck className="size-4" />
              Recibir mercancía
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirm("cancel")}
            >
              <Ban className="size-4" />
              Cancelar
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "send" && "Marcar como enviada"}
              {confirm === "receive" && "Recibir mercancía"}
              {confirm === "cancel" && "Cancelar orden"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "send" &&
                "Pasa el estado a 'Enviada'. Esto bloquea la edición. El stock se afectará cuando la recibas."}
              {confirm === "receive" &&
                "Aplica todas las líneas al inventario de la sucursal destino con su costo unitario. Esto recalcula el costo promedio ponderado. Acción irreversible."}
              {confirm === "cancel" &&
                "Marca la orden como cancelada. No se podrá recibir después."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirm(null)}
              disabled={pending}
            >
              Volver
            </Button>
            <Button
              variant={confirm === "cancel" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                if (confirm === "send")
                  run(() => markPOSent(poId), "Orden enviada.")
                if (confirm === "receive")
                  run(() => receivePO(poId), "Mercancía recibida. Stock actualizado.")
                if (confirm === "cancel")
                  run(() => cancelPO(poId), "Orden cancelada.")
              }}
            >
              {pending
                ? "Aplicando..."
                : confirm === "send"
                  ? "Enviar"
                  : confirm === "receive"
                    ? "Recibir"
                    : "Cancelar orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
