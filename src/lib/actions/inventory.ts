"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { requireOrg } from "@/lib/auth"

const AdjustmentSchema = z.object({
  location_id: z.string().uuid("Selecciona una sucursal"),
  product_id: z.string().uuid("Selecciona un producto"),
  delta: z.number().refine((n) => Number.isFinite(n) && n !== 0, {
    message: "El delta no puede ser cero",
  }),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
})

const WasteSchema = z.object({
  location_id: z.string().uuid("Selecciona una sucursal"),
  product_id: z.string().uuid("Selecciona un producto"),
  quantity: z.number().positive("La cantidad debe ser positiva"),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
})

export type MovementActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const OPERATOR_ROLES = new Set(["owner", "admin", "manager", "staff"])

function num(v: FormDataEntryValue | null): number {
  if (v === null || v === "") return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function applyAdjustment(
  _prev: MovementActionState,
  formData: FormData
): Promise<MovementActionState> {
  const { org } = await requireOrg()
  if (!OPERATOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = AdjustmentSchema.safeParse({
    location_id: formData.get("location_id"),
    product_id: formData.get("product_id"),
    delta: num(formData.get("delta")),
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc(
    "apply_inventory_movement",
    {
      p_location_id: parsed.data.location_id,
      p_product_id: parsed.data.product_id,
      p_type: "adjustment",
      p_quantity: parsed.data.delta,
      p_notes: parsed.data.notes || undefined,
    }
  )

  if (error) return { status: "error", message: error.message }

  revalidatePath("/inventario")
  return { status: "success", message: "Ajuste aplicado." }
}

export async function applyWaste(
  _prev: MovementActionState,
  formData: FormData
): Promise<MovementActionState> {
  const { org } = await requireOrg()
  if (!OPERATOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso." }
  }

  const parsed = WasteSchema.safeParse({
    location_id: formData.get("location_id"),
    product_id: formData.get("product_id"),
    quantity: num(formData.get("quantity")),
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc(
    "apply_inventory_movement",
    {
      p_location_id: parsed.data.location_id,
      p_product_id: parsed.data.product_id,
      p_type: "waste",
      p_quantity: -parsed.data.quantity, // merma siempre sale (signo negativo)
      p_notes: parsed.data.notes || undefined,
    }
  )

  if (error) return { status: "error", message: error.message }

  revalidatePath("/inventario")
  return { status: "success", message: "Merma registrada." }
}
