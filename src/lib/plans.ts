// ============================================================
// Planes de Restoki — single source of truth para precios y límites.
// Cuando cambien precios, actualiza aquí Y en Stripe.
// ============================================================

export type PlanCode = "solo" | "cadena" | "enterprise"
export type BillingCycle = "monthly" | "annual"

export interface Plan {
  code: PlanCode
  name: string
  tagline: string
  monthly: number // MXN, IVA incluido
  annual: number // MXN/año, IVA incluido (con 10% descuento)
  perks: string[]
  limits: {
    locations: number | null // null = ilimitadas
    users: number | null
  }
  popular?: boolean
  ai: boolean
}

// 10% descuento sobre 12 × precio mensual
function annualPrice(monthly: number): number {
  return Math.round(monthly * 12 * 0.9)
}

export const PLANS: readonly Plan[] = [
  {
    code: "solo",
    name: "Solo",
    tagline: "Para una sola sucursal o restaurante.",
    monthly: 499,
    annual: annualPrice(499),
    perks: [
      "1 sucursal",
      "Hasta 3 usuarios",
      "Inventario en tiempo real",
      "Compras + recepciones con CPP",
      "Productos, proveedores, transferencias",
      "Recetas con costeo en vivo",
      "Indicador de salud del inventario",
      "Soporte por email",
    ],
    limits: { locations: 1, users: 3 },
    ai: false,
  },
  {
    code: "cadena",
    name: "Cadena",
    tagline: "Para 2-5 sucursales con un equipo grande.",
    monthly: 899,
    annual: annualPrice(899),
    perks: [
      "Hasta 5 sucursales",
      "Hasta 10 usuarios con permisos por sucursal",
      "Todo lo del plan Solo",
      "🤖 IA: foto del ticket → orden de compra automática",
      "Transferencias entre sucursales",
      "Reportes CSV por rango de fechas",
      "WhatsApp share a proveedores",
      "Soporte prioritario",
    ],
    limits: { locations: 5, users: 10 },
    popular: true,
    ai: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    tagline: "Cadenas grandes con operación multi-ciudad.",
    monthly: 1799,
    annual: annualPrice(1799),
    perks: [
      "Sucursales ilimitadas",
      "Usuarios ilimitados",
      "Todo lo del plan Cadena",
      "Onboarding personalizado",
      "SLA de 4h hábiles",
      "Soporte por WhatsApp directo",
      "Capacitación para tu equipo",
    ],
    limits: { locations: null, users: null },
    ai: true,
  },
] as const

export function planByCode(code: PlanCode): Plan {
  const plan = PLANS.find((p) => p.code === code)
  if (!plan) throw new Error(`Plan ${code} no existe`)
  return plan
}

export const TRIAL_DAYS = 14

export const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
})

export function pricePerMonth(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual" ? Math.round(plan.annual / 12) : plan.monthly
}
