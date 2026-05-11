"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { addLocations, type ActionState } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const INITIAL_STATE: ActionState = { status: "idle" }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Guardando..." : "Continuar"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function LocationsStep() {
  const [rows, setRows] = useState<string[]>([""])
  const [state, formAction] = useActionState(addLocations, INITIAL_STATE)

  useEffect(() => {
    if (state.status === "error") toast.error(state.message)
  }, [state])

  function setRow(index: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? value : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, ""])
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {rows.map((value, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              name="name"
              required={idx === 0}
              maxLength={120}
              placeholder={
                idx === 0 ? "Ej. Sucursal Centro" : `Sucursal ${idx + 1}`
              }
              value={value}
              onChange={(e) => setRow(idx, e.target.value)}
              autoFocus={idx === rows.length - 1}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(idx)}
              disabled={rows.length === 1}
              aria-label="Quitar sucursal"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="self-start"
      >
        <Plus className="size-4" />
        Agregar otra sucursal
      </Button>
      <p className="text-xs text-muted-foreground">
        Agrega al menos una. Puedes crear más después en{" "}
        <span className="font-medium">Sucursales</span>.
      </p>
      <Submit />
    </form>
  )
}
