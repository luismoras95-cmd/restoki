"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { createDish } from "@/lib/actions/dishes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tables } from "@/types/db"

interface NewDishButtonProps {
  categories: Pick<Tables<"categories">, "id" | "name">[]
}

export function NewDishButton({ categories }: NewDishButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [salePrice, setSalePrice] = useState<string>("")
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("name", name)
    fd.set("description", description)
    fd.set("category_id", categoryId)
    fd.set("sale_price", salePrice)

    startTransition(async () => {
      try {
        await createDish(fd)
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nuevo platillo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo platillo</DialogTitle>
          <DialogDescription>
            Crea el platillo. Después le agregas los ingredientes para que se
            calcule el costo en vivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dish-name">Nombre *</Label>
            <Input
              id="dish-name"
              required
              maxLength={120}
              placeholder="Ej. Hotcakes clásicos"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dish-category">Categoría</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
            >
              <SelectTrigger id="dish-category" className="w-full">
                <SelectValue>
                  {selectedCategory?.name ?? "— Sin categoría —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Sin categoría —</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dish-price">Precio de venta (MXN)</Label>
            <Input
              id="dish-price"
              type="number"
              step="any"
              min="0"
              placeholder="Ej. 120"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Si lo pones, te calculamos el margen automático.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dish-desc">Descripción</Label>
            <Textarea
              id="dish-desc"
              maxLength={500}
              rows={2}
              placeholder="Notas internas: rendimiento, montaje, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              {pending ? "Creando..." : "Crear platillo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
