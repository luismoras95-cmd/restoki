"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const HeaderSchema = z.object({
  from_location_id: z.string().uuid("Selecciona la sucursal origen"),
  to_location_id: z.string().uuid("Selecciona la sucursal destino"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

const ItemSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto"),
  quantity: z.number().positive("Cantidad debe ser positiva"),
})

export type TransferActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

function num(v: FormDataEntryValue | null): number {
  if (v === null || v === "") return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function createDraftTransfer(formData: FormData) {
  const { org, user } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    throw new Error("Sin permiso para crear transferencias.")
  }

  const parsed = HeaderSchema.safeParse({
    from_location_id: formData.get("from_location_id"),
    to_location_id: formData.get("to_location_id"),
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  if (parsed.data.from_location_id === parsed.data.to_location_id) {
    throw new Error("Origen y destino no pueden ser la misma sucursal.")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      organization_id: org.id,
      from_location_id: parsed.data.from_location_id,
      to_location_id: parsed.data.to_location_id,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Error creando transferencia")

  revalidatePath("/transferencias")
  redirect(`/transferencias/${data.id}`)
}

export async function updateTransferHeader(
  id: string,
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = HeaderSchema.safeParse({
    from_location_id: formData.get("from_location_id"),
    to_location_id: formData.get("to_location_id"),
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  if (parsed.data.from_location_id === parsed.data.to_location_id) {
    return {
      status: "error",
      message: "Origen y destino no pueden ser la misma sucursal.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("transfers")
    .update({
      from_location_id: parsed.data.from_location_id,
      to_location_id: parsed.data.to_location_id,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", org.id)
    .eq("status", "draft")

  if (error) return { status: "error", message: error.message }

  revalidatePath(`/transferencias/${id}`)
  return { status: "success", message: "Cambios guardados." }
}

export async function addTransferItem(
  transferId: string,
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = ItemSchema.safeParse({
    product_id: formData.get("product_id"),
    quantity: num(formData.get("quantity")),
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()

  const { data: tr } = await supabase
    .from("transfers")
    .select("status")
    .eq("id", transferId)
    .eq("organization_id", org.id)
    .single()

  if (!tr) return { status: "error", message: "Transferencia no encontrada." }
  if (tr.status !== "draft") {
    return { status: "error", message: "Solo se editan borradores." }
  }

  const { error } = await supabase.from("transfer_items").insert({
    transfer_id: transferId,
    product_id: parsed.data.product_id,
    quantity: parsed.data.quantity,
  })

  if (error) return { status: "error", message: error.message }

  revalidatePath(`/transferencias/${transferId}`)
  return { status: "success", message: "Línea agregada." }
}

export async function removeTransferItem(transferId: string, itemId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()

  const { data: tr } = await supabase
    .from("transfers")
    .select("status")
    .eq("id", transferId)
    .eq("organization_id", org.id)
    .single()

  if (!tr) throw new Error("Transferencia no encontrada.")
  if (tr.status !== "draft") throw new Error("Solo se editan borradores.")

  const { error } = await supabase
    .from("transfer_items")
    .delete()
    .eq("id", itemId)
    .eq("transfer_id", transferId)

  if (error) throw new Error(error.message)

  revalidatePath(`/transferencias/${transferId}`)
}

export async function shipTransfer(transferId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()
  const { error } = await supabase.rpc("ship_transfer", {
    p_transfer_id: transferId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/transferencias/${transferId}`)
  revalidatePath("/transferencias")
  revalidatePath("/inventario")
  revalidatePath("/dashboard")
  void org
}

export async function receiveTransfer(transferId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()
  const { error } = await supabase.rpc("receive_transfer", {
    p_transfer_id: transferId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/transferencias/${transferId}`)
  revalidatePath("/transferencias")
  revalidatePath("/inventario")
  revalidatePath("/dashboard")
  void org
}

export async function cancelTransfer(transferId: string) {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) throw new Error("Sin permiso.")

  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_transfer", {
    p_transfer_id: transferId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/transferencias/${transferId}`)
  revalidatePath("/transferencias")
  void org
}
