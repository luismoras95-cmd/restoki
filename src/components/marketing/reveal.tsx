"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

type RevealDirection = "up" | "left" | "right" | "none"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Retraso de la transición en ms (para efectos escalonados). */
  delay?: number
  /** Dirección desde la que entra el elemento. */
  direction?: RevealDirection
  /** Etiqueta HTML a renderizar. */
  as?: "div" | "figure" | "span"
}

/**
 * Revela su contenido con fade + desplazamiento sutil cuando entra al
 * viewport (IntersectionObserver). Los estilos viven en globals.css bajo
 * `prefers-reduced-motion: no-preference`, así que con motion reducido el
 * contenido se muestra sin animación.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as ElementType
  const style: CSSProperties | undefined =
    delay > 0 ? { transitionDelay: `${delay}ms` } : undefined

  return (
    <Tag
      ref={ref}
      style={style}
      className={cn(
        "reveal",
        direction !== "none" && `reveal-${direction}`,
        visible && "is-visible",
        className
      )}
    >
      {children}
    </Tag>
  )
}
