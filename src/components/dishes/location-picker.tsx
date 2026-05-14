"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tables } from "@/types/db"

interface LocationPickerProps {
  locations: Pick<Tables<"locations">, "id" | "name">[]
  selected: string
}

export function LocationPicker({ locations, selected }: LocationPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("location", value)
    router.push(`?${params.toString()}`)
  }

  const selectedName =
    locations.find((l) => l.id === selected)?.name ?? "Selecciona sucursal"

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="location-picker" className="text-xs text-muted-foreground">
        Sucursal:
      </Label>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger
          id="location-picker"
          className="h-8 w-[180px] text-sm"
        >
          <SelectValue>{selectedName}</SelectValue>
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
  )
}
