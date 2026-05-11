import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Organización" },
  { id: 2, label: "Sucursales" },
  { id: 3, label: "Categorías" },
  { id: 4, label: "Listo" },
]

interface OnboardingProgressProps {
  current: number
}

export function OnboardingProgress({ current }: OnboardingProgressProps) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((step, idx) => {
        const isDone = step.id < current
        const isActive = step.id === current

        return (
          <li
            key={step.id}
            className="flex flex-1 items-center gap-2"
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                isDone && "bg-primary text-primary-foreground",
                isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                !isDone && !isActive && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="size-3.5" /> : step.id}
            </div>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "ml-1 h-px flex-1",
                  step.id < current ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
