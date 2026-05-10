import { Construction } from "lucide-react"

interface UnderConstructionProps {
  title: string
  description?: string
}

export function UnderConstruction({
  title,
  description = "Esta sección estará disponible en una próxima fase.",
}: UnderConstructionProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-muted p-4">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
