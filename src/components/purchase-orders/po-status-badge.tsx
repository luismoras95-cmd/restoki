import { Badge } from "@/components/ui/badge"
import type { Enums } from "@/types/db"

const STATUS_LABELS: Record<Enums<"po_status">, string> = {
  draft: "Borrador",
  sent: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
}

const STATUS_VARIANTS: Record<
  Enums<"po_status">,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "secondary",
  received: "default",
  cancelled: "destructive",
}

export function POStatusBadge({ status }: { status: Enums<"po_status"> }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  )
}
