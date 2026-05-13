"use client"

import { useState } from "react"
import type { Tables } from "@/types/db"

import { TicketUploader } from "./ticket-uploader"
import { TicketReview } from "./ticket-review"
import type { ParsedTicket } from "@/lib/actions/ticket-parser"

type Location = Pick<Tables<"locations">, "id" | "name">
type Supplier = Pick<Tables<"suppliers">, "id" | "name">
type Product = Pick<Tables<"products">, "id" | "name" | "base_unit"> & {
  default_cost?: number | null
}

interface TicketFlowProps {
  locations: Location[]
  suppliers: Supplier[]
  products: Product[]
}

export function TicketFlow({ locations, suppliers, products }: TicketFlowProps) {
  const [parsed, setParsed] = useState<ParsedTicket | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setParsed(null)
    setPreviewUrl(null)
  }

  if (!parsed) {
    return (
      <TicketUploader
        onParsed={(data, url) => {
          setParsed(data)
          setPreviewUrl(url)
        }}
      />
    )
  }

  return (
    <TicketReview
      parsed={parsed}
      previewUrl={previewUrl}
      locations={locations}
      suppliers={suppliers}
      products={products}
      onReset={handleReset}
    />
  )
}
