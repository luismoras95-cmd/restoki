"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff } from "lucide-react"

import { Button } from "@/components/ui/button"

// Definimos un type mínimo para BarcodeDetector porque TS lib no lo incluye
type DetectedBarcode = { rawValue: string }
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (
    source: CanvasImageSource | HTMLVideoElement
  ) => Promise<DetectedBarcode[]>
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor
  }
}

const SUPPORTED_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
]

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  active: boolean
}

export function BarcodeScanner({ onDetected, active }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<BarcodeDetectorCtor> | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDetectionRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  })

  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setSupported("BarcodeDetector" in window)
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const detectLoop = useCallback(async () => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop)
      return
    }
    try {
      const results = await detector.detect(video)
      if (results.length > 0) {
        const code = results[0].rawValue
        const now = Date.now()
        // Anti-rebote: si es el mismo código y han pasado <1.5s, ignora
        if (
          code !== lastDetectionRef.current.code ||
          now - lastDetectionRef.current.at > 1500
        ) {
          lastDetectionRef.current = { code, at: now }
          onDetected(code)
        }
      }
    } catch {
      // ignora errores transitorios del detector
    }
    rafRef.current = requestAnimationFrame(detectLoop)
  }, [onDetected])

  useEffect(() => {
    if (!active) {
      stop()
      return
    }
    if (!supported) return

    let cancelled = false
    setError(null)

    ;(async () => {
      try {
        const Ctor = window.BarcodeDetector
        if (!Ctor) {
          setSupported(false)
          return
        }
        detectorRef.current = new Ctor({ formats: SUPPORTED_FORMATS })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          rafRef.current = requestAnimationFrame(detectLoop)
        }
      } catch (e) {
        if (cancelled) return
        const msg =
          e instanceof Error
            ? e.message
            : "No se pudo acceder a la cámara"
        setError(msg)
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [active, supported, detectLoop, stop])

  if (supported === false) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <CameraOff className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Tu navegador no soporta escaneo con cámara. Usa la entrada manual o
          un lector USB.
        </p>
      </div>
    )
  }

  if (supported === null) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Detectando soporte de cámara…
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-black aspect-[4/3] sm:aspect-video">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-1/2 w-3/4 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
      </div>
      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-3 py-2 text-center text-xs text-destructive-foreground">
          {error}
        </div>
      )}
      {!error && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-black/40 px-3 py-2 text-center text-xs text-white">
          <Camera className="size-3.5" />
          Apunta al código y manténlo dentro del recuadro
        </div>
      )}
    </div>
  )
}
