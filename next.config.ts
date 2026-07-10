import type { NextConfig } from "next"

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co"

// Cabeceras de seguridad para todas las rutas.
// - X-Frame-Options: evita clickjacking (que otro sitio meta restoki.mx en un
//   iframe); no afecta al webview de Capacitor, que no es un iframe.
// - nosniff: el navegador no "adivina" tipos de contenido.
// - Referrer-Policy: no filtra URLs internas completas a sitios externos.
// - Permissions-Policy: cámara solo para la propia app (escáner/tickets);
//   micrófono y ubicación bloqueados (no se usan).
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOSTNAME,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
