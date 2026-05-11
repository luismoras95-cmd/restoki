"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { addCategories, type ActionState } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const INITIAL_STATE: ActionState = { status: "idle" }

const PRESETS = [
  "Lácteos",
  "Carnes y aves",
  "Vegetales y frutas",
  "Abarrotes",
  "Bebidas",
  "Empaque y desechables",
  "Limpieza",
  "Panadería",
]

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Guardando..." : "Continuar"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}

export function CategoriesStep() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(PRESETS.slice(0, 5))
  )
  const [custom, setCustom] = useState<string[]>([])
  const [state, formAction] = useActionState(addCategories, INITIAL_STATE)

  useEffect(() => {
    if (state.status === "error") toast.error(state.message)
  }, [state])

  function togglePreset(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function setCustomAt(idx: number, value: string) {
    setCustom((prev) => prev.map((c, i) => (i === idx ? value : c)))
  }

  function addCustom() {
    setCustom((prev) => [...prev, ""])
  }

  function removeCustom(idx: number) {
    setCustom((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Selecciona las que usas</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((name) => {
            const isOn = selected.has(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => togglePreset(name)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  isOn
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={isOn}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Inputs ocultos para mandar las preset seleccionadas */}
      {Array.from(selected).map((name) => (
        <input key={name} type="hidden" name="name" value={name} />
      ))}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Agrega categorías propias</p>
        {custom.length === 0 && (
          <p className="text-xs text-muted-foreground">
            ¿Te falta alguna? Agrégala aquí.
          </p>
        )}
        {custom.map((value, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              name="name"
              maxLength={80}
              placeholder="Ej. Café especial"
              value={value}
              onChange={(e) => setCustomAt(idx, e.target.value)}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCustom(idx)}
              aria-label="Quitar categoría"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustom}
          className="self-start"
        >
          <Plus className="size-4" />
          Agregar categoría
        </Button>
      </div>

      <Submit />
    </form>
  )
}
