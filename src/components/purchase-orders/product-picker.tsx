"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})

export type PickerProduct = {
  id: string
  name: string
  base_unit: string
  default_cost?: number | null
}

type Item = { value: string; label: string }

interface ProductPickerProps {
  products: PickerProduct[]
  value: string
  onValueChange: (productId: string) => void
  id?: string
  placeholder?: string
}

export function ProductPicker({
  products,
  value,
  onValueChange,
  id,
  placeholder = "Buscar producto...",
}: ProductPickerProps) {
  const items: Item[] = products.map((p) => ({
    value: p.id,
    label: p.name,
  }))
  const byId = new Map(products.map((p) => [p.id, p]))
  const selected = value ? (byId.get(value) ?? null) : null

  return (
    <Combobox.Root
      items={items}
      value={selected ? { value: selected.id, label: selected.name } : null}
      onValueChange={(item: Item | null) => {
        onValueChange(item?.value ?? "")
      }}
      // Compara por id (los valores son objetos)
      isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent pr-8 pl-8 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30"
          )}
        />
        <Combobox.Trigger
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
          aria-label="Abrir lista"
        >
          <ChevronsUpDown className="size-4" />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup
            className={cn(
              "z-50 max-h-72 w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
            )}
          >
            <Combobox.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
              Sin coincidencias.
            </Combobox.Empty>
            <Combobox.List>
              {(item: Item) => {
                const p = byId.get(item.value)
                return (
                  <Combobox.Item
                    key={item.value}
                    value={item}
                    className={cn(
                      "relative flex cursor-default items-center justify-between gap-2 rounded-md py-1.5 pr-2 pl-7 text-sm select-none",
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    )}
                  >
                    <Combobox.ItemIndicator className="absolute left-1.5 flex items-center">
                      <Check className="size-4" />
                    </Combobox.ItemIndicator>
                    <span className="truncate">
                      {p?.name}
                      {p?.base_unit && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({p.base_unit})
                        </span>
                      )}
                    </span>
                    {p?.default_cost != null && (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {currency.format(Number(p.default_cost))}
                      </span>
                    )}
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
