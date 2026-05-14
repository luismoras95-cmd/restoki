"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Camera, Image as ImageIcon, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  parseTicketImage,
  type ParsedTicket,
} from "@/lib/actions/ticket-parser"
import { isNativeApp, takeNativePhoto } from "@/lib/native"

const MAX_MB = 8

interface TicketUploaderProps {
  onParsed: (data: ParsedTicket, previewUrl: string) => void
}

export function TicketUploader({ onParsed }: TicketUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [isNative, setIsNative] = useState(false)

  // isNativeApp() solo es válido client-side. Lo evaluamos en effect.
  useEffect(() => {
    setIsNative(isNativeApp())
  }, [])

  function handleSelect(selected: File | null) {
    if (!selected) return

    if (selected.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen pesa más de ${MAX_MB} MB.`)
      return
    }
    if (!selected.type.startsWith("image/")) {
      toast.error("Solo imágenes (JPG, PNG, WEBP, GIF).")
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(selected)
    setFile(selected)
    setPreviewUrl(url)
  }

  async function handleNativeCamera() {
    try {
      const photo = await takeNativePhoto()
      if (!photo) return // canceló
      handleSelect(photo)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error con la cámara"
      // El usuario cancelando arroja error en algunos plugins; lo ignoramos
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg)
      }
    }
  }

  function triggerPicker() {
    if (isNative) {
      handleNativeCamera()
    } else {
      inputRef.current?.click()
    }
  }

  function handleSubmit() {
    if (!file || !previewUrl) return

    startTransition(async () => {
      const fd = new FormData()
      fd.set("image", file)
      const result = await parseTicketImage(fd)

      if (result.status === "error") {
        toast.error(result.message)
        return
      }

      if (result.data.items.length === 0) {
        toast.warning(
          "La IA no detectó productos. Revisa la foto y vuelve a intentar."
        )
        return
      }

      onParsed(result.data, previewUrl)
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">1. Sube la foto del ticket</CardTitle>
        <CardDescription>
          Asegúrate de que se vean claramente los nombres, cantidades y costos.
          Toma la foto con buena luz y sin sombras.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Ticket"
                className="max-h-[480px] w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={triggerPicker}
                disabled={pending}
              >
                <Upload className="size-4" />
                Cambiar foto
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Leyendo ticket…
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    Analizar con IA
                  </>
                )}
              </Button>
            </div>
            {pending && (
              <p className="text-xs text-muted-foreground">
                La IA tarda 10-30 segundos. No cierres la página.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={triggerPicker}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/20 px-6 py-12 text-center transition-colors hover:bg-muted/40"
          >
            {isNative ? (
              <Camera className="size-10 text-muted-foreground" />
            ) : (
              <ImageIcon className="size-10 text-muted-foreground" />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {isNative
                  ? "Toma foto o elige de galería"
                  : "Click para tomar o subir una foto"}
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WEBP o GIF · máx {MAX_MB} MB
              </span>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  )
}
