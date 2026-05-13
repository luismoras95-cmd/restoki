"use server"

import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import { requireOrg } from "@/lib/auth"

const EDITOR_ROLES = new Set(["owner", "admin", "manager"])

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]) as Set<string>

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

const TicketItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().nullable(),
  unit_cost: z.number().min(0).nullable(),
})

const TicketSchema = z.object({
  supplier_name: z.string().nullable(),
  date: z.string().nullable(),
  items: z.array(TicketItemSchema),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
  notes: z.string().nullable(),
})

export type TicketItem = z.infer<typeof TicketItemSchema>
export type ParsedTicket = z.infer<typeof TicketSchema>

export type ParseTicketResult =
  | { status: "ok"; data: ParsedTicket }
  | { status: "error"; message: string }

const SYSTEM_PROMPT = `Eres un asistente experto en lectura de tickets, remisiones y facturas de proveedores de restaurantes en México. Tu trabajo es extraer información estructurada y exacta a partir de la foto que el usuario sube.

Reglas:
- Devuelve los items tal como aparecen en el documento. No inventes productos.
- Si un campo no es visible o no estás seguro, devuelve null en lugar de adivinar.
- Cantidades y costos son números planos (sin "$", "MXN" ni comas como separador de miles). Si el ticket muestra "2,500.00" devuelve 2500.
- Si el ticket muestra "2.5 kg" → quantity=2.5, unit="kg".
- Unidades válidas y normalizadas: kg, g, l, ml, pza, caja, bolsa, paquete, lt, pieza, docena, charola, kilo, gramo, litro.
- Cuando el ticket no especifica unidad, asume "pza".
- Fechas en formato ISO 8601 (YYYY-MM-DD). Si solo ves día/mes, infiere el año por contexto del año actual (si no, deja null).
- supplier_name es el nombre del proveedor o distribuidor que vendió la mercancía, NO el del comprador/restaurante.
- subtotal, tax (IVA) y total deben coincidir con lo impreso. Si solo aparece el total general, los otros van en null.
- unit_cost es el precio unitario antes de impuestos cuando el documento lo distinga; si solo aparece el importe por línea, calcúlalo como importe/quantity.
- notes: cualquier dato útil que no encaje en los campos (número de remisión, condiciones, fecha de entrega, etc.). Máximo 200 caracteres.

Devuelve la información USANDO ÚNICAMENTE la herramienta "extract_ticket". No agregues texto fuera de la herramienta.`

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    supplier_name: {
      type: ["string", "null"],
      description: "Nombre del proveedor que emite el ticket",
    },
    date: {
      type: ["string", "null"],
      description: "Fecha del documento en formato ISO YYYY-MM-DD",
    },
    items: {
      type: "array",
      description: "Productos comprados, en el orden que aparecen",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del producto tal como aparece" },
          quantity: { type: "number", description: "Cantidad numérica" },
          unit: {
            type: ["string", "null"],
            description: "Unidad de medida (kg, l, pza, etc.) o null si no aparece",
          },
          unit_cost: {
            type: ["number", "null"],
            description: "Precio por unidad en pesos mexicanos, o null si no se puede determinar",
          },
        },
        required: ["name", "quantity", "unit", "unit_cost"],
        additionalProperties: false,
      },
    },
    subtotal: { type: ["number", "null"] },
    tax: { type: ["number", "null"], description: "IVA total" },
    total: { type: ["number", "null"], description: "Total final del ticket" },
    notes: {
      type: ["string", "null"],
      description: "Notas adicionales útiles (número de folio, condiciones, etc.)",
    },
  },
  required: ["supplier_name", "date", "items", "subtotal", "tax", "total", "notes"],
  additionalProperties: false,
}

export async function parseTicketImage(
  formData: FormData
): Promise<ParseTicketResult> {
  const { org } = await requireOrg()
  if (!EDITOR_ROLES.has(org.role)) {
    return { status: "error", message: "Sin permiso para subir tickets." }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "error",
      message:
        "Falta ANTHROPIC_API_KEY en variables de entorno. Pídeselo al administrador.",
    }
  }

  const file = formData.get("image")
  if (!(file instanceof File)) {
    return { status: "error", message: "No se recibió la imagen." }
  }
  if (file.size === 0) {
    return { status: "error", message: "La imagen está vacía." }
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: `La imagen pesa más de 8 MB. Compromete o reduce su tamaño.`,
    }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      status: "error",
      message:
        "Formato no soportado. Sube JPG, PNG, WEBP o GIF.",
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          name: "extract_ticket",
          description:
            "Registra los datos estructurados del ticket de proveedor.",
          input_schema: INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "extract_ticket" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extrae los datos de este ticket de proveedor y registra el resultado con la herramienta extract_ticket.",
            },
          ],
        },
      ],
    })

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === "extract_ticket"
    )

    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        status: "error",
        message: "El modelo no devolvió datos estructurados. Intenta con otra foto.",
      }
    }

    const parsed = TicketSchema.safeParse(toolUse.input)
    if (!parsed.success) {
      return {
        status: "error",
        message: `Datos del ticket inválidos: ${parsed.error.issues[0]?.message ?? "schema"}`,
      }
    }

    return { status: "ok", data: parsed.data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    return { status: "error", message: `IA falló: ${msg}` }
  }
}
