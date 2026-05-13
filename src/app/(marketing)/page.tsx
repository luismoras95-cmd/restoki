import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  ChefHat,
  ClipboardCheck,
  Download,
  LineChart,
  Shield,
  Sparkles,
  Truck,
} from "lucide-react"

import { getCurrentUser } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function LandingPage() {
  const user = await getCurrentUser()

  return (
    <>
      <Hero authed={!!user} />
      <Features />
      <CaseStudy />
      <Pricing authed={!!user} />
      <FAQ />
      <FinalCTA authed={!!user} />
    </>
  )
}

// ============================================================
// HERO
// ============================================================
function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(249,115,22,0.12),transparent_70%)]"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:px-6 md:py-28">
        <div className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Hecho por un restaurantero, no por un programador 🇲🇽
        </div>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          El control de inventario para restaurantes con múltiples sucursales.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Costos al día, transferencias entre sucursales y compras a proveedores
          en una sola app. Sin Excel, sin adivinar mermas, sin perder dinero
          entre cocinas.
        </p>
        {authed ? (
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Ir al dashboard
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Empezar prueba gratuita
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#pricing"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Ver precios
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              14 días gratis · Sin tarjeta · Cancela cuando quieras
            </p>
          </>
        )}
      </div>
    </section>
  )
}

// ============================================================
// FEATURES
// ============================================================
const FEATURES = [
  {
    icon: Building2,
    title: "Multi-sucursal de fábrica",
    description:
      "Stock, compras y transferencias por sucursal. No es un add-on caro: viene incluido desde el plan más básico.",
  },
  {
    icon: Boxes,
    title: "Costo promedio ponderado",
    description:
      "Calculado automáticamente al recibir cada compra. Sabes cuánto te cuesta cada platillo en cada cocina.",
  },
  {
    icon: ClipboardCheck,
    title: "Bitácora completa",
    description:
      "Cada movimiento queda registrado con quién, cuándo y por qué. Mermas, ajustes, traspasos: todo trazable.",
  },
  {
    icon: Truck,
    title: "Compras a proveedores",
    description:
      "Crea órdenes en borrador, agrega líneas y recibe. El inventario y el costo se actualizan solos.",
  },
  {
    icon: Download,
    title: "Exporta a Excel",
    description:
      "Descarga inventario, compras, transferencias y movimientos en CSV. Tu contador agradecido.",
  },
  {
    icon: Shield,
    title: "Datos seguros",
    description:
      "Hosting en Vercel y Supabase, backups automáticos, aislamiento por organización con Row-Level Security.",
  },
] as const

function Features() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Todo lo que necesitas para no perder dinero en la cocina
          </h2>
          <p className="mt-3 text-muted-foreground">
            Diseñado desde un restaurante real, con los problemas reales de un
            operador multi-sucursal.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border bg-card p-5"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// CASE STUDY — Pancake Factory
