import type { NextConfig } from "next"

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co"

// CSP en modo "report-only": NO bloquea nada todavía, solo registra en la
// consola del navegador qué se saldría de la política. Permite afinarla sin
// riesgo de romper la app; una vez validada, se cambia la llave a
// "Content-Security-Policy" (sin -Report-Only) para que empiece a bloquear.
// Orígenes permitidos: la propia app, Supabase (API + realtime + storage) y
// Stripe (checkout.js). 'unsafe-inline' es necesario por los estilos/scripts
// que inyecta Next.js.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

// Cabeceras de seguridad para todas las rutas.
// - Strict-Transport-Security (HSTS): obliga a usar HTTPS siempre (2 años),
//   evita ataques de "SSL stripping" en redes hostiles. Solo surte efecto
//   sobre HTTPS (Vercel), los navegadores lo ignoran sobre HTTP.
// - X-Frame-Options: evita clickjacking (que otro sitio meta restoki.mx en un
//   iframe); no afecta al webview de Capacitor, que no es un iframe.
// - nosniff: el navegador no "adivina" tipos de contenido.
// - Referrer-Policy: no filtra URLs internas completas a sitios externos.
// - Permissions-Policy: cámara solo para la propia app (escáner/tickets);
//   micrófono y ubicación bloqueados (no se usan).
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
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
