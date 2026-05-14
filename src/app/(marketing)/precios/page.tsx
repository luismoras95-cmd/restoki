import { getCurrentUser } from "@/lib/auth"
import { PricingTable } from "@/components/pricing-table"

export const metadata = {
  title: "Precios",
  description:
    "Planes de Restoki: Solo $499/mes, Cadena $899/mes con IA, Enterprise $1,799/mes. 14 días gratis, sin tarjeta.",
}

export default async function PreciosPage() {
  const user = await getCurrentUser()

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Precios simples, sin sorpresas
        </h1>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          14 días gratis para probarlo. Si no te sirve, cancelas y no te
          cobramos un peso. Todos los precios incluyen IVA.
        </p>
      </div>
      <PricingTable authed={!!user} />
    </div>
  )
}
