"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getSubscriptionAccess, requireOrg } from "@/lib/auth"

async function assertCanWrite(): Promise<void> {
  const access = await getSubscriptionAccess()
  if (!access.canWrite) {
    throw new Error(
      access.reason ??
        "Tu suscripción no permite crear órdenes. Ve a Configuración → Billing."
    )
  }
}

const HeaderSchema = z.object({
  location_id: z.string().uuid("Selecciona una sucursal"),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

const ItemSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto"),
  quantity: z.number().positive("Cantidad debe ser positiva"),
  unit_cost: z.number().min(0, "Costo no puede ser negativo"),
})

export type POActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

function num(v: FormDataEntryValue | null): number {
  if (v === null || v === "") return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function createDraftPO(formData: FormData) {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear órdenes de compra.")
  }
  await assertCanWrite()

  const parsed = HeaderSchema.safeParse({
    location_id: formData.get("location_id"),
    supplier_id: formData.get("supplier_id") ?? "",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: org.id,
      location_id: parsed.data.location_id,
      supplier_id: parsed.data.supplier_id || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Error creando orden")

  revalidatePath("/compras")
  redirect(`/compras/${data.id}`)
}

export async function updatePOHeader(
  id: string,
  _prev: POActionState,
  formData: FormData
): Promise<POActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = HeaderSchema.safeParse({
    location_id: formData.get("location_id"),
    supplier_id: formData.get("supplier_id") ?? "",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      location_id: parsed.data.location_id,
      supplier_id: parsed.data.supplier_id || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id)
    .eq("status", "draft")

  if (error) return { status: "error", message: error.message }

  revalidatePath(`/compras/${id}`)
  return { status: "success", message: "Cambios guardados." }
}

export async function addPOItem(
  poId: string,
  _prev: POActionState,
  formData: FormData
): Promise<POActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = ItemSchema.safeParse({
    product_id: formData.get("product_id"),
    quantity: num(formData.get("quantity")),
    unit_cost: num(formData.get("unit_cost")),
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()

  // Validar que la PO sea draft y pertenezca a la org
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, status, organization_id")
    .eq("id", poId)
    .eq("organization_id", org.id)
    .single()

  if (!po) return { status: "error", message: "Orden no encontrada." }
  if (po.status !== "draft") {
    return { status: "error", message: "Solo se editan borradores." }
  }

  const { error } = await supabase.from("purchase_order_items").insert({
    purchase_order_id: poId,
    product_id: parsed.data.product_id,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unit_cost,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath(`/compras/${poId}`)
  return { status: "success", message: "Línea agregada." }
}

export async function removePOItem(poId: string, itemId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso.")
  }

  const supabase = await createClient()

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", poId)
    .eq("organization_id", org.id)
    .single()

  if (!po) throw new Error("Orden no encontrada.")
  if (po.status !== "draft") throw new Error("Solo se editan borradores.")

  const { error } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("id", itemId)
    .eq("purchase_order_id", poId)

  if (error) throw new Error(error.message)

  revalidatePath(`/compras/${poId}`)
}

export async function markPOSent(poId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("id")
    .eq("purchase_order_id", poId)
    .limit(1)

  if (!items || items.length === 0) {
    throw new Error("Agrega al menos una línea antes de enviar.")
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", poId)
    .eq("organization_id", org.id)
    .eq("status", "draft")

  if (error) throw new Error(error.message)

  revalidatePath(`/compras/${poId}`)
  revalidatePath("/compras")
}

export async function receivePO(poId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")
  await assertCanWrite()

  const supabase = await createClient()
  const { error } = await supabase.rpc("receive_purchase_order", {
    p_po_id: poId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/compras/${poId}`)
  revalidatePath("/compras")
  revalidatePath("/inventario")
  revalidatePath("/dashboard")

  // Verifica org context para evitar typescript unused warning
  void org
}

export async function cancelPO(poId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_purchase_order", {
    p_po_id: poId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/compras/${poId}`)
  revalidatePath("/compras")
  void org
}

const TicketLineSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto para cada línea"),
  quantity: z.number().positive("La cantidad debe ser positiva"),
  unit_cost: z.number().min(0, "El costo no puede ser negativo"),
})

const CreateFromTicketSchema = z.object({
  location_id: z.string().uuid("Selecciona una sucursal"),
  supplier_id: z.string().uuid().nullable(),
  notes: z.string().max(500).nullable(),
  items: z.array(TicketLineSchema).min(1, "Agrega al menos una línea"),
})

export type CreateFromTicketInput = z.infer<typeof CreateFromTicketSchema>

export async function createPOFromTicket(input: CreateFromTicketInput) {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear órdenes de compra.")
  }
  await assertCanWrite()

  const parsed = CreateFromTicketSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const supabase = await createClient()

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: org.id,
      location_id: parsed.data.location_id,
      supplier_id: parsed.data.supplier_id,
      notes: parsed.data.notes,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (poErr || !po) {
    throw new Error(poErr?.message ?? "No se pudo crear la orden")
  }

  const lines = parsed.data.items.map((it) => ({
    purchase_order_id: po.id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_cost: it.unit_cost,
  }))

  const { error: itemsErr } = await supabase
    .from("purchase_order_items")
    .insert(lines)

  if (itemsErr) {
    await supabase.from("purchase_orders").delete().eq("id", po.id)
    throw new Error(itemsErr.message)
  }

  revalidatePath("/compras")
  redirect(`/compras/${po.id}`)
}
