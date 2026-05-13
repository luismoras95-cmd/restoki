import { Badge } from "@/components/ui/badge"
import type { Enums } from "@/types/db"

const LABELS: Record<Enums<"transfer_status">, string> = {
  draft: "Borrador",
  in_transit: "En tránsito",
  received: "Recibida",
  cancelled: "Cancelada",
}

const VARIANTS: Record<
  Enums<"transfer_status">,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  in_transit: "secondary",
  received: "default",
  cancelled: "destructive",
}

export function TransferStatusBadge({
  status,
}: {
  status: Enums<"transfer_status">
}) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>
}
