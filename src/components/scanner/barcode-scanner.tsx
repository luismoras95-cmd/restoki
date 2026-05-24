"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff } from "lucide-react"

// Type mínimo para BarcodeDetector (TS lib no lo incluye)
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

// Estados de soporte:
//  "native" → usa BarcodeDetector (rápido, Chrome Android)
//  "zxing"  → fallback JS (Safari/iOS y otros)
//  "none"   → no hay cámara disponible
type Engine = "native" | "zxing" | "none" | null

export function BarcodeScanner({ onDetected, active }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<BarcodeDetectorCtor> | null>(null)
  const rafRef = useRef<number | null>(null)
  // Controls para ZXing (BrowserMultiFormatReader.decodeFromVideoDevice)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)
  const lastDetectionRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  })

  const [engine, setEngine] = useState<Engine>(null)
  const [error, setError] = useState<string | null>(null)

  // Decide el motor a usar al montar
  useEffect(() => {
    if (typeof window === "undefined") return
    const hasCamera =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    if (!hasCamera) {
      setEngine("none")
      return
    }
    setEngine("BarcodeDetector" in window ? "native" : "zxing")
  }, [])

  function emit(code: string) {
    const now = Date.now()
    if (
      code !== lastDetectionRef.current.code ||
      now - lastDetectionRef.current.at > 1500
    ) {
      lastDetectionRef.current = { code, at: now }
      onDetected(code)
    }
  }

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop()
      } catch {}
      zxingControlsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const detectLoopNative = useCallback(async () => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoopNative)
      return
    }
    try {
      const results = await detector.detect(video)
      if (results.length > 0) emit(results[0].rawValue)
    } catch {
      // ignora errores transitorios
    }
    rafRef.current = requestAnimationFrame(detectLoopNative)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!active || engine === null || engine === "none") {
      stop()
      return
    }

    let cancelled = false
    setError(null)

    ;(async () => {
      try {
        if (engine === "native") {
          const Ctor = window.BarcodeDetector
          if (!Ctor) {
            setEngine("zxing")
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
            rafRef.current = requestAnimationFrame(detectLoopNative)
          }
        } else if (engine === "zxing") {
          // Carga ZXing dinámicamente (no infla el bundle principal)
          const { BrowserMultiFormatReader } = await import("@zxing/browser")
          const reader = new BrowserMultiFormatReader()
          if (cancelled || !videoRef.current) return
          // decodeFromVideoDevice maneja la cámara + el loop de decodificación.
          // undefined deviceId = cámara trasera por default en móvil.
          const controls = await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (result) emit(result.getText())
            }
          )
          if (cancelled) {
            controls.stop()
            return
          }
          zxingControlsRef.current = controls
        }
      } catch (e) {
        if (cancelled) return
        const msg =
          e instanceof Error ? e.message : "No se pudo acceder a la cámara"
        // Si es problema de permisos, mensaje más claro
        if (
          msg.toLowerCase().includes("permission") ||
          msg.toLowerCase().includes("denied") ||
          msg.toLowerCase().includes("notallowed")
        ) {
          setError(
            "Permiso de cámara denegado. Habilítalo en los ajustes del navegador."
          )
        } else {
          setError(msg)
        }
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [active, engine, detectLoopNative, stop])

  if (engine === "none") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <CameraOff className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No detectamos una cámara disponible. Usa la entrada manual o un lector
          USB.
        </p>
      </div>
    )
  }

  if (engine === null) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Detectando cámara…
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-black aspect-[4/3] sm:aspect-video">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
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
