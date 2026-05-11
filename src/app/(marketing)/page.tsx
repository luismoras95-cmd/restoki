import Link from "next/link"
import { ArrowRight, Boxes, Building2, ClipboardCheck } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:px-6 md:py-28">
          <div className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Hecho por un restaurantero, no por un programador
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-5xl">
            El control de inventario para restaurantes con múltiples sucursales.
          </h1>
          <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            Costos al día, transferencias entre sucursales y compras a
            proveedores en una sola app. Sin Excel, sin adivinar mermas, sin
            perder dinero entre cocinas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Empezar prueba gratuita
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Iniciar sesión
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            14 días gratis · Sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3 md:px-6">
          <Feature
            icon={Building2}
            title="Multi-sucursal de fábrica"
            description="Stock, compras y transferencias por sucursal. No es un add-on caro: viene incluido."
          />
          <Feature
            icon={Boxes}
            title="Costo promedio ponderado"
            description="Calculado al recibir cada compra. Sabes cuánto te cuesta cada platillo, en cada cocina."
          />
          <Feature
            icon={ClipboardCheck}
            title="Mermas y ajustes con bitácora"
            description="Cada movimiento queda registrado con quién, cuándo y por qué. Adiós discusiones."
          />
        </div>
      </section>
    </>
  )
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
