import { notFound } from "next/navigation"

import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PrintPOView } from "@/components/purchase-orders/print-po-view"

export const metadata = {
  title: "Orden de compra · Imprimir",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ImprimirPO({ params }: PageProps) {
  const { org } = await requireOrg()
  const { id } = await params
  const supabase = await createClient()

  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "*, location:locations(id, name, address), supplier:suppliers(id, name, contact_name, phone, email)"
      )
      .eq("id", id)
      .eq("organization_id", org.id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*, product:products(id, name, sku, base_unit)")
      .eq("purchase_order_id", id)
      .order("id", { ascending: true }),
  ])

  if (poRes.error || !poRes.data) notFound()

  return (
    <PrintPOView
      org={{
        name: org.name,
        rfc: org.rfc,
        address: org.address,
      }}
      po={poRes.data}
      items={itemsRes.data ?? []}
    />
  )
}
