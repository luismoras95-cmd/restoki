"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, PackageCheck, Ban } from "lucide-react"
import { toast } from "sonner"

import {
  cancelTransfer,
  receiveTransfer,
  shipTransfer,
} from "@/lib/actions/transfers"
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

interface TransferActionsProps {
  transferId: string
  status: Enums<"transfer_status">
  canEdit: boolean
  itemsCount: number
}

export function TransferActions({
  transferId,
  status,
  canEdit,
  itemsCount,
}: TransferActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<"ship" | "receive" | "cancel" | null>(
    null
  )

  if (!canEdit) return null

  function run(fn: () => Promise<void>, msg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(msg)
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
              onClick={() => setConfirm("ship")}
              disabled={itemsCount === 0}
            >
              <Send className="size-4" />
              Enviar
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
        {status === "in_transit" && (
          <Button size="sm" onClick={() => setConfirm("receive")}>
            <PackageCheck className="size-4" />
            Recibir en destino
          </Button>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "ship" && "Enviar transferencia"}
              {confirm === "receive" && "Recibir en destino"}
              {confirm === "cancel" && "Cancelar transferencia"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "ship" &&
                "Descuenta inmediatamente el stock del origen y congela el costo unitario actual. El destino sumará stock al recibirse."}
              {confirm === "receive" &&
                "Suma las líneas al inventario del destino con el costo congelado en el envío. Recalcula CPP en destino."}
              {confirm === "cancel" &&
                "Marca la transferencia como cancelada (solo borradores)."}
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
                if (confirm === "ship")
                  run(
                    () => shipTransfer(transferId),
                    "Transferencia en tránsito."
                  )
                if (confirm === "receive")
                  run(
                    () => receiveTransfer(transferId),
                    "Transferencia recibida en destino."
                  )
                if (confirm === "cancel")
                  run(
                    () => cancelTransfer(transferId),
                    "Transferencia cancelada."
                  )
              }}
            >
              {pending
                ? "Aplicando..."
                : confirm === "ship"
                  ? "Enviar"
                  : confirm === "receive"
                    ? "Recibir"
                    : "Cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
