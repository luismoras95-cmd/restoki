"use client"

import { Capacitor } from "@capacitor/core"

/**
 * Detecta si la app está corriendo dentro del shell nativo de Capacitor
 * (iOS o Android) vs el navegador web.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  return Capacitor.isNativePlatform()
}

/**
 * Plataforma actual: 'ios' | 'android' | 'web'
 */
export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web"
  const p = Capacitor.getPlatform()
  if (p === "ios") return "ios"
  if (p === "android") return "android"
  return "web"
}

/**
 * Toma una foto usando la cámara nativa (Capacitor Camera plugin) y
 * devuelve un File listo para subir vía FormData (mismo path que el
 * <input type="file"> del navegador).
 *
 * En web puro, devuelve null y el caller debe usar input.click().
 */
export async function takeNativePhoto(): Promise<File | null> {
  if (!isNativeApp()) return null

  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  )

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt, // pregunta cámara vs galería
    promptLabelHeader: "Foto del ticket",
    promptLabelPhoto: "Galería",
    promptLabelPicture: "Tomar foto",
    correctOrientation: true,
    saveToGallery: false,
    width: 2000, // limitar resolución máxima
  })

  if (!photo.base64String) return null

  const mime = `image/${photo.format}` // 'image/jpeg' | 'image/png' | etc
  const blob = base64ToBlob(photo.base64String, mime)
  const filename = `ticket-${Date.now()}.${photo.format}`
  return new File([blob], filename, { type: mime })
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime })
}
