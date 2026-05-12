"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { createCategory, deleteCategory } from "@/lib/actions/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Tables } from "@/types/db"

interface CategoryManagerProps {
  categories: Pick<Tables<"categories">, "id" | "name">[]
  triggerLabel?: string
}

export function CategoryManager({
  categories,
  triggerLabel = "Gestionar",
}: CategoryManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        await createCategory(newName.trim())
        setNewName("")
        router.refresh()
        toast.success("Categoría creada.")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Borrar la categoría "${name}"?`)) return
    startTransition(async () => {
      try {
        await deleteCategory(id)
        router.refresh()
        toast.success("Categoría eliminada.")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error desconocido")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorías</DialogTitle>
          <DialogDescription>
            Agrupa productos por tipo. Las puedes editar después.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={pending}
            />
            <Button
              type="button"
              size="icon"
              aria-label="Agregar"
              onClick={handleAdd}
              disabled={pending || !newName.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-1 max-h-72 overflow-auto">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aún no hay categorías. Agrega la primera arriba.
              </p>
            )}
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{c.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Borrar ${c.name}`}
                  onClick={() => handleDelete(c.id, c.name)}
                  disabled={pending}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
