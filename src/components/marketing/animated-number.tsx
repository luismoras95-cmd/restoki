"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  /** Valor final, p. ej. "3", "100+". Sufijos no numéricos se conservan. */
  value: string
  /** Desactiva la animación y muestra el valor tal cual (p. ej. años). */
  animate?: boolean
  /** Duración del conteo en ms. */
  duration?: number
  className?: string
}

/**
 * Cuenta de 0 al valor cuando entra al viewport. Renderiza el valor final
 * en SSR (SEO / no-JS) y respeta `prefers-reduced-motion: reduce`.
 */
export function AnimatedNumber({
  value,
  animate = true,
  duration = 1200,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (!animate) return
    const el = ref.current
    if (!el) return

    const match = /^(\d+)(.*)$/.exec(value.trim())
    if (!match) return
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const target = parseInt(match[1], 10)
    const suffix = match[2]
    let frame = 0

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()

        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          // ease-out cubic: arranca rápido y aterriza suave
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(`${Math.round(target * eased)}${suffix}`)
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        setDisplay(`0${suffix}`)
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, animate, duration])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
