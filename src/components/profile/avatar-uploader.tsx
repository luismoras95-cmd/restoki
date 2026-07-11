"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { saveAvatarUrl } from "@/lib/actions/profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const MAX_MB = 5

interface AvatarUploaderProps {
  userId: string
  initialUrl: string | null
  fallback: string
}

export function AvatarUploader({
  userId,
  initialUrl,
  fallback,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // permite volver a elegir el mismo archivo
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Elige una imagen (JPG, PNG…).")
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen debe pesar menos de ${MAX_MB} MB.`)
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      // La carpeta DEBE ser el user.id (lo exige la política del bucket).
      const path = `${userId}/avatar-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw new Error(uploadErr.message)

      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = data.publicUrl

      const res = await saveAvatarUrl(publicUrl)
      if (!res.ok) throw new Error(res.error ?? "No se pudo guardar la foto.")

      setUrl(publicUrl)
      toast.success("Foto de perfil actualizada.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al subir la foto."
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {url ? <AvatarImage src={url} alt="Foto de perfil" /> : null}
        <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {uploading ? "Subiendo..." : "Cambiar foto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG o PNG, máximo {MAX_MB} MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