// ============================================================
function CaseStudy() {
  return (
    <section className="border-b bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.2fr] md:px-6">
        <div className="flex flex-col justify-center gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3 text-primary" />
            Cliente cero
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Pancake Factory opera con Restoki desde día uno
          </h2>
          <p className="text-muted-foreground">
            3 sucursales en Hermosillo, Sonora. Cada compra de huevo, cada saco
            de harina, cada traspaso entre cocinas pasa por aquí. Restoki nació
            de los problemas de Pancake Factory, no de un brainstorm de
            agencia.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <Stat value="3" label="sucursales" />
            <Stat value="100+" label="productos" />
            <Stat value="2026" label="operando" />
          </div>
        </div>
        <figure className="flex flex-col justify-center gap-4 rounded-2xl border bg-card p-8 shadow-sm">
          <ChefHat className="size-8 text-primary" />
          <blockquote className="text-lg italic leading-relaxed">
            &ldquo;Lo construí porque ningún software me servía. MarketMan
            cobra el multi-sucursal como add-on. Yo necesitaba saber qué tengo
            en cada cocina, poder hacer traspasos entre sucursales y saber
            cuánto dinero se tiene invertido — en español y en pesos.&rdquo;
          </blockquote>
          <figcaption className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Luis Mora</span> ·
            Socio de Pancake Factory MX · Fundador de Restoki
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

// ============================================================
// PRICING
// ============================================================
const PLANS = [
  {
    id: "founders",
    name: "Founders",
    price: "$19",
    period: "USD/mes lifetime",
    description: "Solo primeros 10 clientes. Te ayudo con el setup gratis.",
    cta: "Solicitar acceso",
    href: "/login",
    badge: "Cupos limitados",
    highlight: false,
    features: [
      "Todas las funciones de Pro",
      "Setup uno a uno conmigo",
      "Precio congelado de por vida",
      "Acceso a roadmap privado",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$39",
    period: "USD/mes",
    description: "Para restaurantes que arrancan con 1-2 sucursales.",
    cta: "Empezar prueba",
    href: "/login",
    badge: null,
    highlight: false,
    features: [
      "Hasta 2 sucursales",
      "3 usuarios",
      "Inventario, compras, transferencias",
      "Exportar a CSV",
      "Soporte por correo",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    period: "USD/mes",
    description: "Para cadenas en crecimiento con 3+ sucursales.",
    cta: "Empezar prueba",
    href: "/login",
    badge: "Más popular",
    highlight: true,
    features: [
      "Sucursales ilimitadas",
      "10 usuarios",
      "Todo lo de Starter",
      "Alertas de stock por WhatsApp (próximamente)",
      "Soporte prioritario",
    ],
  },
] as const

function Pricing({ authed }: { authed: boolean }) {
  return (
    <section id="pricing" className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Precios honestos. Sin sorpresas.
          </h2>
          <p className="mt-3 text-muted-foreground">
            14 días de prueba en cualquier plan. Sin tarjeta de crédito. Si no
            te sirve, cierras tu cuenta y exportas tus datos en CSV.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl border bg-card p-6",
                plan.highlight && "border-primary shadow-lg ring-1 ring-primary/30"
              )}
            >
              {plan.badge && (
                <div
                  className={cn(
                    "absolute -top-3 right-6 rounded-full border bg-background px-3 py-1 text-xs font-medium",
                    plan.highlight
                      ? "border-primary text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {plan.badge}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={authed ? "/dashboard" : plan.href}
                className={buttonVariants({
                  variant: plan.highlight ? "default" : "outline",
                  size: "default",
                  className: "mt-auto",
                })}
              >
                {authed ? "Ir al dashboard" : plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Precios en USD. Cobro mensual con Stripe. Cancela cuando quieras.
        </p>
      </div>
    </section>
  )
}

// ============================================================
// FAQ
// ============================================================
const FAQS = [
  {
    q: "¿Necesito tarjeta para empezar la prueba?",
    a: "No. La prueba de 14 días no pide tarjeta. Si al terminar no te sirve, cierras tu cuenta y exportas tus datos en CSV. Sin compromiso.",
  },
  {
    q: "¿Funciona con Soft Restaurant, Loyverse u otro POS?",
    a: "Por ahora cargas los movimientos manualmente o vía CSV. La integración directa con POS está planeada para 2026 — si tu POS es prioritario, escríbenos y lo subimos en el roadmap.",
  },
  {
    q: "¿Cuántas sucursales y usuarios puedo agregar?",
    a: "Starter incluye 2 sucursales y 3 usuarios. Pro incluye sucursales y usuarios sin límite práctico (hasta 10 por ahora; suficiente para la mayoría de cadenas medianas). Founders tiene los mismos límites que Pro.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Hosteamos en Supabase (Postgres) y Vercel. Backups automáticos diarios, cifrado en tránsito (HTTPS/TLS) y aislamiento por organización con Row-Level Security a nivel base de datos. Ningún cliente puede ver datos de otro.",
  },
  {
    q: "¿Puedo exportar mis datos?",
    a: "Sí. Cualquier sección (inventario, compras, transferencias, movimientos) exporta a CSV en un click, con filtros de fecha. Tus datos son tuyos.",
  },
  {
    q: "¿Hay soporte en español?",
    a: "Todo el sistema, las facturas y el soporte están en español. Restoki está hecho en Hermosillo, México.",
  },
  {
    q: "¿Soportan facturación electrónica (CFDI)?",
    a: "Aún no. Restoki es para el control interno de inventario y costos. Para facturar al cliente final usa tu sistema actual (Soft Restaurant, Aspel, etc.). La integración contable está en backlog.",
  },
  {
    q: "¿Cómo funciona el plan Founders?",
    a: "Es para los primeros 10 clientes que arranquen con Restoki. $19 USD/mes lifetime — ese precio no sube nunca para ti, aunque mañana suba para el resto. Yo personalmente te ayudo a configurar tu primer mes.",
  },
] as const

function FAQ() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-3 text-muted-foreground">
            Si tu duda no está aquí, escríbenos a{" "}
            <a
              href="mailto:hola@restoki.mx"
              className="text-foreground underline-offset-4 hover:underline"
            >
              hola@restoki.mx
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                {item.q}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// FINAL CTA
// ============================================================
function FinalCTA({ authed }: { authed: boolean }) {
  return (
    <section className="border-b bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center md:px-6">
        <LineChart className="size-10 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Empieza hoy. Tu próximo conteo lo haces sin Excel.
        </h2>
        <p className="max-w-xl text-muted-foreground">
          14 días gratis, sin tarjeta. Si en dos semanas no ves valor, te
          ayudamos a exportar tus datos.
        </p>
        {authed ? (
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Ir al dashboard
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Empezar prueba gratuita
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </section>
  )
}
